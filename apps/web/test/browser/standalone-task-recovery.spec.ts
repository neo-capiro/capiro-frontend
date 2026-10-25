import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  fixture as actionWire,
  context as actionContext,
  canonicalSha256,
} from "../../tests/meri-action-wire-fixtures";
import { onlyLocalRequests } from "./fixtures";
import type {
  ActionExecuteResponse,
  ActionPrepareResponse,
  ActionQueryResponse,
  ActionDraftResponse,
} from "@capiro/meri-contracts/action-application";
import type {
  TaskCommandExecuteResponse,
  TaskCommandPrepareResponse,
} from "@capiro/meri-contracts/task-command-application";

const taskWire = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../tests/fixtures/meri-task-commands/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
type Kind = "create" | "update";
async function setup(page: Page, kind: Kind, refuseOldDraft = false) {
  const ctx = kind === "create" ? actionContext : taskWire("context");
  const now =
    typeof ctx.syntheticNow === "string"
      ? Date.parse(ctx.syntheticNow)
      : ctx.syntheticNow;
  const clientId = ctx.clientId ?? ctx.selectedClientId;
  const wire = kind === "create" ? actionWire : taskWire;
  let actorId = ctx.actorId;
  let currentTime = now,
    generation = 0;
  let currentRun = ctx.runId,
    freshReview = false;
  const currentAction = (operation: "query" | "draft") => {
    const query = actionWire("query").response as ActionQueryResponse;
    query.observation.binding.runId = currentRun;
    query.resultSha256 = canonicalSha256(query.observation);
    if (operation === "query") return query;
    const draft = actionWire("draft").response as ActionDraftResponse;
    draft.source.originalBinding.runId = currentRun;
    draft.source.resultSha256 = query.resultSha256;
    const content = { ...draft };
    Reflect.deleteProperty(content, "draftSha256");
    draft.draftSha256 = canonicalSha256(content);
    return draft;
  };
  const calls: { operation: string; body: Record<string, unknown> }[] = [],
    errors: string[] = [];
  let losePrepare = true,
    loseExecute = true;
  await page.clock.install({ time: now });
  await page.clock.setFixedTime(now);
  await onlyLocalRequests(page);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/backend/core/me", (route) =>
    route.fulfill({
      json: {
        user: { id: actorId, email: null },
        tenant: { id: ctx.tenantId, name: "Synthetic" },
        role: "standard_user",
      },
    }),
  );
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: {
        id: clientId,
        name: "Synthetic client",
        status: "active",
        profileStatus: "active",
      },
    }),
  );
  await page.route(
    /\/api\/(action-followthrough|task-commands)\//,
    async (route) => {
      const operation = new URL(route.request().url()).pathname
        .split("/")
        .pop()!;
      calls.push({ operation, body: route.request().postDataJSON() });
      if (operation === "session") {
        if (Object.hasOwn(route.request().postDataJSON(), "runId"))
          return route.fulfill({
            status: 409,
            json: { error: "Expired exact run is unavailable" },
          });
        const runId =
          generation++ === 0
            ? ctx.runId
            : `00000000-0000-4000-8000-${String(900 + generation).padStart(12, "0")}`;
        currentRun = runId;
        return route.fulfill({
          json: {
            credential: `action_session_${"a".repeat(43)}`,
            expiresAtMs: currentTime + 5_000,
            context: {
              tenantId: ctx.tenantId,
              actorId,
              conversationId: ctx.conversationId,
              runId,
              selectedClientId: clientId,
            },
          },
        });
      }
      if (operation === "prepare" && losePrepare) {
        losePrepare = false;
        return route.abort("failed");
      }
      if (refuseOldDraft && operation === "prepare" && !freshReview)
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: "COMMAND_PREPARATION_REFUSED",
              outcome: "NOT_DISPATCHED",
            },
          },
        });
      if (
        refuseOldDraft &&
        generation > 1 &&
        (operation === "query" || operation === "draft")
      ) {
        freshReview = true;
        return route.fulfill({ json: currentAction(operation) });
      }
      if (operation === "execute" && loseExecute) {
        loseExecute = false;
        return route.abort("failed");
      }
      if (operation === "execute") {
        const original = wire(
          kind === "create" ? "execute-observed" : "observed",
        ).response as ActionExecuteResponse | TaskCommandExecuteResponse;
        if (original.status !== "observed" || !("receipt" in original.outcome))
          throw new Error("Expected historical synthetic receipt");
        const proposal = (
          wire("prepare").response as
            | ActionPrepareResponse
            | TaskCommandPrepareResponse
        ).proposal;
        return route.fulfill({
          json: {
            ...original,
            outcome: {
              execution: {
                kind: "native-task",
                proposalId: proposal.proposalId,
                commandSha256: proposal.commandSha256,
                idempotencyKey: proposal.command.idempotencyKey,
                binding: proposal.command.binding,
                completedAt: original.outcome.receipt.completedAt,
                approvalDecisionSha256: "a".repeat(64),
              },
              result: original.outcome.result,
            },
          },
        });
      }
      const result = wire(operation);
      return route.fulfill({
        status: result.httpStatus,
        json: result.response,
      });
    },
  );
  const connect = async () => {
    await page
      .getByRole("button", {
        name:
          kind === "create"
            ? "Connect action service"
            : "Connect task-update service",
        exact: true,
      })
      .click();
  };
  await page.goto(`/tasks?kind=${kind}&clientId=${clientId}`);
  return {
    calls,
    errors,
    ctx,
    now,
    connect,
    advance: async (time: number) => {
      currentTime = time;
      await page.clock.setFixedTime(time);
    },
    setActor: (value: string) => {
      actorId = value;
    },
  };
}

