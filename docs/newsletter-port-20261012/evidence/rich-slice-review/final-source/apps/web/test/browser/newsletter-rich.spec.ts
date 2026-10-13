import { test, expect, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";

const recordId = "10000000-0000-4000-8000-000000000007";
const stageId = "20000000-0000-4000-8000-000000000007";
const ordinary = {
  id: recordId,
  title: "Synthetic ordinary draft",
  type: "outbound_campaign",
  status: "draft",
  subject: "Synthetic subject",
  body: "Plain text",
};
const rich = {
  ...ordinary,
  title: "Synthetic rich draft",
  metadata: { newsletterStageId: stageId, newsletterRevision: 2 },
};

async function setup(page: Page, record: object = rich) {
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "engagement.sessions": [],
    "engagement.outreach": [record],
    "engagement.outreach.record": record,
  });
  const writes: string[] = [],
    operations: string[] = [],
    errors: string[] = [],
    remote: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      remote.push(request.url());
    if (request.url().includes("/api/capiro/")) {
      operations.push(new URL(request.url()).pathname.split("/").pop()!);
      if (request.method() !== "GET") writes.push(request.url());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return { writes, operations, errors, remote };
}

test("rich list selection cannot mount the generic writer and Back restores the list", async ({
  page,
}) => {
  const observed = await setup(page);
  await page.goto("/modules/engagement?view=outreach");
  await page.getByRole("button", { name: "Synthetic rich draft" }).click();
  await expect(
    page.getByRole("heading", { name: "Rich newsletter unavailable" }),
  ).toBeVisible();
  await expect(page.getByLabel("Body", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Prepare delivery" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Back to Outreach" }).click();
  await expect(
    page.getByRole("button", { name: "Synthetic rich draft" }),
  ).toBeVisible();
  expect(observed.writes).toEqual([]);
  expect(observed.errors).toEqual([]);
});
test("ordinary records retain the existing editor", async ({ page }) => {
  const observed = await setup(page, ordinary);
  await page.goto("/modules/engagement?view=outreach");
  await page.getByRole("button", { name: ordinary.title }).click();
  await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
    "Plain text",
  );
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeEnabled();
  expect(observed.writes).toEqual([]);
});
test("legacy draft deep link containing rich metadata never mounts the plain writer", async ({
  page,
}) => {
  const observed = await setup(page);
  await page.goto(`/modules/engagement?view=outreach&draft=${recordId}`);
  await expect(
    page.getByRole("heading", { name: "Rich newsletter unavailable" }),
  ).toBeVisible();
  await expect(page.getByLabel("Body", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Back to Outreach" }).click();
  await expect(
    page.getByRole("button", { name: "Synthetic rich draft" }),
  ).toBeVisible();
  expect(observed.writes).toEqual([]);
});
test("wrong-type marker refuses editing and malformed marker fails decoding", async ({
  page,
}) => {
  const observed = await setup(page, { ...rich, type: "follow_up" });
  await page.goto(`/modules/engagement?draft=${recordId}`);
  await expect(
    page.getByRole("heading", { name: "Newsletter unavailable", exact: true }),
  ).toBeVisible();
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "engagement.sessions": [],
    "engagement.outreach.record": {
      ...rich,
      metadata: { newsletterStageId: null },
    },
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Unable to load this view" }),
  ).toBeVisible();
  await expect(page.getByLabel("Body", { exact: true })).toHaveCount(0);
  expect(observed.writes).toEqual([]);
});
for (const query of [
  `newsletter=${recordId}`,
  `newsletterStage=${stageId}`,
  `newsletter=${recordId}&session=${stageId}`,
  `newsletterStage=${stageId}&newsletter=${recordId}`,
  "newsletter=bad",
]) {
  test(`rich route does not call legacy, V3 or effectful owners: ${query}`, async ({
    page,
  }) => {
    const observed = await setup(page);
    await page.goto(`/modules/engagement?${query}`);
    await expect(
      page.getByRole("heading", { name: /newsletter unavailable/i }),
    ).toBeVisible();
    expect(observed.operations.filter((key) => key !== "me.read")).toEqual([]);
    expect(observed.writes).toEqual([]);
    expect(observed.errors).toEqual([]);
  });
}

test("local rich editor formats content, undoes, previews mobile and plain text without writes", async ({
  page,
}, info) => {
  const observed = await setup(page);
  await page.goto("/modules/workspace?view=rich-newsletter");
  await expect(
    page.getByRole("heading", { name: "Rich newsletter editor preview" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Heading · This week in policy/ })
    .click();
  await page
    .getByRole("textbox", { name: "Block rich text" })
    .fill("Synthetic local heading");
  await expect(
    page
      .frameLocator('iframe[title="Rich newsletter preview"]')
      .getByRole("heading", { name: "Synthetic local heading" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page
      .frameLocator('iframe[title="Rich newsletter preview"]')
      .getByRole("heading", { name: "This week in policy" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Block rich text" }),
  ).toHaveText("Synthetic local heading");
  await page.getByRole("button", { name: "Mobile preview" }).click();
  await expect(
    page.locator('iframe[title="Rich newsletter preview"]'),
  ).toHaveCSS("width", "375px");
  const preview = page.frameLocator('iframe[title="Rich newsletter preview"]');
  const sizing = await preview.locator("body").evaluate((body) => ({
    viewport: window.innerWidth,
    scroll: body.scrollWidth,
    shell: document.querySelector(".nl-shell")!.getBoundingClientRect().width,
  }));
  expect(sizing.shell).toBeGreaterThan(300);
  expect(sizing.shell).toBeLessThanOrEqual(sizing.viewport);
  expect(sizing.scroll).toBeLessThanOrEqual(sizing.viewport);
  await expect(
    preview.getByRole("heading", { name: "Synthetic local heading" }),
  ).toHaveCSS("font-size", "32px");
  await page.screenshot({
    path: info.outputPath("rich-editor-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Plain text", exact: true }).click();
  await expect(page.getByLabel("Newsletter plain text")).toContainText(
    "Synthetic local heading",
  );
  await expect(
    page.getByRole("button", { name: "Save newsletter", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Stage newsletter", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("rich-editor-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(observed.writes).toEqual([]);
  expect(observed.errors).toEqual([]);
  expect(observed.remote).toEqual([]);
});
test("preview isolates untrusted HTML, external images and links", async ({
  page,
}) => {
  const observed = await setup(page);
  await page.goto("/modules/workspace?view=rich-newsletter");
  await page.getByText("Add block to Body", { exact: true }).click();
  await page.getByRole("button", { name: "Code", exact: true }).click();
  await page.getByRole("button", { name: "Code", exact: true }).first().click();
  await page
    .getByLabel("HTML content")
    .fill(
      '<script>parent.alert("bad")</script><form action="https://example.test/leak"><input name="secret"></form><img src="https://example.test/tracker" alt="Remote"><a href="https://example.test">Safe text</a>',
    );
  const frame = page.frameLocator('iframe[title="Rich newsletter preview"]');
  await expect(frame.getByText("Safe text", { exact: true })).toBeVisible();
  await expect(
    frame.locator("script,form,input,a[href],img[src^='https://example.test']"),
  ).toHaveCount(0);
  await expect(
    page.locator('iframe[title="Rich newsletter preview"]'),
  ).toHaveAttribute("sandbox", "");
  expect(observed.remote).toEqual([]);
  expect(observed.errors).toEqual([]);
});
test("scope replacement and sign-out clear the local editor", async ({
  page,
}) => {
  const observed = await setup(page);
  await page.goto("/modules/workspace?view=rich-newsletter");
  await page.getByLabel("Newsletter name").fill("Prior tenant local draft");
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { orgId: "second-org", sessionId: "second-session" },
      }),
    ),
  );
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Untitled newsletter",
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: null, orgId: null, sessionId: null },
      }),
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to Capiro" }),
  ).toBeVisible();
  await expect(page.getByLabel("Newsletter name")).toHaveCount(0);
  expect(observed.writes).toEqual([]);
});
