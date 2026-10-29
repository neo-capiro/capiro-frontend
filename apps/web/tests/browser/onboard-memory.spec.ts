import { test, expect } from "@playwright/test";
import { draftReview } from "../memory-draft-fixture";
import { serve, edit } from "./memory-drafts-fixture";

test("onboarding saves and submits through the shared editor without completing unpublished files", async ({
  page,
}) => {
  const owner = await serve(page);
  owner.files.get("firm-compass")!.baseItemId = null;
  owner.files.get("firm-compass")!.baseVersion = null;
  owner.files.get("firm-compass")!.sections = [];
  await page.goto("/onboard-memory.html");
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeDisabled();
  await edit(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Submit saved draft for review" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Submit saved draft for review" })
    .click();
  await expect(
    page.getByRole("link", { name: /Open this review/ }),
  ).toHaveAttribute("href", "/meri/memory/review/" + draftReview);
  await expect(page.getByLabel("Firm file publication")).toContainText(
    "Firm Compass: Needs published content",
  );
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Firm memory file", exact: true })
    .selectOption("Firm Compass");
  await expect(page.getByLabel("Published memory")).toContainText(
    "firm-compass",
  );
  expect(owner.counts()).toEqual({ saves: 1, submissions: 1 });
});

test("onboarding recovers a lost private save after reload without a second write", async ({
  page,
}) => {
  const owner = await serve(page);
  owner.control.loseSave = true;
  await page.goto("/onboard-memory.html");
  await edit(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByRole("textbox", { name: "Mission & mandate", exact: true }),
  ).toHaveValue("Private draft text");
  expect(owner.counts()).toEqual({ saves: 1, submissions: 0 });
});

test("completion requires fresh published content in all three files", async ({
  page,
}) => {
  const owner = await serve(page);
  await page.goto("/onboard-memory.html");
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeEnabled();
  owner.files.get("playbook")!.sections = [];
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByText(
      "All three firm files need published content. Refresh after review is complete.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeDisabled();
  owner.files.get("playbook")!.sections = [
    {
      key: "mission",
      heading: "Mission",
      body: "New published content",
      owner: "human",
    },
  ];
  await page.getByRole("button", { name: "Refresh published files" }).click();
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByText("Setup completed", { exact: true }),
  ).toBeVisible();
  expect(owner.counts()).toEqual({ saves: 0, submissions: 0 });
});

for (const field of ["type", "slug", "scope"] as const) {
  test(
    "a mismatched " + field + " cannot complete onboarding",
    async ({ page }) => {
      const owner = await serve(page);
      owner.control.fileResponse = (file) => ({
        ...file,
        [field]: field === "scope" ? "client" : "different",
      });
      await page.goto("/onboard-memory.html");
      await expect(page.getByLabel("Firm file publication")).not.toContainText(
        "Checking",
      );
      await expect(
        page.getByRole("button", { name: "Done", exact: true }),
      ).toBeDisabled();
    },
  );
}

test("a newly unavailable file blocks completion", async ({ page }) => {
  const owner = await serve(page);
  await page.goto("/onboard-memory.html");
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeEnabled();
  owner.control.unavailable = "playbook";
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByText("File unavailable", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("closing during verification discards its late completion callback", async ({
  page,
}) => {
  const owner = await serve(page);
  await page.goto("/onboard-memory.html");
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeEnabled();
  let release!: () => void;
  const paused = new Promise<void>((resolve) => {
    release = resolve;
  });
  owner.control.waitForFile = () => paused;
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("button", { name: "Verifying…" })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).last().click();
  release();
  owner.control.waitForFile = null;
  await expect(
    page.getByText("Setup incomplete", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open firm setup" }).click();
  await expect(
    page.getByRole("button", { name: "Done", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("Setup incomplete", { exact: true }),
  ).toBeVisible();
  expect(owner.counts()).toEqual({ saves: 0, submissions: 0 });
});
