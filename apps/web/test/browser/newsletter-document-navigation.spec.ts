import { test, expect } from "@playwright/test";
import {
  documentFixture,
  documentId,
  stageId,
  editorUrl,
  button,
  enterEditor,
  adoptDocument,
  closeAndReopen,
  heldResponse,
  expectIsolated,
  clientId,
  otherClientId,
  navigate,
} from "./newsletter-document-fixtures";

test("rich pending create remains fenced after history close/reopen and an empty library", async ({
  page,
}) => {
  const fixture = await documentFixture(page);
  await page.goto("/modules/workspace");
  await button(page, "Workspace tools").click();
  await page.getByRole("menuitem", { name: "Rich newsletter preview" }).click();
  await page.getByLabel("Newsletter name").fill("Private creation draft");
  const held = heldResponse();
  fixture.queue("create", async (route) => {
    await held.wait;
    await route.fulfill({
      status: 503,
      json: { message: "Lost create receipt" },
    });
    held.finished();
  });
  await button(page, "Create saved document").click();
  await expect(
    page.getByText("create in progress…", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => fixture.calls("create").length).toBe(1);
  await expect(page.getByLabel("Newsletter name")).toBeDisabled();
  await expect(button(page, "Close preview")).toBeDisabled();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Workspace", exact: true }),
  ).toBeVisible();
  held.release();
  await held.settled;
  await page.goForward();
  await expect(page).toHaveURL(editorUrl);
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Untitled newsletter",
  );
  await expect(button(page, "Create saved document")).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Request not confirmed" }),
  ).toBeVisible();
  fixture.control.items = [];
  await button(page, "Load saved newsletters").click();
  await expect(page.getByText(/No documents were returned/)).toBeVisible();
  await expect(button(page, "Create saved document")).toBeDisabled();
  fixture.control.items = undefined;
  await button(page, "Load saved newsletters").click();
  await button(page, "Review Synthetic saved newsletter").click();
  await expect(
    button(page, "Adopt saved document and replace local draft"),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Request not confirmed" }),
  ).toBeVisible();
  await closeAndReopen(page);
  await expect(button(page, "Create saved document")).toBeDisabled();
  expect(fixture.calls("create")).toHaveLength(1);
  expect(fixture.calls("save")).toEqual([]);
  expectIsolated(fixture);
});

for (const status of [200, 503]) {
  test(`rich pending stage stays fenced across history navigation and late ${status}`, async ({
    page,
  }) => {
    const fixture = await documentFixture(page);
    await page.goto("/modules/workspace");
    await button(page, "Workspace tools").click();
    await page
      .getByRole("menuitem", { name: "Rich newsletter preview" })
      .click();
    await adoptDocument(page);
    const held = heldResponse();
    fixture.queue("stage", async (route) => {
      await held.wait;
      await route.fulfill({
        status,
        json:
          status === 200
            ? {
                id: stageId,
                documentId,
                revision: 4,
                name: "Late stage",
                createdAt: "2026-10-13T02:00:00.000Z",
                route: `/engagement/outreach?newsletterStage=${stageId}`,
              }
            : { message: "Lost stage receipt" },
      });
      held.finished();
    });
    await button(page, "Stage newsletter").click();
    await expect(
      page.getByText("stage in progress…", { exact: true }),
    ).toBeVisible();
    await expect.poll(() => fixture.calls("stage").length).toBe(1);
    await page.goBack();
    await expect(
      page.getByRole("heading", { name: "Workspace", exact: true }),
    ).toBeVisible();
    held.release();
    await held.settled;
    await page.goForward();
    await expect(page).toHaveURL(editorUrl);
    fixture.control.current = {
      ...fixture.control.current,
      id: documentId.toUpperCase(),
    };
    await adoptDocument(page);
    await expect(button(page, "Stage newsletter")).toBeDisabled();
    await expect(
      page.getByText(/Staging could not be confirmed for revision/),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Saved revision \d+ staged/ }),
    ).toHaveCount(0);
    await expect(page.locator(`a[href*="${stageId}"]`)).toHaveCount(0);
    expect(fixture.calls("stage")).toHaveLength(1);
    await expect(page).toHaveURL(editorUrl);
    expectIsolated(fixture);
  });
}

for (const replacement of ["client", "session"] as const) {
  test(`rich held save cannot restore prior private material after ${replacement} replacement`, async ({
    page,
  }) => {
    const fixture = await documentFixture(page);
    await enterEditor(page, `${editorUrl}&clientId=${clientId}`);
    await adoptDocument(page);
    await page.getByLabel("Newsletter name").fill("Private old scope draft");
    const held = heldResponse();
    fixture.queue("save", async (route) => {
      const submitted = route.request().postDataJSON().body;
      await held.wait;
      await route.fulfill({
        json: {
          requestId: submitted.requestId,
          operation: "save",
          documentId,
          previousRevision: 4,
          revision: 5,
          inputHash: "a".repeat(64),
          contentHash: "b".repeat(64),
          hashFormat: "newsletter-write-jcs-v1",
          createdAt: "2026-10-13T02:00:00.000Z",
        },
      });
      held.finished();
    });
    await button(page, "Save newsletter").click();
    await expect(
      page.getByText("save in progress…", { exact: true }),
    ).toBeVisible();
    await expect.poll(() => fixture.calls("save").length).toBe(1);
    await expect(page.getByLabel("Newsletter name")).toBeDisabled();
    if (replacement === "client")
      await navigate(page, `${editorUrl}&clientId=${otherClientId}`);
    else
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
    await expect(button(page, "Create saved document"))[
      replacement === "client" ? "toBeEnabled" : "toBeDisabled"
    ]();
    held.release();
    await held.settled;
    if (replacement === "client") {
      await page.getByLabel("Newsletter name").fill("New scope local draft");
      await expect(page.getByLabel("Newsletter name")).toHaveValue(
        "New scope local draft",
      );
    } else
      await expect(
        page.getByRole("heading", { name: "Request not confirmed" }),
      ).toBeVisible();
    await expect(
      page.getByText("Saved revision 5.", { exact: true }),
    ).toHaveCount(0);
    await expect(button(page, "Save newsletter")).toBeDisabled();
    await expect(page.getByText(/Current saved baseline/)).toHaveCount(0);
    expect(fixture.calls("save")).toHaveLength(1);
    expect(fixture.calls("detail")).toHaveLength(1);
    expectIsolated(fixture);
  });
}
