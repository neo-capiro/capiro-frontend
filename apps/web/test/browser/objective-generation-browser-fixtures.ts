import type { Page } from "@playwright/test";
import wire from "../../tests/objective-generation-wire-fixtures.json" with { type: "json" };
import planWire from "../../tests/objective-plan-wire-fixtures.json" with { type: "json" };
import {
  governedObjectiveStrategyIntakeRequest,
  type GovernedObjectiveStrategyIntakeRequest,
} from "../../src/shared/capiro/operations/objective-governed-strategy-intake";
import {
  planRequest,
  type PlanRequest,
  type PlanResponse,
} from "../../src/shared/capiro/operations/strategy-materialization";
import {
  installFixtures,
  json,
  objective,
  client,
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
  lostStart?: boolean;
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
  await page.route("**/api/backend/core/me", (r) =>
    json(r, {
      user: { id: "user-test", email: "test@example.test" },
      tenant: { id: "tenant-test", name: "UI tests" },
      role: "user_admin",
    }),
  );
  await page.route(`**/api/backend/core/clients/${clientId}`, (r) =>
    json(r, { ...client, status: "active" }),
  );
  await page.route(`**/api/backend/core/clients/${clientId}/objectives`, (r) =>
    json(r, [{ ...objective, status: "ready", readyAt: objective.updatedAt }]),
  );
  const writes: GovernedObjectiveStrategyIntakeRequest[] = [],
    planWrites: PlanRequest[] = [];
  const starts: { generationJobId: string }[] = [];
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
      writes[0]?.body.selection.generationRequestId ??
      wire.request.body.requestId;
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
  const source = {
    schemaVersion: 1,
    clientId,
    objective: {
      id: objective.id,
      revision: { id: binding.objectiveRevisionId, version: objective.version },
      status: "ready",
    },
    workAction: "objective.strategy.draft",
    requestedSource: {
      revision: { id: binding.objectiveRevisionId, version: objective.version },
      canonicalBindingVersion: 3,
    },
    control: {
      version: 0,
      currentAuthorizationRequestId: null,
      cancelledAt: null,
    },
    consent: null,
    reconciliation: "outcome_unconfirmed",
    accounting: null,
    commandReceipt: null,
    observedAt: "2026-10-24T12:00:00.000Z",
  };
  const intake = (input: unknown) => {
    const request = governedObjectiveStrategyIntakeRequest.parse(input);
    writes.push(request);
    const requestId = request.body.command.requestId;
    return {
      schemaVersion: 2,
      generationJobId: job().jobId,
      selection: request.body.selection,
      commandReceipt: {
        schemaVersion: 1,
        receiptId: "d0000000-0000-4000-8000-000000000001",
        requestId,
        payloadDigest: "a".repeat(64),
        clientId,
        objectiveId: objective.id,
        command: "retry",
        workAction: "objective.strategy.draft",
        commandRevision: source.objective.revision,
        sourceRevision: source.requestedSource.revision,
        rootIntentId: "d0000000-0000-4000-8000-000000000002",
        controlVersionBefore: 0,
        controlVersionAfter: 1,
        targetAuthorizationRequestId: null,
        authorizationRequestId: "d0000000-0000-4000-8000-000000000003",
        consent: {
          id: "d0000000-0000-4000-8000-000000000003",
          confirmedAt: "2026-10-24T12:00:00.000Z",
          expiresAt: "2026-10-24T12:15:00.000Z",
        },
        outcome: "reconsent_recorded",
        committedAt: "2026-10-24T12:00:01.000Z",
      },
    };
  };
  await operationFixtures(page, {
    "me.read": testIdentity,
    "objectives.governedGeneration.read": (input) => ({
      ...source,
      workAction: (input as { query: { workAction: string } }).query.workAction,
    }),
    "objectives.governedStrategy.intake": intake,
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
  await page.route(
    "**/api/capiro/objectives.governedStrategy.intake",
    async (route) => {
      const value = intake(route.request().postDataJSON());
      if (options.lost && writes.length === 1) return route.abort("failed");
      return json(route, value);
    },
  );
  await page.route(
    "**/api/action-followthrough/objective-start",
    async (route) => {
      starts.push(route.request().postDataJSON());
      if (options.lostStart && starts.length === 1)
        return route.abort("failed");
      return route.fulfill({
        status: 202,
        json: { state: "requested", generationJobId: job().jobId },
      });
    },
  );
  return { writes, starts, planWrites, job, plan, unexpected, options };
}
export async function generate(page: Page) {
  await page
    .getByLabel("Strategy type", { exact: true })
    .selectOption("appropriations");
  await page
    .getByRole("button", {
      name: "Request Strategy generation",
      exact: true,
    })
    .click();
}
