import { expect, test } from "@playwright/test";
import { newWorkflow } from "../../src/features/settings/site-workflows/form";

const configuration = (version = 1) => ({
  manifest: {
    ...newWorkflow(),
    siteId: "synthetic-site",
    workflowId: "synthetic-task",
    version,
    taskSummary: "Read synthetic records",
    origins: ["https://records.example.com"],
    signInUrl: "https://records.example.com/login",
    signedInProbe: { kind: "selector", value: "[data-account]" },
    tosReviewRef: "synthetic-terms",
    qualificationEvidenceRef: "synthetic-qualification",
  },
  enabled: true,
  manifestSha256: String(version).repeat(64),
});
const endpoint = "**/api/capiro/meri.siteWorkflows.catalog";
test("choose, retain through reload, show a stale exact pin, replace and clear", async ({
  page,
}) => {
  let version = 1;
  await page.route(endpoint, (route) =>
    route.fulfill({ json: { workflows: [configuration(version)] } }),
  );
  await page.goto("/site-workflow-picker.html");
  await page.locator("summary").focus();
  await page.keyboard.press("Enter");
  const select = page.getByRole("combobox", {
    name: "Website task",
    exact: true,
  });
  await expect(select.locator("option")).toHaveCount(2);
  await select.selectOption({
    label: "synthetic-site · synthetic-task · version 1",
  });
  const saved = page.getByLabel("Saved draft selection");
  await expect(saved).toContainText('"version":1');
  await page.reload();
  await page.locator("summary").click();
  await expect(saved).toContainText('"version":1');
  version = 2;
  await page.getByRole("button", { name: "Refresh website tasks" }).click();
  await expect(page.getByRole("alert")).toContainText("no longer available");
  await expect(saved).toContainText('"version":1');
  await select.selectOption({
    label: "synthetic-site · synthetic-task · version 2",
  });
  await expect(saved).toContainText('"version":2');
  await page.getByRole("button", { name: "Clear website task" }).click();
  await expect(saved).toHaveText("{}");
});
test("failed, disabled and malformed catalogs never become selectable", async ({
  page,
}) => {
  let mode = "failed";
  await page.route(endpoint, (route) =>
    route.fulfill(
      mode === "failed"
        ? { status: 403, json: {} }
        : {
            json: {
              workflows: [
                mode === "disabled"
                  ? { ...configuration(), enabled: false }
                  : { ...configuration(), cookie: "synthetic" },
              ],
            },
          },
    ),
  );
  await page.goto("/site-workflow-picker.html");
  await page.locator("summary").click();
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await expect(page.getByRole("combobox")).toBeDisabled();
  mode = "disabled";
  await page.getByRole("button", { name: "Refresh website tasks" }).click();
  await expect(
    page.getByText("No website tasks are enabled for this chat."),
  ).toBeVisible();
  mode = "malformed";
  await page.getByRole("button", { name: "Refresh website tasks" }).click();
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await expect(page.getByRole("combobox")).toBeDisabled();
});
test("a late old-chat catalog cannot replace the new chat choices", async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const sent = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route(endpoint, async (route) => {
    const old = route
      .request()
      .postDataJSON()
      .body.conversationId.startsWith("1111");
    if (old) {
      started();
      await pending;
    }
    await route.fulfill({ json: { workflows: old ? [configuration()] : [] } });
  });
  await page.goto("/site-workflow-picker.html");
  await sent;
  await page.getByRole("button", { name: "Switch chat" }).click();
  await page.locator("summary").click();
  await expect(
    page.getByText("No website tasks are enabled for this chat."),
  ).toBeVisible();
  release();
  await expect(page.getByRole("combobox").locator("option")).toHaveCount(1);
});
