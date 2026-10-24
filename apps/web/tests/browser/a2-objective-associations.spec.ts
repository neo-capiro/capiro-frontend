import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { canonicalOperationalJSON } from "../../src/shared/capiro/operations/objective-operational-semantics";
import type { OperationalAssociationCommand } from "../../src/shared/capiro/operations/objective-operational";
import {
  objective,
  read,
  strategy,
  inventory,
} from "./a2-association-fixtures";

const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /same key|React has detected|Invalid hook|Maximum update depth/.test(
        message.text(),
      )
    )
      errors.push(message.text());
  });
});
test.afterEach(({ page }) => expect(runtimeErrors.get(page)).toEqual([]));

function receipt(command: OperationalAssociationCommand) {
  return {
    schemaVersion: 1,
    requestId: command.requestId,
    clientId: command.clientId,
    objectiveId: command.objectiveId,
    commandRevision: {
      id: read.scope.currentRevisionId,
      version: read.scope.objectiveVersion,
    },
    associationLinkedRevision:
      command.action === "unlink"
        ? inventory.items[0]!.linkedRevision
        : {
            id: read.scope.currentRevisionId,
            version: read.scope.objectiveVersion,
          },
    associationId:
      command.action === "unlink"
        ? command.associationId
        : "00000062-1111-4111-8111-111111111111",
    payloadDigest: createHash("sha256")
      .update(canonicalOperationalJSON(command))
      .digest("hex"),
    resultSetVersion: command.expectedAssociationSetVersion + 1,
    committedAt: "2026-10-23T00:00:00.000Z",
    action: command.action,
    outcome: command.action === "link" ? "linked" : "unlinked",
  };
}
async function setup(page: Page) {
  const unexpected: string[] = [];
  await page.route("http://127.0.0.1:5191/api/**", async (route) => {
    const url = new URL(route.request().url());
    let value: unknown;
    if (url.pathname === "/api/capiro/objectives.operational.read")
      value = read;
    else if (url.pathname === "/api/capiro/objectives.operational.associations")
      value = inventory;
    else if (
      url.pathname ===
      `/api/backend/core/clients/${objective.clientId}/objectives`
    )
      value = [objective];
    else if (url.pathname === "/api/backend/strategy/strategies")
      value = [strategy];
    else if (url.pathname === `/api/backend/strategy/strategies/${strategy.id}`)
      value = strategy;
    else {
      unexpected.push(`${route.request().method()} ${url.pathname}`);
      await route.fulfill({
        status: 503,
        json: { message: "Unexpected synthetic request" },
      });
      return;
    }
    await route.fulfill({ json: value });
  });
  await page.goto("/a2-objective-associations.html");
  await page.getByRole("button", { name: "Manage links", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Manage Objective links",
    exact: true,
  });
  await expect(
    dialog.getByRole("combobox", { name: "Choose existing work" }),
  ).toBeEnabled();
  return { dialog, unexpected };
}
async function reviewLink(page: Page) {
  await page.getByRole("combobox", { name: "Choose existing work" }).click();
  await page.getByRole("option", { name: /Strategy/ }).click();
  await page.getByRole("option", { name: /New synthetic Strategy/ }).click();
  await page.getByRole("button", { name: "Review link", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Link to this Objective", exact: true }),
  ).toBeEnabled();
}

test("canonical link review uses the adopted picker; duplicate click and pending dismissal never replay", async ({
  page,
}, info) => {
  const { dialog, unexpected } = await setup(page);
  let writes = 0,
    release: (() => void) | undefined;
  await page.route(
    "**/api/capiro/objectives.operational.link",
    async (route) => {
      writes++;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({
        json: receipt(route.request().postDataJSON().body),
      });
    },
  );
  await reviewLink(page);
  await dialog
    .getByRole("button", { name: "Link to this Objective", exact: true })
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
      (node as HTMLButtonElement).click();
    });
  await expect.poll(() => writes).toBe(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  release!();
  await expect(dialog.getByRole("status")).toContainText(
    "Work linked to this Objective.",
  );
  await page.screenshot({ path: info.outputPath("link-confirmed.png") });
  await dialog.getByRole("button", { name: "Refresh and finish" }).click();
  await expect(
    dialog.getByRole("button", { name: "Review link", exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("response loss survives reload and only the exact historical GET receipt resolves it", async ({
  page,
}) => {
  await setup(page);
  let writes = 0,
    reads = 0,
    saved: ReturnType<typeof receipt>;
  await page.route(
    "**/api/capiro/objectives.operational.link",
    async (route) => {
      writes++;
      saved = receipt(route.request().postDataJSON().body);
      await route.abort("failed");
    },
  );
  await page.route(
    "**/api/capiro/objectives.operational.receipt?**",
    async (route) => {
      reads++;
      await route.fulfill({ json: saved });
    },
  );
  await reviewLink(page);
  await page
    .getByRole("button", { name: "Link to this Objective", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Result not confirmed" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Manage links", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Result not confirmed" }),
  ).toBeVisible();
  await page.route(
    `**/api/backend/strategy/strategies/${strategy.id}`,
    (route) => route.fulfill({ status: 404, json: {} }),
  );
  await page.getByRole("button", { name: "Check saved result" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Work linked to this Objective.",
  );
  expect(writes).toBe(1);
  expect(reads).toBe(1);
});

test("source moves after review refuse before dispatch and current identity loss hides the review", async ({
  page,
}) => {
  const { unexpected } = await setup(page);
  await reviewLink(page);
  await page.route(
    `**/api/backend/strategy/strategies/${strategy.id}`,
    (route) => route.fulfill({ json: { ...strategy, clientId: objective.id } }),
  );
  await page
    .getByRole("button", { name: "Link to this Objective", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "unavailable for this client",
  );
  expect(unexpected).toEqual([]);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("association-revoke")),
  );
  await expect(
    page.getByRole("button", { name: "Link to this Objective", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Choose existing work" }),
  ).toBeDisabled();
});

test("definitive stale-set rejection needs explicit refresh and a fresh review", async ({
  page,
}) => {
  await setup(page);
  let writes = 0;
  await page.route(
    "**/api/capiro/objectives.operational.link",
    async (route) => {
      writes++;
      const command = route.request().postDataJSON().body;
      await route.fulfill({
        status: 409,
        json: {
          schemaVersion: 1,
          requestId: command.requestId,
          status: 409,
          code: "ASSOCIATION_VERSION_CONFLICT",
          outcome: "rejected",
        },
      });
    },
  );
  await reviewLink(page);
  await page
    .getByRole("button", { name: "Link to this Objective", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Change was not applied" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Refresh and review again" }).click();
  await expect(
    page.getByRole("button", { name: "Review link", exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
});

test("unlink is a distinct explicit action and confirms the original linked revision", async ({
  page,
}) => {
  const { dialog, unexpected } = await setup(page);
  let command: OperationalAssociationCommand | undefined;
  await page.route(
    "**/api/capiro/objectives.operational.link",
    async (route) => {
      command = route.request().postDataJSON().body;
      await route.fulfill({ json: receipt(command!) });
    },
  );
  await dialog.getByRole("button", { name: /^Unlink FY28/ }).click();
  await expect(
    dialog.getByRole("heading", { name: "Unlink from this Objective" }),
  ).toBeVisible();
  const review = dialog.getByRole("region", { name: "Review unlink" });
  await expect(
    review.getByText(inventory.items[0]!.resource.title!, { exact: true }),
  ).toBeVisible();
  await expect(review).toContainText("Strategy ·");
  expect(command).toBeUndefined();
  await dialog.getByRole("button", { name: "Confirm unlink" }).click();
  await expect(dialog.getByRole("status")).toContainText(
    "Work unlinked from this Objective.",
  );
  expect(command).toMatchObject({
    action: "unlink",
    associationId: inventory.items[0]!.associationId,
  });
  expect(unexpected).toEqual([]);
});

test("a mismatched receipt and unavailable readback retain the unknown command without replay", async ({
  page,
}) => {
  await setup(page);
  let writes = 0;
  await page.route(
    "**/api/capiro/objectives.operational.link",
    async (route) => {
      writes++;
      await route.fulfill({
        json: {
          ...receipt(route.request().postDataJSON().body),
          payloadDigest: "f".repeat(64),
        },
      });
    },
  );
  await page.route("**/api/capiro/objectives.operational.receipt?**", (route) =>
    route.fulfill({
      status: 404,
      json: {
        schemaVersion: 1,
        requestId: null,
        status: 404,
        code: "NOT_AVAILABLE",
        outcome: "unknown",
      },
    }),
  );
  await reviewLink(page);
  await page
    .getByRole("button", { name: "Link to this Objective", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Result not confirmed" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check saved result" }).click();
  await expect(
    page.getByRole("button", { name: "Check saved result" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "Result not confirmed" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Refresh and/ })).toHaveCount(
    0,
  );
  await page.reload();
  await page.getByRole("button", { name: "Manage links", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Result not confirmed" }),
  ).toBeVisible();
  expect(writes).toBe(1);
});

test("session revocation during dispatch hides late success and preserves the original command", async ({
  page,
}) => {
  await setup(page);
  let writes = 0,
    release: (() => void) | undefined;
  await page.route(
    "**/api/capiro/objectives.operational.link",
    async (route) => {
      writes++;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route
        .fulfill({ json: receipt(route.request().postDataJSON().body) })
        .catch(() => undefined);
    },
  );
  await reviewLink(page);
  await page
    .getByRole("button", { name: "Link to this Objective", exact: true })
    .click();
  await expect.poll(() => writes).toBe(1);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("association-revoke")),
  );
  await expect(
    page.getByRole("combobox", { name: "Choose existing work" }),
  ).toBeDisabled();
  release!();
  await expect(
    page.getByRole("heading", { name: "Change confirmed" }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Manage links", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Result not confirmed" }),
  ).toBeVisible();
  expect(writes).toBe(1);
});

test("keyboard drill, strategy annotations and partial inventory remain usable on a reduced-motion phone", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { dialog } = await setup(page);
  await page.route(
    "**/api/capiro/objectives.operational.associations?**",
    (route) =>
      route.fulfill({
        json: {
          ...inventory,
          pageCoverage: "partial",
          items: [],
          nextCursor: null,
        },
      }),
  );
  await dialog.getByRole("button", { name: "Refresh list" }).click();
  await expect(
    dialog.getByText("No readable links on this page.", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText(/Some links on this page could not be verified/),
  ).toBeVisible();
  const trigger = dialog.getByRole("combobox", {
    name: "Choose existing work",
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const search = dialog.getByRole("combobox", { name: "Search loaded work" });
  await expect(search).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("option", { name: /New synthetic Strategy/ }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("phone-picker.png") });
  await search.fill("New synthetic");
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: /New synthetic Strategy/ }),
  ).toHaveAttribute("data-highlighted");
  await page.keyboard.press("Enter");
  await expect(trigger).toContainText("New synthetic Strategy");
  await dialog.getByRole("button", { name: "Add cycle annotation" }).click();
  await dialog.getByRole("spinbutton", { name: "Fiscal year 1" }).fill("2029");
  await dialog
    .getByRole("textbox", { name: "Authority track 1" })
    .fill("Synthetic track");
  await dialog
    .getByRole("button", { name: "Review link", exact: true })
    .click();
  await expect(
    dialog.getByText("FY2029 · Synthetic track · Human annotation"),
  ).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("phone-review.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Manage links", exact: true }),
  ).toBeFocused();
});