for (const kind of ["create", "update"] as const)
  test(`${kind} task reload keeps exact preparation and approved execution with no automatic dispatch`, async ({
    page,
  }) => {
    const f = await setup(page, kind);
    await f.connect();
    if (kind === "create") {
      await page
        .getByRole("button", { name: "Find recommendations", exact: true })
        .click();
      await page
        .getByRole("button", { name: /^Select recommendation/ })
        .click();
      await page
        .getByLabel("Task title", { exact: true })
        .fill(actionContext.task.title);
      await page
        .getByRole("button", { name: "Review draft", exact: true })
        .click();
    } else {
      await page
        .getByLabel("Task ID", { exact: true })
        .fill("00000000-0000-4000-8000-000000000021");
      await page.getByLabel("New task title", { exact: true }).fill("Updated");
      await page
        .getByRole("combobox", { name: /^New task status/ })
        .selectOption("todo");
    }
    await page
      .getByRole("button", { name: "Prepare approval proposal", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Outcome uncertain");
    const prepare = f.calls.find((c) => c.operation === "prepare")!.body;
    expect(prepare.requestId).toMatch(/^[0-9a-f-]{36}$/);
    await f.advance(f.now + 6_000);
    await page.reload();
    await f.connect();
    await expect(
      page.getByRole("region", { name: "Saved task recovery" }),
    ).toContainText(kind === "create" ? actionContext.task.title : "Updated");
    expect(f.calls.filter((c) => c.operation === "prepare")).toHaveLength(1);
    expect(
      f.calls.filter((c) => c.operation === "session").at(-1)!.body,
    ).toEqual({
      clientId: f.ctx.clientId ?? f.ctx.selectedClientId,
      conversationId: f.ctx.conversationId,
    });
    await page
      .getByRole("button", { name: "Retry exact saved request" })
      .click();
    await expect(
      page.getByRole("button", { name: "Approve and execute", exact: true }),
    ).toBeDisabled();
    expect(
      f.calls.filter((c) => c.operation === "prepare").map((c) => c.body),
    ).toEqual([prepare, prepare]);
    expect(f.calls.filter((c) => c.operation === "execute")).toHaveLength(0);
    await page.getByRole("checkbox", { name: /I approve/ }).check();
    expect(f.calls.filter((c) => c.operation === "execute")).toHaveLength(0);
    await page
      .getByRole("button", { name: "Approve and execute", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Outcome uncertain");
    const execute = f.calls.find((c) => c.operation === "execute")!.body;
    await f.advance(f.now + 50_000);
    await page.reload();
    await f.connect();
    await expect(
      page.getByRole("region", { name: "Saved task recovery" }),
    ).toBeVisible();
    expect(f.calls.filter((c) => c.operation === "execute")).toHaveLength(1);
    await page
      .getByRole("button", { name: "Retry exact saved request" })
      .click();
    await expect(
      page.getByRole("heading", {
        name:
          kind === "create"
            ? "Task creation confirmed"
            : "Task update confirmed",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      f.calls.filter((c) => c.operation === "execute").map((c) => c.body),
    ).toEqual([execute, execute]);
    expect(f.errors).toEqual([]);
  });

test("task update preserves unsent draft through current identity revalidation and clears it on actor replacement", async ({
  page,
}) => {
  const f = await setup(page, "update");
  await f.connect();
  await page
    .getByLabel("New task title", { exact: true })
    .fill("Keep my unsent wording");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/backend/core/me",
    async (route) => {
      await held;
      await route.fallback();
    },
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Revalidate current account" })
    .click();
  await expect(page.getByLabel("New task title", { exact: true })).toBeHidden();
  release();
  await expect(page.getByLabel("New task title", { exact: true })).toHaveValue(
    "Keep my unsent wording",
  );
  f.setActor("replacement-actor");
  await page
    .getByRole("button", { name: "Revalidate current account" })
    .click();
  await expect(
    page.getByRole("button", { name: "Connect task-update service" }),
  ).toBeVisible();
  await f.connect();
  await expect(page.getByLabel("New task title", { exact: true })).toHaveValue(
    "",
  );
  expect(f.calls.filter((c) => c.operation !== "session")).toEqual([]);
  expect(f.errors).toEqual([]);
});

test("stale unexecuted create preparation can be explicitly discarded before a fresh query and draft review", async ({
  page,
}) => {
  const f = await setup(page, "create", true);
  await f.connect();
  await page
    .getByRole("button", { name: "Find recommendations", exact: true })
    .click();
  await page.getByRole("button", { name: /^Select recommendation/ }).click();
  await page
    .getByLabel("Task title", { exact: true })
    .fill(actionContext.task.title);
  await page.getByRole("button", { name: "Review draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Prepare approval proposal", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Outcome uncertain");
  await f.advance(f.now + 6_000);
  await page.reload();
  await f.connect();
  await page.getByRole("button", { name: "Retry exact saved request" }).click();
  await expect(page.getByRole("alert")).toContainText("Request not dispatched");
  const calls = f.calls.length;
  await page
    .getByRole("button", {
      name: "Discard unexecuted preparation and review again",
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Find recommendations", exact: true }),
  ).toBeEnabled();
  expect(f.calls).toHaveLength(calls);
  await page
    .getByRole("button", { name: "Find recommendations", exact: true })
    .click();
  await page.getByRole("button", { name: /^Select recommendation/ }).click();
  await page
    .getByLabel("Task title", { exact: true })
    .fill(actionContext.task.title);
  await page.getByRole("button", { name: "Review draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reviewed task intent", exact: true }),
  ).toBeVisible();
  expect(f.calls.filter((call) => call.operation === "query")).toHaveLength(2);
  expect(f.calls.filter((call) => call.operation === "execute")).toHaveLength(
    0,
  );
  expect(f.errors).toEqual([]);
});
