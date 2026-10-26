import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { reviewPage, reviewUrl } from "./newsletter-review-fixtures";
import {
  button,
  heldResponse,
  navigate,
  otherClientId,
  enterEditor,
  adoptDocument,
  expectIsolated,
} from "./newsletter-document-fixtures";
import {
  reviewFixture,
  reviewId,
  otherReviewId,
} from "../../tests/newsletter-review-fixtures";
import {
  auditPresentation,
  capturePresentation,
  contained,
} from "./ordinary-presentation-evidence";

for (const role of ["viewer", "commenter", "owner", "editor"]) {
  test(`known-ID ${role} entry is deliberate and reads no editor list`, async ({
    page,
  }) => {
    const fixture = await reviewPage(page, role);
    await page.goto(reviewUrl());
    await expect(button(page, "Open review")).toBeVisible();
    expect(fixture.reads).toEqual([]);
    await button(page, "Open review").click();
    await expect(
      page.getByText(`Your role: ${role[0]!.toUpperCase()}${role.slice(1)}`),
    ).toBeVisible();
    expect(fixture.reads).toEqual([
      { operation: "review", input: { params: { id: reviewId } } },
    ]);
    expect(fixture.calls("list")).toHaveLength(0);
    await expect(button(page, "Edit newsletter")).toHaveCount(
      role === "viewer" || role === "commenter" ? 0 : 1,
    );
    await expect(button(page, "Save newsletter")).toHaveCount(0);
    expectIsolated(fixture);
  });
}

