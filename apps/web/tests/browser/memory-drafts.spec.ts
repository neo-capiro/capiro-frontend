import { test, expect } from "@playwright/test";
import { draftReview } from "../memory-draft-fixture";
import { serve, edit } from "./memory-drafts-fixture";
test("save and submit stay separate, preserve published content and open the exact shared review", async ({
  page,
}) => {
  const owner = await serve(page);
  await page.goto("/memory-drafts.html");
  await edit(page);
  await expect(
    page.getByRole("button", { name: "Submit saved draft for review" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Engine signal", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Saved revision 1", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Published memory")).toContainText(
    "Published mission",
  );
  await expect(page.getByLabel("Published memory")).not.toContainText(
    "Private draft text",
  );
  await page
    .getByRole("button", { name: "Submit saved draft for review" })
    .click();
  await expect(
    page.getByRole("link", { name: /Open this review/ }),
  ).toHaveAttribute("href", "/meri/memory/review/" + draftReview);
  await expect(
    page.getByText("This does not publish memory.", { exact: false }),
  ).toBeVisible();
  expect(owner.counts()).toEqual({ saves: 1, submissions: 1 });
});
test("lost save acknowledgement survives reload and recovers without a second write or stored content", async ({
  page,
}) => {
  const owner = await serve(page);
  owner.control.loseSave = true;
  await page.goto("/memory-drafts.html");
  await edit(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.stringify(Object.values(sessionStorage)),
  );
  expect(stored).not.toContain("Private draft text");
  expect(stored).not.toContain("sections");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Create private draft", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByRole("textbox", { name: "Mission & mandate", exact: true }),
  ).toHaveValue("Private draft text");
  await expect(
    page.getByRole("button", { name: "Submit saved draft for review" }),
  ).toBeEnabled();
  expect(owner.counts()).toEqual({ saves: 1, submissions: 0 });
});
test("canceling edits and discarding a saved draft leave published memory unchanged", async ({
  page,
}) => {
  const owner = await serve(page);
  await page.goto("/memory-drafts.html");
  await edit(page);
  await page.getByRole("button", { name: "Close editor", exact: true }).click();
  expect(owner.counts()).toEqual({ saves: 0, submissions: 0 });
  await edit(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Discard saved draft", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Discard saved draft", exact: true })
    .click();
  await expect(
    page.getByText("Private draft discarded. Active memory is unchanged.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Published memory")).toContainText(
    "Published mission",
  );
  await expect(page.getByLabel("Published memory")).not.toContainText(
    "Private draft text",
  );
  expect(owner.draft()?.state).toBe("discarded");
  expect(owner.counts()).toEqual({ saves: 2, submissions: 0 });
});
test("lost submission is recovered by its receipt and never submitted again", async ({
  page,
}) => {
  const owner = await serve(page);
  await page.goto("/memory-drafts.html");
  await edit(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Submit saved draft for review" }),
  ).toBeEnabled();
  owner.control.loseSubmit = true;
  await page
    .getByRole("button", { name: "Submit saved draft for review" })
    .click();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByRole("link", { name: /Open this review/ }),
  ).toHaveAttribute("href", "/meri/memory/review/" + draftReview);
  expect(owner.counts()).toEqual({ saves: 1, submissions: 1 });
});
test("refused review keeps the saved draft and stale bases block submission", async ({
  page,
}) => {
  const owner = await serve(page);
  owner.control.refuseSubmit = true;
  await page.goto("/memory-drafts.html");
  await edit(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Submit saved draft for review" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Submit saved draft for review" })
    .click();
  await expect(
    page.getByText("Draft change refused", { exact: true }),
  ).toBeVisible();
  expect(owner.draft()?.state).toBe("draft");
  owner.control.stale = true;
  await page.getByRole("button", { name: "Discard unsaved changes" }).click();
  await expect(
    page.getByText("Published memory changed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit saved draft for review" }),
  ).toBeDisabled();
});
test("preview blocks writes and an expired session removes the editor", async ({
  page,
}) => {
  const owner = await serve(page);
  await page.goto("/memory-drafts.html?read-only");
  await expect(
    page.getByRole("button", { name: "Create private draft", exact: true }),
  ).toBeDisabled();
  await page.goto("/memory-drafts.html");
  await edit(page);
  owner.control.expire = true;
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible();
  await expect(page.getByLabel("Private draft editor")).toHaveCount(0);
  expect(owner.counts()).toEqual({ saves: 0, submissions: 0 });
});
