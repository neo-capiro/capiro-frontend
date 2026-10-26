import { test, expect } from "@playwright/test";
import {
  documentFixture,
  documentId,
  stageId,
  clientId,
  editorUrl,
  button,
  enterEditor,
  adoptDocument,
  expectIsolated,
} from "./newsletter-document-fixtures";

test("rich document create is explicit, preserves local content and stages only a confirmed full save", async ({
  page,
}) => {
  const fixture = await documentFixture(page);
  await enterEditor(page, `${editorUrl}&clientId=${clientId}`);
  await page.getByLabel("Newsletter name").fill("Local creation name");
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Local creation subject");
  expect(fixture.requests).toEqual([]);
  await expect(button(page, "Save newsletter")).toBeDisabled();
  await button(page, "Create saved document").click();
  await expect(
    page.getByText(
      "The create request has a committed receipt. Read current saved content, then adopt it or rebase your retained local draft.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Local creation name",
  );
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Local creation subject",
  );
  expect(fixture.calls("create")).toEqual([
    {
      operation: "create",
      method: "POST",
      input: {
        body: { requestId: expect.any(String), name: "Local creation name" },
      },
    },
  ]);
  expect(fixture.calls("save")).toEqual([]);
  await expect(button(page, "Stage newsletter")).toBeDisabled();
  await button(page, "Read current saved document").click();
  await button(page, "Rebase local draft onto reviewed revision").click();
  await button(page, "Save newsletter").click();
  await expect(
    page.getByRole("heading", { name: "This request saved revision 2" }),
  ).toBeVisible();
  const save = fixture.calls("save")[0]!;
  expect(save.method).toBe("PATCH");
  expect(save.input).toMatchObject({
    params: { id: documentId },
    body: {
      revision: 1,
      name: "Local creation name",
      config: { subject: "Local creation subject" },
    },
  });
  expect(Object.keys((save.input as { body: object }).body).sort()).toEqual(
    ["config", "design", "name", "revision", "requestId"].sort(),
  );
  await button(page, "Read current saved document").click();
  await button(page, "Adopt saved document and replace local draft").click();
  await button(page, "Stage newsletter").click();
  await expect(
    page.getByRole("heading", { name: "Saved revision 2 staged" }),
  ).toBeVisible();
  expect(fixture.calls("stage")).toEqual([
    {
      operation: "stage",
      method: "POST",
      input: { params: { id: documentId }, body: { revision: 2 } },
    },
  ]);
  await expect(button(page, "Stage newsletter")).toBeDisabled();
  await expect(page).toHaveURL(`${editorUrl}&clientId=${clientId}`);
  expectIsolated(fixture);
  const receiving: string[] = [];
  await page.route("**/api/capiro/engagement.richNewsletter.*", (route) => {
    receiving.push(
      `${route.request().method()} ${new URL(route.request().url()).pathname}`,
    );
    return route.fulfill({
      json: {
        id: stageId,
        documentId,
        revision: 2,
        name: fixture.control.current.name,
        config: fixture.control.current.config,
        design: fixture.control.current.design,
      },
    });
  });
  const reviewStage = button(page, "Review staged newsletter");
  await expect(reviewStage).toBeEnabled();
  await reviewStage.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("confirmed-stage-host.png"),
  });
  const writesBeforeNavigation = fixture.requests.filter(
    (entry) => entry.method !== "GET",
  );
  await reviewStage.click();
  await expect(page).toHaveURL(
    `/engagement/outreach?newsletterStage=${stageId}`,
  );
  // This component harness does not mount the canonical Next redirect route.
  // Mount its existing Modules destination after asserting the returned route.
  await page.goto(
    `/modules/engagement?view=outreach&newsletterStage=${stageId}`,
  );
  await expect(
    page.getByRole("heading", { name: "Staged newsletter", exact: true }),
  ).toBeVisible();
  expect([...new Set(receiving)]).toEqual([
    "GET /api/capiro/engagement.richNewsletter.stage",
  ]);
  expect(fixture.requests.filter((entry) => entry.method !== "GET")).toEqual(
    writesBeforeNavigation,
  );
  expect(fixture.control.errors).toEqual([]);
});

