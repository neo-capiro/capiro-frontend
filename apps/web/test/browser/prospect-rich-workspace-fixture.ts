import { expect, type Page, type Request } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  draft,
  prospectId,
  otherId,
} from "../../tests/prospect-resources-fixtures";
import {
  prospectStateFixture,
  prospectReceiptFixture,
} from "../../tests/prospect-atomic-fixture";
export const richDetail = `/modules/workspace?prospectId=${prospectId}&draftId=${draft.id}`;
export const richSource =
  "<p>A <strong>formatted</strong> draft with <em>emphasis</em>.</p>";
export async function richWorkspaceFixture(
  page: Page,
  initial = richSource,
  held?: "save",
  loseReceipt = false,
) {
  await onlyLocalRequests(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let current = {
    ...structuredClone(draft),
    config: { sections: ["Body"], sectionContent: { Body: initial } },
  };
  const writes: { operation: string; body: unknown }[] = [],
    receipts = new Map<
      string,
      Awaited<ReturnType<typeof prospectReceiptFixture>>
    >();
  let entered = false,
    routeSettled = false,
    requestCompleted = false,
    release!: () => void;
  const completed = (request: Request) => {
    if (held && request.url().endsWith("workspace.prospect.save"))
      requestCompleted = true;
  };
  page.on("requestfinished", completed);
  page.on("requestfailed", completed);
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "workspace.prospect.drafts": { drafts: [] },
    "workspace.draft": () => current,
    "workspace.prospect.state": () =>
      prospectStateFixture(
        current,
        receipts.size ? "b".repeat(64) : "a".repeat(64),
      ),
    "workspace.draft.versions": [
      {
        id: otherId,
        draftId: draft.id,
        label: "Manual save",
        authorId: "test-user",
        authorKind: "human",
        createdAt: "2026-10-12T12:01:00Z",
      },
    ],
  });
  await page.route("**/api/capiro/workspace.prospect.save", async (route) => {
    const { body } = route.request().postDataJSON();
    writes.push({ operation: "save", body });
    const isHeld = Boolean(held && !entered);
    try {
      if (isHeld) {
        entered = true;
        await gate;
      }
      if (!receipts.has(body.requestId)) {
        current = {
          ...current,
          docTitle: body.title,
          config: { sections: body.names, sectionContent: body.sections },
          updatedAt: new Date().toISOString(),
        };
        receipts.set(
          body.requestId,
          await prospectReceiptFixture(current, body),
        );
      }
      if (isHeld && loseReceipt) return route.abort("connectionreset");
      await route.fulfill({ json: receipts.get(body.requestId) });
    } finally {
      if (isHeld) routeSettled = true;
    }
  });
  return {
    writes,
    errors,
    release,
    entered: () => entered,
    routeSettled: () => routeSettled,
    requestCompleted: () => requestCompleted,
    current: () => current,
  };
}
export async function richBody(page: Page) {
  const body = page.getByRole("textbox", { name: "Body content", exact: true });
  await expect(body).toHaveAttribute("contenteditable", "true");
  return body;
}
