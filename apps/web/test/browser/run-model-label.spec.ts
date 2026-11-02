import { expect, test } from "@playwright/test";

test("a finished answer carries a quiet model and effort label; a record without a selection shows none", async ({
  page,
}) => {
  await page.goto("/run-model-label/index.html");
  const current = page.getByRole("article", { name: "Current turn" });
  await expect(current.getByText("Synthetic model · High")).toBeVisible();
  await expect(current.getByText("Synthetic model · High")).toHaveAttribute(
    "title",
    "Model that answered",
  );
  const earlier = page.getByRole("article", { name: "Earlier turn 1" });
  await expect(earlier).toContainText("next hearing for 25 October");
  await expect(earlier.getByText("Synthetic model")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("synthetic-model");
});
