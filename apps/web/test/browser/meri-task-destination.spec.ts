import { test, expect, type Page } from "@playwright/test";
import {
  fixture,
  context as actionContext,
} from "../../tests/meri-action-wire-fixtures";
import { nativeTaskIntent } from "../../tests/meri-intents-native-fixtures";
import { readFileSync } from "node:fs";
import { onlyLocalRequests } from "./fixtures";
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
const taskContext = taskWire("context");
const intentContext = JSON.parse(
  readFileSync(
    new URL("../../tests/fixtures/meri-intents/context.json", import.meta.url),
    "utf8",
  ),
);
function native(original: unknown, prepared: unknown) {
  const value = JSON.parse(JSON.stringify(original)),
    { proposal } = JSON.parse(JSON.stringify(prepared));
  return {
    ...value,
    outcome: {
      execution: {
        kind: "native-task",
        proposalId: proposal.proposalId,
        commandSha256: proposal.commandSha256,
        idempotencyKey: proposal.command.idempotencyKey,
        binding: proposal.command.binding,
        completedAt: value.outcome.receipt.completedAt,
        approvalDecisionSha256: "a".repeat(64),
      },
      result: value.outcome.result,
    },
  };
}
async function setup(
  page: Page,
  mode: "create" | "update" | "chat",
  answer = "current",
) {
  const item = nativeTaskIntent().response.intents[0];
  const observed =
    mode === "chat"
      ? item.execution.outcome
      : mode === "create"
        ? native(
            fixture("execute-observed").response,
            fixture("prepare").response,
          ).outcome
        : native(taskWire("observed").response, taskWire("prepare").response)
            .outcome;
  const result = observed.result;
  const now =
    mode === "chat"
      ? intentContext.syntheticNow
      : mode === "create"
        ? actionContext.syntheticNow
        : taskContext.syntheticNow;
  await page.clock.install({ time: new Date(now) });
  await page.clock.setFixedTime(new Date(now));
  await onlyLocalRequests(page);
  const errors: string[] = [],
    requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const selected = mode === "create" ? actionContext : taskContext;
  const sessionContext = {
    tenantId: selected.tenantId,
    actorId: selected.actorId,
    conversationId: selected.conversationId,
    runId: selected.runId,
    selectedClientId:
      mode === "create" ? actionContext.clientId : taskContext.selectedClientId,
  };
  await page.route("**/synthetic/mf12?*", (route) =>
    route.fulfill({
      json:
        mode === "create"
          ? {
              context: sessionContext,
              edits: { title: actionContext.task.title, dueDate: null },
            }
          : {
              context: sessionContext,
              input: { taskId: result.id, title: "Updated", status: "open" },
            },
    }),
  );
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      requests.push(url.pathname);
      if (url.pathname === "/api/capiro/engagement.task") {
        expect(request.method()).toBe("GET");
        expect(JSON.parse(url.searchParams.get("input")!)).toEqual({
          params: { id: result.id },
          ...(result.clientId ? { query: { clientId: result.clientId } } : {}),
        });
        if (answer === "deleted")
          return route.fulfill({
            status: 404,
            json: { message: "Task not found" },
          });
        const clientId =
          answer === "wrong-client"
            ? "10000000-0000-4000-8000-000000000099"
            : result.clientId;
        return route.fulfill({
          json: {
            id:
              answer === "wrong-id"
                ? "10000000-0000-4000-8000-000000000099"
                : result.id,
            title: "Current task title after receipt",
            status: "done",
            dueDate: null,
            clientId,
            client: clientId
              ? { id: clientId, name: "Synthetic current client" }
              : null,
            updatedAt: "2026-10-26T00:00:00.000Z",
          },
        });
      }
      if (url.pathname === "/api/conversations/intents/list")
        return route.fulfill({ json: nativeTaskIntent().response });
      const operation = url.pathname.split("/").pop()!;
      if (url.pathname.startsWith("/api/action-followthrough/"))
        return route.fulfill({
          json:
            operation === "execute"
              ? { status: "observed", outcome: observed }
              : fixture(operation).response,
        });
      if (url.pathname.startsWith("/api/task-commands/"))
        return route.fulfill({
          json:
            operation === "execute"
              ? { status: "observed", outcome: observed }
              : taskWire("prepare").response,
        });
      throw Error(`Unexpected fixture request ${url.pathname}`);
    },
  );
  await page.goto(`/task-destination/index.html?mode=${mode}`);
  if (mode !== "chat")
    await page.getByRole("button", { name: "Load synthetic receipt" }).click();
  return { result, errors, requests };
}
for (const mode of ["chat", "create", "update"] as const)
  test(`${mode} observed native receipt opens the exact current Workspace task without executing again`, async ({
    page,
  }, testInfo) => {
    const h = await setup(page, mode);
    const link = page.getByRole("link", { name: "Open task in Workspace" });
    await expect(link).toHaveAttribute(
      "href",
      new RegExp(`^/modules/workspace\\?.*taskId=${h.result.id}`),
    );
    const effects = h.requests.filter(
      (path) => path.endsWith("/execute") || path.endsWith("/decide"),
    ).length;
    await link.click();
    await expect(
      page.getByRole("heading", { name: "Current task title after receipt" }),
    ).toBeVisible();
    expect(
      h.requests.filter(
        (path) => path.endsWith("/execute") || path.endsWith("/decide"),
      ),
    ).toHaveLength(effects);
    expect(
      h.requests.filter((path) => path === "/api/capiro/engagement.task"),
    ).toHaveLength(1);
    expect(h.requests.some((path) => path.includes("planner"))).toBe(false);
    expect(h.errors).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath("current-task.png"),
      fullPage: true,
    });
  });
for (const answer of ["deleted", "wrong-id", "wrong-client"])
  test(`current ${answer} task response is withheld after a real receipt link`, async ({
    page,
  }) => {
    const h = await setup(page, "create", answer);
    await page.getByRole("link", { name: "Open task in Workspace" }).click();
    await expect(
      page.getByText(
        answer === "deleted"
          ? "Task not found"
          : "This task is unavailable in the selected scope.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Current task title after receipt" }),
    ).toHaveCount(0);
    expect(h.requests.filter((path) => path.endsWith("/execute"))).toHaveLength(
      1,
    );
  });
