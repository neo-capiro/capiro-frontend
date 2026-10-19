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
} from "./newsletter-document-fixtures";

test("rich document create is explicit, preserves local content and stages only a confirmed full save", async ({
  page,
}) => {
  const fixture = await documentFixture(page);
  await enterEditor(page);
  await page.getByLabel("Newsletter name").fill("Local creation name");
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Local creation subject");
  expect(fixture.requests).toEqual([]);
  await expect(button(page, "Save newsletter")).toBeDisabled();
  await button(page, "Create saved document").click();
  await expect(
    page.getByText(
      "Saved document created. Save your local content into its revision before staging.",
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
      input: { body: { name: "Local creation name" } },
    },
  ]);
  expect(fixture.calls("save")).toEqual([]);
  await expect(button(page, "Stage newsletter")).toBeDisabled();
  await button(page, "Save newsletter").click();
  await expect(
    page.getByText("Saved revision 5.", { exact: true }),
  ).toBeVisible();
  const save = fixture.calls("save")[0]!;
  expect(save.method).toBe("PATCH");
  expect(save.input).toMatchObject({
    params: { id: documentId },
    body: {
      revision: 4,
      name: "Local creation name",
      config: { subject: "Local creation subject" },
    },
  });
  expect(Object.keys((save.input as { body: object }).body).sort()).toEqual([
    "config",
    "design",
    "name",
    "revision",
  ]);
  await button(page, "Stage newsletter").click();
  await expect(
    page.getByText(
      `Stage ${stageId} received for document ${documentId}, revision 5.`,
    ),
  ).toBeVisible();
  expect(fixture.calls("stage")).toEqual([
    {
      operation: "stage",
      method: "POST",
      input: { params: { id: documentId }, body: { revision: 5 } },
    },
  ]);
  await expect(button(page, "Stage newsletter")).toBeDisabled();
  await expect(page).toHaveURL(editorUrl);
  await expect(page.locator(`a[href*="${stageId}"]`)).toHaveCount(0);
  expectIsolated(fixture);
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
    page.getByText("Saved revision 5.", { exact: true }),
  ).toBeVisible();
  expect(fixture.calls("save")).toEqual([
    {
      operation: "save",
      method: "PATCH",
      input: {
        params: { id: saved.id },
        body: {
          revision: saved.revision,
          name: "Full replacement name",
          config: { ...saved.config, subject: "Full replacement subject" },
          design: saved.design,
        },
      },
    },
  ]);
  await expect(button(page, "Undo")).toBeDisabled();
  expectIsolated(fixture);
});

for (const status of [409, 503]) {
  test(`rich save ${status} retains edits until deliberate owner review and full rebase`, async ({
    page,
  }) => {
    const fixture = await documentFixture(page);
    await enterEditor(page);
    await adoptDocument(page);
    const saved = structuredClone(fixture.control.current);
    await page.getByLabel("Newsletter name").fill("Retained local name");
    await page
      .getByLabel("Subject", { exact: true })
      .fill("Retained local subject");
    fixture.queue("save", (route) =>
      route.fulfill({ status, json: { message: "Synthetic save refusal" } }),
    );
    await button(page, "Save newsletter").click();
    await expect(
      page.getByText(
        status === 409
          ? /The saved revision changed/
          : /Save could not be confirmed and will not be repeated/,
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Newsletter name")).toHaveValue(
      "Retained local name",
    );
    await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
      "Retained local subject",
    );
    await expect(button(page, "Save newsletter")).toBeDisabled();
    await expect(button(page, "Stage newsletter")).toBeDisabled();
    await page
      .getByLabel("Subject", { exact: true })
      .fill("Continued local edit");
    fixture.control.current = {
      ...saved,
      revision: 6,
      name: "Changed owner document",
      config: { ...saved.config, subject: "Changed owner subject" },
    };
    await button(page, "Read current saved document").click();
    await expect(
      page.getByRole("region", { name: "Review current saved newsletter" }),
    ).toContainText("Changed owner document");
    await expect(page.getByLabel("Newsletter name")).toHaveValue(
      "Retained local name",
    );
    await expect(button(page, "Save newsletter")).toBeDisabled();
    expect(fixture.calls("save")).toHaveLength(1);
    await button(page, "Rebase local draft onto reviewed revision").click();
    await expect(
      page.getByText(/Local edits retained against the reviewed revision/),
    ).toBeVisible();
    await button(page, "Save newsletter").click();
    await expect(
      page.getByText("Saved revision 7.", { exact: true }),
    ).toBeVisible();
    expect(fixture.calls("save")).toHaveLength(2);
    expect(fixture.calls("save")[1]!.input).toEqual({
      params: { id: saved.id },
      body: {
        revision: 6,
        name: "Retained local name",
        config: { ...saved.config, subject: "Continued local edit" },
        design: saved.design,
      },
    });
    expectIsolated(fixture);
  });
}

test("rich explicit adoption replaces uncertain local edits without attributing the owner state", async ({
  page,
}) => {
  const fixture = await documentFixture(page);
  await enterEditor(page);
  await adoptDocument(page);
  await page.getByLabel("Newsletter name").fill("Discarded local edits");
  fixture.queue("save", (route) => route.abort("connectionreset"));
  await button(page, "Save newsletter").click();
  await expect(
    page.getByText(/Save could not be confirmed and will not be repeated/),
  ).toBeVisible();
  fixture.control.current = {
    ...fixture.control.current,
    revision: 6,
    name: "Reviewed owner name",
  };
  await button(page, "Read current saved document").click();
  await expect(
    page.getByRole("region", { name: "Review current saved newsletter" }),
  ).toBeVisible();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Discarded local edits",
  );
  await button(page, "Adopt saved document and replace local draft").click();
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Reviewed owner name",
  );
  await expect(
    page.getByText(
      "Using the reviewed saved document. This does not confirm a previous uncertain attempt.",
    ),
  ).toBeVisible();
  await expect(button(page, "Undo")).toBeDisabled();
  expect(fixture.calls("save")).toHaveLength(1);
  expectIsolated(fixture);
});

test("rich saved preview excludes local edits and sanitizes active HTML without remote requests", async ({
  page,
}) => {
  const fixture = await documentFixture(page);
  await enterEditor(page);
  await adoptDocument(page);
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Unsaved private subject");
  fixture.queue("preview", (route) =>
    route.fulfill({
      json: {
        html: '<html><head><style>body{color:rgb(12,34,56)}@import url("https://example.test/track.css");</style></head><body><h1>Saved owner heading</h1><script>parent.alert("unsafe")</script><form action="https://example.test/post"><input name="secret"></form><iframe src="https://example.test/frame"></iframe><img src="https://example.test/pixel" alt="Hidden image"><a href="https://example.test/link">Safe link text</a></body></html>',
        plainText: "Saved owner plain text",
        checks: [],
      },
    }),
  );
  await button(page, "Preview saved state").click();
  const frame = page.frameLocator(
    'iframe[title="Saved newsletter preview"]',
  );
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
    frame.locator('meta[http-equiv="Content-Security-Policy"]'),
  ).toHaveAttribute("content", /default-src 'none'/);
  await page.getByText("Saved plain text", { exact: true }).click();
  await expect(
    page.getByText("Saved owner plain text", { exact: true }),
  ).toBeVisible();
  expect(fixture.calls("preview")).toEqual([
    {
      operation: "preview",
      method: "POST",
      input: { params: { id: documentId }, body: { liveMergeTags: false } },
    },
  ]);
  expect(fixture.calls("save")).toEqual([]);
  await expect(button(page, "Stage newsletter")).toBeDisabled();
  expectIsolated(fixture);
});
