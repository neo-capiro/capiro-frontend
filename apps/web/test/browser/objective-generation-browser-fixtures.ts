import type { Page } from "@playwright/test";
import wire from "../../tests/objective-generation-wire-fixtures.json" with { type: "json" };
import planWire from "../../tests/objective-plan-wire-fixtures.json" with { type: "json" };
import {
  objectiveGenerationRequest,
  type ObjectiveGenerationRequest,
} from "../../src/shared/capiro/operations/objective-generation";
import {
  planRequest,
  type PlanRequest,
  type PlanResponse,
} from "../../src/shared/capiro/operations/strategy-materialization";
import {
  installFixtures,
  json,
  objective,
  clientId,
} from "../../tests/browser/fixtures";
import {
  binding,
  boundStrategy,
  strategyId,
} from "../../tests/objective-work-fixtures";
import { operationFixtures, testIdentity } from "./fixtures";
import { bootstrap, nextTask } from "./next-modules-fixtures";
export const origin = `/portfolio/${clientId}/objectives?objective=${objective.id}`;
type Options = {
  lost?: boolean;
  failed?: boolean;
  lostPlan?: boolean;
  noPlanCommit?: boolean;
  partialPlan?: boolean;
  issues?: boolean;
  zeroWork?: boolean;
  holdGeneration?: boolean;
};
export async function fixture(page: Page, options: Options = {}) {
  const unexpected = await installFixtures(page);
  await page.route(`**/api/backend/core/clients/${clientId}/objectives`, (r) =>
    json(r, [{ ...objective, status: "ready", readyAt: objective.updatedAt }]),
  );
  const writes: ObjectiveGenerationRequest[] = [],
    planWrites: PlanRequest[] = [];
  let committed = false;
  const job = () => {
    const value = structuredClone(
      options.failed
        ? wire.incompleteContextPoll.body
        : options.holdGeneration
          ? wire.pendingPoll.body
          : wire.completedPoll.body,
    );
    value.objectiveGeneration.requestId =
      writes[0]?.requestId ?? wire.request.body.requestId;
    value.objectiveGeneration.source = { ...binding };
    if (value.objectiveGeneration.result)
      value.objectiveGeneration.result.strategyId = strategyId;
    value.strategyId = value.objectiveGeneration.result ? strategyId : null;
    return value;
  };
  const plan = () => {
    const value = structuredClone(
      options.partialPlan
        ? planWire.responses.partialUnavailableOutput
        : options.issues
          ? planWire.responses.preparedWithUnsupportedContextDependency
          : options.zeroWork
            ? planWire.responses.preparedContextOnlyZeroTasks
            : planWire.responses.prepared,
    ) as PlanResponse;
    value.requestId = planWrites[0]?.requestId ?? planWire.request.requestId;
    value.source = {
      ...value.source,
      ...binding,
      generationJobId: job().jobId,
      generationRequestId: job().objectiveGeneration.requestId,
      strategyId,
      strategyVersionId:
        wire.completedPoll.body.objectiveGeneration.result.strategyVersionId,
    };
    return value;
  };
  await page.route(
    "**/api/backend/strategy/strategies/objective-drafts",
    async (route) => {
      const body = objectiveGenerationRequest.parse(
        route.request().postDataJSON(),
      );
      writes.push(body);
      if (options.lost && writes.length === 1) return route.abort("failed");
      const value = structuredClone(wire.accepted.body);
      value.objectiveGeneration.requestId = body.requestId;
      value.objectiveGeneration.source = { ...binding };
      return json(route, value);
    },
  );
  await page.route("**/api/backend/strategy/strategies/draft-jobs/*", (r) =>
    json(r, job()),
  );
  await page.route(
    "**/api/backend/strategy/planner/strategy-materializations",
    async (route) => {
      planWrites.push(planRequest.parse(route.request().postDataJSON()));
      if (options.noPlanCommit && planWrites.length === 1)
        return route.abort("failed");
      committed = true;
      if (options.lostPlan && planWrites.length === 1)
        return route.abort("failed");
      return json(route, plan());
    },
  );
  await page.route(
    "**/api/backend/strategy/planner/strategy-materializations/*",
    (route) =>
      committed
        ? json(route, plan())
        : route.fulfill({
            status: 404,
            json: {
              ...planWire.errors[1],
              requestId: planWrites[0]?.requestId ?? null,
            },
          }),
  );
  const projects = () =>
    plan().projects.flatMap((p) =>
      p.output.id
        ? [
            {
              id: p.output.id,
              name: "Current human-edited generated project",
              description: "Synthetic current content",
              color: "#7c6cf2",
              privacy: "private",
              defaultView: "list",
              sections: [],
              fields: [],
              members: [],
              startOn: null,
              dueOn: null,
              health: "on_track",
              clientId,
              ownerId: "test-user",
              version: 4,
              archived: false,
              createdAt: "2026-10-15T12:00:00Z",
              updatedAt: "2026-10-15T12:10:00Z",
              access: "admin",
            },
          ]
        : [],
    );
  await operationFixtures(page, {
    "me.read": testIdentity,
    "strategies.objectiveDraftJob": () => job(),
    "strategies.objectiveDestination": boundStrategy,
    "planner.strategyMaterialization": () => plan(),
    "planner.bootstrap": () => ({ ...bootstrap, projects: projects() }),
    "planner.tasks": () => ({
      items: plan().tasks.flatMap((t) =>
        t.output.id
          ? [
              {
                ...nextTask,
                id: t.output.id,
                name: "Human-edited generated action",
                assigneeId: null,
                clientId,
                memberships: projects().map((p) => ({
                  projectId: p.id,
                  sectionId: null,
                  position: 0,
                })),
              },
            ]
          : [],
      ),
      nextCursor: null,
    }),
  });
  return { writes, planWrites, job, plan, unexpected, options };
}
export async function generate(page: Page) {
  await page
    .getByLabel("Strategy type", { exact: true })
    .selectOption("appropriations");
  await page
    .getByRole("button", {
      name: "Generate Strategy and prepare plan",
      exact: true,
    })
    .click();
}