test("saved HTML stays inert while plaintext comments and Figma layout remain usable at both widths", async ({
  page,
}, info) => {
  const fixture = await reviewPage(page);
  fixture.review.html =
    '<html><body><h1>Saved content only</h1><script>parent.alert("bad")</script><form><input value="bad"></form><a href="https://example.test/">No live link</a><img src="https://example.test/track.png" alt="External image"><p>Saved paragraph.</p></body></html>';
  fixture.review.comments[0]!.message =
    '<script>alert("plain text")</script> ' + "LongSyntheticWord".repeat(8);
  fixture.review.comments.push({
    ...fixture.review.comments[0]!,
    id: otherReviewId,
    resolved: true,
    message: "Resolved synthetic note",
  });
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  const scope = page.locator('[data-design-node="1176:299839"]');
  const comments = page.getByRole("complementary", {
    name: "Saved newsletter comments",
  });
  await expect(comments).toContainText("2 shown of 2 loaded comments");
  await expect(comments).toContainText('<script>alert("plain text")</script>');
  const frame = page.frameLocator("iframe");
  await expect(
    frame.getByRole("heading", { name: "Saved content only" }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveAttribute("sandbox", "");
  await expect(page.locator("iframe")).toHaveAttribute(
    "referrerpolicy",
    "no-referrer",
  );
  await expect(
    frame.locator("script,form,input,a[href],img[src^=http]"),
  ).toHaveCount(0);
  expect((await comments.boundingBox())!.width).toBe(354);
  await expect(scope.locator("[tabindex='-1']")).toBeFocused();
  await capturePresentation(page, info, "newsletter-review-desktop", scope);
  await auditPresentation(
    page,
    info,
    "newsletter-review-desktop",
    '[data-design-node="1176:299839"]',
  );
  await button(page, "Mobile").click();
  expect(
    (await page.locator("iframe").boundingBox())!.width,
  ).toBeLessThanOrEqual(360);
  await capturePresentation(
    page,
    info,
    "newsletter-review-mobile-preview",
    scope,
  );
  await button(page, "Resolved").click();
  await expect(comments).toContainText("1 shown of 2 loaded comments");
  await button(page, "All").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await contained(page, scope);
  await contained(page, comments);
  await capturePresentation(page, info, "newsletter-review-narrow", scope);
  await auditPresentation(
    page,
    info,
    "newsletter-review-narrow",
    '[data-design-node="1176:299839"]',
  );
  expect(fixture.reads).toHaveLength(1);
  expectIsolated(fixture);
});

test("comment refresh distinguishes failed and empty reads; current access refusal clears all private content", async ({
  page,
}) => {
  const fixture = await reviewPage(page);
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await expect(page.getByText("Your role: Viewer")).toBeVisible();
  fixture.queueRead("comments", (route) =>
    route.fulfill({ status: 500, json: { message: "Synthetic failure" } }),
  );
  await button(page, "Refresh comments").click();
  await expect(page.getByRole("alert")).toHaveText(
    "Comments could not be loaded.",
  );
  await expect(page.getByText("No comments in this loaded view.")).toHaveCount(
    0,
  );
  await expect(page.locator("iframe")).toHaveCount(1);
  fixture.queueRead("comments", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await button(page, "Refresh comments").click();
  await expect(
    page.getByText("No comments in this loaded view."),
  ).toBeVisible();
  fixture.queueRead("comments", (route) =>
    route.fulfill({
      status: 403,
      json: { message: "Synthetic revoked access" },
    }),
  );
  await button(page, "Refresh comments").click();
  await expect(
    page.getByRole("heading", { name: "Review unavailable" }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(
    page.getByText("Synthetic saved newsletter", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Your role: Viewer")).toHaveCount(0);
});

test("a cross-document response is unavailable and does not enter the editor", async ({
  page,
}) => {
  const fixture = await reviewPage(page, "owner");
  fixture.queueRead("review", (route) =>
    route.fulfill({ json: { ...reviewFixture("owner"), id: otherReviewId } }),
  );
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await expect(
    page.getByRole("heading", { name: "Review unavailable" }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(button(page, "Edit newsletter")).toHaveCount(0);
});

test("target and client replacement dispose late reads and require a new deliberate open", async ({
  page,
}) => {
  const fixture = await reviewPage(page, "owner");
  const held = heldResponse();
  fixture.queueRead("review", async (route) => {
    await held.wait;
    await route.fulfill({ json: fixture.review }).catch(() => {});
    held.finished();
  });
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await expect.poll(() => fixture.reads.length).toBe(1);
  await navigate(page, reviewUrl(otherReviewId));
  await expect(button(page, "Open review")).toBeVisible();
  held.release();
  await held.settled;
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(fixture.reads).toHaveLength(1);
  await navigate(page, reviewUrl());
  await button(page, "Open review").click();
  await expect(page.getByText("Your role: Owner")).toBeVisible();
  await navigate(page, `${reviewUrl()}&clientId=${otherClientId}`);
  await expect(button(page, "Open review")).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(fixture.reads).toHaveLength(2);
});

test("session replacement clears loaded private review and its opened intent", async ({
  page,
}) => {
  await reviewPage(page);
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await expect(page.getByText("Your role: Viewer")).toBeVisible();
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: null, sessionId: null, orgId: null },
      }),
    ),
  );
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(
    page.getByText("Synthetic saved newsletter", { exact: true }),
  ).toHaveCount(0);
});

test("known-ID Edit rechecks actual detail and waits for explicit adoption", async ({
  page,
}) => {
  const fixture = await reviewPage(page, "editor");
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await button(page, "Edit newsletter").click();
  await expect(
    page.getByRole("region", { name: "Review current saved newsletter" }),
  ).toBeVisible();
  expect(fixture.calls("list")).toHaveLength(0);
  expect(fixture.calls("detail")).toHaveLength(1);
  await expect(page.getByLabel("Subject", { exact: true })).toHaveCount(0);
  await button(page, "Adopt saved document and replace local draft").click();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Saved subject",
  );
  expect(fixture.calls("save")).toHaveLength(0);
});

test("a fresh role downgrade removes Edit and a denied editable read releases no draft", async ({
  page,
}) => {
  const fixture = await reviewPage(page, "owner");
  await page.goto(reviewUrl());
  await button(page, "Open review").click();
  await expect(button(page, "Edit newsletter")).toBeVisible();
  fixture.review.role = "commenter";
  await button(page, "Refresh review").click();
  await expect(page.getByText("Your role: Commenter")).toBeVisible();
  await expect(button(page, "Edit newsletter")).toHaveCount(0);
  fixture.review.role = "editor";
  await button(page, "Refresh review").click();
  fixture.queue("detail", (route) =>
    route.fulfill({ status: 403, json: { message: "Editing access revoked" } }),
  );
  await button(page, "Edit newsletter").click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Review current saved newsletter" }),
  ).toHaveCount(0);
  expect(fixture.calls("save")).toHaveLength(0);
});

test("builder Comments preserves unsaved draft and undo; Edit returns through fresh detail", async ({
  page,
}) => {
  const fixture = await reviewPage(page, "owner");
  await enterEditor(page);
  await adoptDocument(page);
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Unsaved review return");
  await button(page, "Comments").click();
  await button(page, "Open review").click();
  await expect(page.getByText("Your role: Owner")).toBeVisible();
  const before = fixture.calls("detail").length;
  await button(page, "Edit newsletter").click();
  await expect(button(page, "Comments")).toBeFocused();
  await expect(
    page.getByRole("region", { name: "Review current saved newsletter" }),
  ).toBeVisible();
  expect(fixture.calls("detail")).toHaveLength(before + 1);
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Unsaved review return",
  );
  await expect(button(page, "Undo")).toBeEnabled();
  expect(fixture.calls("save")).toHaveLength(0);
});