test("rich library detail requires explicit adoption and sends the complete reviewed CAS document", async ({
  page,
}) => {
  const fixture = await documentFixture(page);
  const saved = structuredClone(fixture.control.current);
  await enterEditor(page);
  await button(page, "Load saved newsletters").click();
  await expect(button(page, `Review ${saved.name}`)).toBeVisible();
  expect(fixture.calls("detail")).toEqual([]);
  await button(page, `Review ${saved.name}`).click();
  await expect(
    page.getByRole("region", { name: "Review current saved newsletter" }),
  ).toBeVisible();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Untitled newsletter",
  );
  await expect(button(page, "Save newsletter")).toBeDisabled();
  await button(page, "Adopt saved document and replace local draft").click();
  await page.getByLabel("Newsletter name").fill("Full replacement name");
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Full replacement subject");
  await button(page, "Save newsletter").click();
  await expect(
    page.getByRole("heading", { name: "This request saved revision 5" }),
  ).toBeVisible();
  expect(fixture.calls("save")).toEqual([
    {
      operation: "save",
      method: "PATCH",
      input: {
        params: { id: saved.id },
        body: {
          requestId: expect.any(String),
          revision: saved.revision,
          name: "Full replacement name",
          config: { ...saved.config, subject: "Full replacement subject" },
          design: saved.design,
        },
      },
    },
  ]);
  await button(page, "Read current saved document").click();
  await button(page, "Adopt saved document and replace local draft").click();
  await expect(button(page, "Undo")).toBeDisabled();
  expectIsolated(fixture);
});

test("rich saved preview excludes local edits and sanitizes active HTML without remote requests", async ({
  page,
}) => {
  const fixture = await documentFixture(page);
  await enterEditor(page);
  const historyLength = await page.evaluate(() => history.length);
  await adoptDocument(page);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Unsaved private subject");
  fixture.queue("preview", (route) =>
    route.fulfill({
      json: {
        documentId,
        revision: 4,
        renderHash: "a".repeat(64),
        hashFormat: "newsletter-render-json-v1",
        html: '<html><head><style>body{color:rgb(12,34,56)}@import url("https://example.test/track.css");</style></head><body><h1>Saved owner heading</h1><script>parent.alert("unsafe")</script><form action="https://example.test/post"><input name="secret"></form><iframe src="https://example.test/frame"></iframe><img src="https://example.test/pixel" alt="Hidden image"><a href="https://example.test/link">Safe link text</a></body></html>',
        plainText: "Saved owner plain text",
        checks: [],
      },
    }),
  );
  await button(page, "Preview saved state").click();
  const frame = page.frameLocator('iframe[title="Saved newsletter preview"]');
  await expect(
    frame.getByRole("heading", { name: "Saved owner heading" }),
  ).toBeVisible();
  await expect(
    frame.locator("script,form,input,iframe,a[href],img[src^='https://']"),
  ).toHaveCount(0);
  await expect(
    frame.getByText("Safe link text", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('iframe[title="Saved newsletter preview"]'),
  ).toHaveAttribute("sandbox", "");
  await expect(
    page.locator('iframe[title="Saved newsletter preview"]'),
  ).toHaveAttribute("referrerpolicy", "no-referrer");
  await expect(
    page.getByRole("region", { name: "Saved newsletter preview" }),
  ).toContainText("Saved revision 4");
  await expect(
    frame.locator('meta[http-equiv="Content-Security-Policy"]'),
  ).toHaveAttribute("content", /default-src 'none'/);
  await page.getByText("Saved plain text", { exact: true }).click();
  await expect(
    page.getByText("Saved owner plain text", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  fixture.queue("preview", (route) =>
    route.fulfill({
      json: {
        documentId,
        revision: 4,
        renderHash: "b".repeat(64),
        hashFormat: "newsletter-render-json-v1",
        html: "<h1>Next saved owner heading</h1>",
        plainText: "Next saved plain text",
        checks: [],
      },
    }),
  );
  await button(page, "Back to editor").click();
  await button(page, "Preview saved state").click();
  await expect(
    frame.getByRole("heading", { name: "Next saved owner heading" }),
  ).toBeVisible();
  await expect(
    frame.getByRole("heading", { name: "Saved owner heading", exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  expect(fixture.calls("preview")).toEqual([
    {
      operation: "preview",
      method: "POST",
      input: { params: { id: documentId }, body: { liveMergeTags: false } },
    },
    {
      operation: "preview",
      method: "POST",
      input: { params: { id: documentId }, body: { liveMergeTags: false } },
    },
  ]);
  expect(fixture.calls("save")).toEqual([]);
  await button(page, "Back to editor").click();
  await expect(button(page, "Stage newsletter")).toBeDisabled();
  expectIsolated(fixture);
});
