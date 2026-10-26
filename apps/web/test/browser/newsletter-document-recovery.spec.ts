import { test, expect } from "@playwright/test";
import {
  documentFixture,
  documentId,
  stageId,
  editorUrl,
  button,
  enterEditor,
  adoptDocument,
  expectIsolated,
  heldResponse,
} from "./newsletter-document-fixtures";

const stageReceipt = {
  id: stageId,
  documentId,
  revision: 4,
  name: "Synthetic recovered stage",
  createdAt: "2026-10-13T02:00:00.000Z",
  route: `/engagement/outreach?newsletterStage=${stageId}`,
};

test("WS15 exact stage recovery keeps null and denied attempts fenced before finding an older revision", async ({
  page,
}, info) => {
  const fixture = await documentFixture(page);
  await enterEditor(page);
  await adoptDocument(page);
  fixture.queue("stage", (route) => route.abort("connectionreset"));
  await button(page, "Stage newsletter").click();
  await expect(page.getByText(/Staging could not be confirmed/)).toBeVisible();
  await page.screenshot({
    path: info.outputPath("rich-unknown-stage.png"),
    fullPage: true,
  });
  expect(fixture.calls("stagedRevision")).toEqual([]);
  fixture.queue("stagedRevision", (route) =>
    route.fulfill({ body: "null", contentType: "application/json" }),
  );
  await button(page, "Check stage for revision 4").click();
  await expect(
    page.getByText(/No stage was returned for revision 4/),
  ).toBeVisible();
  await expect(button(page, "Stage newsletter")).toBeDisabled();
  fixture.queue("stagedRevision", (route) =>
    route.fulfill({ status: 403, json: { message: "Synthetic denial" } }),
  );
  await button(page, "Check stage for revision 4").click();
  await expect(page.getByText(/Stage lookup failed/)).toBeVisible();
  await expect(button(page, "Save newsletter")).toBeDisabled();
  fixture.control.current = {
    ...fixture.control.current,
    revision: 7,
    name: "Newer baseline",
  };
  await button(page, "Read current saved document").click();
  await button(page, "Adopt saved document and replace local draft").click();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Newer baseline",
  );
  fixture.queue("stagedRevision", (route) =>
    route.fulfill({ json: stageReceipt }),
  );
  await button(page, "Check stage for revision 4").click();
  await expect(
    page.getByRole("heading", { name: /Saved revision \d+ staged/ }),
  ).toContainText("Saved revision 4 staged");
  await page.screenshot({
    path: info.outputPath("rich-confirmed-stage.png"),
    fullPage: true,
  });
  await expect(page.getByText(/Current saved baseline:/)).toContainText(
    "revision 7.",
  );
  await expect(button(page, "Check stage for revision 4")).toHaveCount(0);
  expect(fixture.calls("stagedRevision")).toEqual(
    Array.from({ length: 3 }, () => ({
      operation: "stagedRevision",
      method: "GET",
      input: { params: { id: documentId, revision: 4 } },
    })),
  );
  expect(fixture.calls("stage")).toHaveLength(1);
  expect(fixture.calls("save")).toEqual([]);
  await expect(page.locator(`a[href*="${stageId}"]`)).toHaveCount(0);
  await expect(page).toHaveURL(editorUrl);
  expectIsolated(fixture);
});

test("WS15 preview refuses a newer saved revision without adopting or displaying its content", async ({
  page,
}) => {
  const fixture = await documentFixture(page);
  await enterEditor(page);
  await adoptDocument(page);
  await page.getByLabel("Newsletter name").fill("Local retained name");
  fixture.queue("preview", (route) =>
    route.fulfill({
      json: {
        documentId,
        revision: 5,
        renderHash: "a".repeat(64),
        hashFormat: "newsletter-render-json-v1",
        html: "<h1>Wrong saved revision</h1>",
        plainText: "Wrong saved revision",
        checks: [],
      },
    }),
  );
  await button(page, "Preview saved state").click();
  await expect(page.getByText(/The current read failed/)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Saved newsletter preview" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Local retained name",
  );
  await expect(page.getByText(/Previous saved baseline/)).toContainText(
    "revision 4.",
  );
  await expect(button(page, "Save newsletter")).toBeDisabled();
  expect(fixture.calls("preview")).toHaveLength(1);
  expect(fixture.calls("save")).toEqual([]);
  expectIsolated(fixture);
});

test("WS15 held stage lookup cannot restore a receipt after session replacement", async ({
  page,
}) => {
  const fixture = await documentFixture(page);
  await enterEditor(page);
  await adoptDocument(page);
  fixture.queue("stage", (route) => route.abort("connectionreset"));
  await button(page, "Stage newsletter").click();
  await expect(page.getByText(/Staging could not be confirmed/)).toBeVisible();
  const held = heldResponse();
  fixture.queue("stagedRevision", async (route) => {
    await held.wait;
    await route.fulfill({ json: stageReceipt });
    held.finished();
  });
  await button(page, "Check stage for revision 4").click();
  await expect(
    page.getByText("Stage lookup in progress…", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => fixture.calls("stagedRevision").length).toBe(1);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { orgId: "new-org", sessionId: "new-session" },
      }),
    ),
  );
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Untitled newsletter",
  );
  held.release();
  await held.settled;
  await page.getByLabel("Newsletter name").fill("New scope draft");
  await expect(
    page.getByRole("heading", { name: /Saved revision \d+ staged/ }),
  ).toHaveCount(0);
  await expect(button(page, "Check stage for revision 4")).toHaveCount(0);
  await expect(button(page, "Create saved document")).toBeEnabled();
  expect(fixture.calls("stage")).toHaveLength(1);
  expect(fixture.calls("stagedRevision")).toHaveLength(1);
  expectIsolated(fixture);
});
