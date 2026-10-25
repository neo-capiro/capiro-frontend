import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { onlyLocalRequests } from "./fixtures";

const original = () =>
  JSON.parse(
    readFileSync(
      new URL(
        "../../tests/fixtures/meri-routines/canonical.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
const id = (n: number) =>
  `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function setup(
  page: Page,
  { lose = false, general = false, chat = false } = {},
) {
  const f = original();
  // The canonical synthetic server fixture uses opaque actor strings. Core bootstrap requires native UUID identities.
  if (!chat) {
    const text = JSON.stringify(f)
      .replaceAll('"tenant-a"', JSON.stringify(id(1)))
      .replaceAll('"owner-a"', JSON.stringify(id(2)));
    Object.assign(f, JSON.parse(text));
  }
  const clientId = general ? null : f.context.selectedClientId;
  let actorId = f.context.actorId,
    session = 0,
    losePrepare = lose,
    loseApprove = lose;
  let current = f.prepared,
    approved = false;
  const preparations = new Map<string, unknown>();
  const calls: Array<{ operation: string; body: Record<string, unknown> }> = [],
    errors: string[] = [];
  await onlyLocalRequests(page);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/backend/core/me", (route) =>
    route.fulfill({
      json: {
        user: { id: actorId, email: null },
        tenant: { id: f.context.tenantId, name: "Synthetic" },
        role: "standard_user",
      },
    }),
  );
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: {
        id: f.context.selectedClientId,
        name: "Synthetic client",
        status: "active",
        profileStatus: "active",
      },
    }),
  );
  await page.route("**/api/capiro/meri.conversation.bootstrap.v2", (route) => {
    const body = route.request().postDataJSON().body;
    calls.push({ operation: "bootstrap", body });
    return route.fulfill({
      json: {
        ...body,
        conversationId: f.context.conversationId,
        tenantId: f.context.tenantId,
        actorId,
      },
    });
  });
  await page.route("**/api/conversations/intents/list", (route) =>
    route.fulfill({
      json: {
        conversationId: f.context.conversationId,
        next: null,
        intents: [
          {
            deliveryId: "sdk:" + "a".repeat(64),
            createdAt: f.prepared.proposal.projection.createdAt,
            operation: { id: "schedule_task", version: "0.2.0" },
            state: "prepared",
            kind: "schedule_proposal",
            binding: {
              tenantId: f.context.tenantId,
              actorId,
              conversationId: f.context.conversationId,
              runId: f.context.runId,
              attemptId: id(61),
              workerId: id(62),
              writerFence: 1,
            },
            request: f.request.request,
            proposal: f.prepared.proposal,
          },
        ],
      },
    }),
  );
  await page.route("**/api/action-followthrough/*", async (route) => {
    const operation = new URL(route.request().url()).pathname.split("/").pop()!;
    const body = route.request().postDataJSON();
    calls.push({ operation, body });
    if (operation === "session") {
      expect(body).not.toHaveProperty("runId");
      return route.fulfill({
        json: {
          credential: "action_session_" + "a".repeat(43),
          expiresAtMs: Date.now() + 60_000,
          context: {
            ...f.context,
            actorId,
            selectedClientId: clientId,
            runId: session++ ? id(50 + session) : f.context.runId,
          },
        },
      });
    }
    if (operation === "routine-prepare") {
      if (!preparations.has(body.requestId)) {
        const response = structuredClone(f.prepared),
          p = response.proposal;
        p.proposalId = id(100 + preparations.size);
        p.operation = body.operation;
        p.projection.owner.actorId = actorId;
        if (body.operation === "cancel_scheduled_task") {
          const { scheduleId, ...cancel } = body.request;
          p.cancel = cancel;
          p.policy = null;
          p.taskInstruction = null;
          p.projection.scheduleId = scheduleId;
          p.projection.state = cancel.mode === "pause" ? "paused" : "cancelled";
        } else {
          p.policy = body.request.policy;
          p.taskInstruction = body.request.taskInstruction.trim();
          p.projection.timezone = body.request.policy.spec.timezone;
          p.projection.state = body.request.policy.paused ? "paused" : "active";
          for (const key of [
            "maxCostMicrousd",
            "maxRuntimeSeconds",
            "retryLimit",
          ])
            p.projection[key] = Math.min(
              p.projection[key],
              body.request.requestedLimits[key],
            );
        }
        preparations.set(body.requestId, response);
      }
      current = preparations.get(body.requestId);
      if (losePrepare) {
        losePrepare = false;
        return route.abort("failed");
      }
      return route.fulfill({ json: current });
    }
    if (operation === "routine-approve") {
      approved = true;
      expect(body.proposalId).toBe(current.proposal.proposalId);
      if (loseApprove) {
        loseApprove = false;
        return route.abort("failed");
      }
      return route.fulfill({
        json: {
          ...f.acknowledged,
          operation: current.proposal.operation,
          receipt: {
            ...f.acknowledged.receipt,
            operation: current.proposal.operation,
            intentId: current.proposal.proposalId,
            projection: current.proposal.projection,
          },
        },
      });
    }
    if (operation === "routine-reconcile")
      return approved
        ? route.fulfill({
            json: {
              ...f.reconciled,
              intentId: current.proposal.proposalId,
              operation: current.proposal.operation,
            },
          })
        : route.fulfill({
            status: 502,
            json: {
              error: {
                code: "SCHEDULE_RECONCILE_FAILED",
                outcome: "UNRESOLVED",
              },
            },
          });
    if (operation === "routine-list") return route.fulfill({ json: f.listed });
    return route.fulfill({ status: 404, json: {} });
  });
  const url = chat
    ? "/routines?chat=true"
    : `/routines${general ? "" : `?clientId=${f.context.selectedClientId}`}`;
  return {
    calls,
    errors,
    url,
    context: f.context,
    changeActor: () => {
      actorId = id(3);
    },
  };
}
async function connect(page: Page) {
  await page
    .getByRole("button", { name: "Connect routines", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "New routine", exact: true }),
  ).toBeEnabled();
}
async function fill(page: Page) {
  await page.getByRole("button", { name: "New routine", exact: true }).click();
  await page
    .getByLabel("Instructions", { exact: true })
    .fill("Review synthetic authorized activity.");
  await page
    .getByLabel("Output destination", { exact: true })
    .fill("Meri inbox");
  await page.getByLabel("Timezone", { exact: true }).fill("UTC");
  await page.getByLabel("Maximum cost per run (USD)").fill("0.005");
  await page.getByLabel("Maximum runtime per run (seconds)").fill("120");
  await page
    .getByRole("button", { name: "Prepare routine for review" })
    .click();
}

test("mounted dedicated routine preserves lost preparation/approval across reload and only explicit recovery changes the schedule", async ({
  page,
}) => {
  const f = await setup(page, { lose: true });
  await page.goto(f.url);
  await connect(page);
  await fill(page);
  await expect(
    page.getByRole("button", { name: "Retry exact preparation" }),
  ).toBeVisible();
  const originalPrepare = f.calls.find(
    (call) => call.operation === "routine-prepare",
  )!.body;
  await page.reload();
  await page
    .getByRole("button", { name: "Connect routines", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry exact preparation" }),
  ).toBeEnabled();
  expect(
    f.calls.filter((call) => call.operation === "routine-prepare"),
  ).toHaveLength(1);
  await page.getByRole("button", { name: "Retry exact preparation" }).click();
  await expect(
    page.getByRole("button", { name: "Approve routine change" }),
  ).toBeDisabled();
  expect(
    f.calls.filter((call) => call.operation === "routine-prepare")[1]!.body,
  ).toEqual(originalPrepare);
  await page.getByRole("checkbox", { name: /I reviewed/ }).check();
  await page.getByRole("button", { name: "Approve routine change" }).click();
  await expect(
    page.getByRole("button", { name: "Check schedule result" }),
  ).toBeEnabled();
  await page.reload();
  await page
    .getByRole("button", { name: "Connect routines", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check schedule result" }),
  ).toBeEnabled();
  expect(
    f.calls.filter((call) => call.operation === "routine-approve"),
  ).toHaveLength(1);
  expect(
    f.calls.filter((call) => call.operation === "routine-reconcile"),
  ).toHaveLength(0);
  await page.getByRole("button", { name: "Check schedule result" }).click();
  await expect(
    page.getByRole("button", { name: "Finish review" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Finish review" }).click();
  await expect(
    page.getByRole("button", { name: "New routine", exact: true }),
  ).toBeEnabled();
  expect(
    f.calls
      .filter((call) => call.operation === "session")
      .slice(1)
      .every(
        (call) =>
          call.body.conversationId === f.context.conversationId &&
          !("runId" in call.body),
      ),
  ).toBe(true);
  expect(f.errors).toEqual([]);
});

test("dedicated General connect uses canonical bootstrap, reviewed pause, and bounded list without automatic approval", async ({
  page,
}) => {
  const f = await setup(page, { general: true });
  await page.goto(f.url);
  expect(f.calls).toEqual([]);
  await connect(page);
  expect(f.calls.filter((call) => call.operation === "bootstrap")).toHaveLength(
    1,
  );
  expect(f.calls.find((call) => call.operation === "session")!.body).toEqual({
    clientId: null,
    conversationId: f.context.conversationId,
  });
  await page.getByRole("button", { name: "Refresh routines" }).click();
  await expect(
    page.getByRole("button", { name: "Pause or cancel", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Pause or cancel", exact: true })
    .click();
  await page.getByLabel("Reason", { exact: true }).fill("Pause after review");
  await page.getByRole("button", { name: "Prepare change for review" }).click();
  await expect(
    page.getByRole("button", { name: "Approve routine change" }),
  ).toBeDisabled();
  expect(
    f.calls.filter((call) => call.operation === "routine-approve"),
  ).toHaveLength(0);
  expect(
    f.calls.find((call) => call.operation === "routine-prepare")!.body.request,
  ).toMatchObject({ mode: "pause", running: "leave", runs: [] });
  await page.getByRole("checkbox", { name: /I reviewed/ }).check();
  await page.getByRole("button", { name: "Approve routine change" }).click();
  await expect(
    page.getByText(/not completion of a scheduled run/),
  ).toBeVisible();
  expect(f.errors).toEqual([]);
});

test("chat routine uses schedule approval only and restores saved unknown approval across session replacement", async ({
  page,
}) => {
  const f = await setup(page, { chat: true, lose: true });
  await page.goto(f.url);
  await expect(
    page.getByRole("button", { name: "Approve routine change" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Approve…", exact: true }),
  ).toHaveCount(0);
  expect(f.calls).toEqual([]);
  await page.getByRole("checkbox", { name: /I reviewed/ }).check();
  await page.getByRole("button", { name: "Approve routine change" }).click();
  await expect(
    page.getByRole("button", { name: "Check schedule result" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Replace routine session" }).click();
  await expect(
    page.getByRole("button", { name: "Check schedule result" }),
  ).toBeEnabled();
  expect(
    f.calls.filter((call) => call.operation === "routine-approve"),
  ).toHaveLength(1);
  await page.getByRole("button", { name: "Check schedule result" }).click();
  await expect(
    page.getByRole("button", { name: "Finish review" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish review" }).click();
  await page.reload();
  await expect(
    page.getByText("The routine change was acknowledged."),
  ).toBeVisible();
  expect(
    f.calls.every((call) =>
      ["routine-approve", "routine-reconcile"].includes(call.operation),
    ),
  ).toBe(true);
  expect(f.errors).toEqual([]);
});

test("actor replacement removes the old reviewed content and cannot adopt its saved routine", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto(f.url);
  await connect(page);
  await fill(page);
  await expect(
    page.getByRole("button", { name: "Approve routine change" }),
  ).toBeVisible();
  f.changeActor();
  await page
    .getByRole("button", { name: "Revalidate routine account" })
    .click();
  await expect(
    page.getByRole("button", { name: "Connect routines", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Review synthetic authorized activity.", { exact: true }),
  ).toHaveCount(0);
  await connect(page);
  await expect(
    page.getByRole("button", { name: "Approve routine change" }),
  ).toHaveCount(0);
  expect(
    f.calls.filter((call) => call.operation === "routine-approve"),
  ).toHaveLength(0);
  expect(f.errors).toEqual([]);
});

test("routine shell retains unsent choices through current-client revalidation and drops them on refusal", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto(f.url);
  await connect(page);
  await page.getByRole("button", { name: "New routine", exact: true }).click();
  const instructions = page.getByLabel("Instructions", { exact: true });
  await instructions.fill("Unsent local routine choices");
  let finishRead!: () => void;
  let startedRead!: () => void;
  const started = new Promise<void>((resolve) => {
    startedRead = resolve;
  });
  const held = new Promise<void>((resolve) => {
    finishRead = resolve;
  });
  await page.route("**/api/backend/core/clients/*", async (route) => {
    startedRead();
    await held;
    await route.fulfill({
      json: {
        id: f.context.selectedClientId,
        name: "Synthetic client",
        status: "active",
        profileStatus: "active",
      },
    });
  });
  await page.getByRole("button", { name: "Revalidate routine client" }).click();
  await started;
  await expect(instructions).toBeHidden();
  await expect(instructions).toHaveValue("Unsent local routine choices");
  await expect(
    page.getByText("Verifying current account and client access…"),
  ).toBeVisible();
  finishRead();
  await expect(instructions).toBeVisible();
  await expect(instructions).toHaveValue("Unsent local routine choices");
  expect(f.calls.filter((call) => call.operation === "session")).toHaveLength(
    1,
  );
  expect(
    f.calls.filter((call) => call.operation.startsWith("routine-")),
  ).toHaveLength(0);
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({ status: 403, json: { error: "forbidden" } }),
  );
  await page.getByRole("button", { name: "Revalidate routine client" }).click();
  await expect(instructions).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Connect routines", exact: true }),
  ).toBeDisabled();
  expect(f.errors).toEqual([]);
});
