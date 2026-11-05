import { expect, test } from "@playwright/test";
import { capabilityId } from "./fixtures";
import {
  discoveredId,
  installPortfolioResearch,
} from "./portfolio-research-fixtures";

test("alignment research starts explicitly and returns sourced proposals requiring approval", async ({
  page,
}) => {
  const fixture = await installPortfolioResearch(page, "alignment");
  await page.goto("/portfolio-depth.html");
  await page
    .getByRole("button", { name: "Suggest alignment", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Suggest alignment",
    exact: true,
  });
  await expect(
    dialog.getByRole("heading", { name: "Choose alignment sources" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("checkbox", { name: "LDA", exact: true }),
  ).toHaveCount(0);
  expect(fixture.state.posts).toHaveLength(0);
  await dialog
    .getByRole("checkbox", { name: "Public web", exact: true })
    .check();
  await dialog
    .getByRole("button", { name: "Start selected research", exact: true })
    .click();
  await expect(
    dialog
      .getByRole("region", { name: "Task ledger" })
      .getByText("running", { exact: true })
      .first(),
  ).toBeVisible();
  expect(fixture.state.posts).toHaveLength(1);
  expect(fixture.state.posts[0]?.body).toMatchObject({
    purpose: "alignment",
    capabilityId,
    sources: ["public_web"],
    attachmentIds: [],
    ldaClientIds: [],
  });
  fixture.finish();
  await expect(
    dialog
      .getByRole("region", { name: "Task ledger" })
      .getByText("completed", { exact: true })
      .first(),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Return to review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic discovered alignment",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve term", exact: true }),
  ).toBeEnabled();
  await page
    .getByText("Sources and supporting evidence · 1", { exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: /Synthetic annual report/ }),
  ).toHaveAttribute("href", "https://example.test/annual-report");
  expect(fixture.state.posts).toHaveLength(1);
  expect(fixture.unexpected).toEqual([]);
});

test("annual-report discovery requires unit approval before scoped program research", async ({
  page,
}) => {
  const fixture = await installPortfolioResearch(page, "business_units");
  await page.goto("/portfolio-depth.html");
  await page.getByLabel("Verification view").selectOption("discovery");
  await page
    .getByRole("button", { name: "Discover business units", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Discover business units",
    exact: true,
  });
  await expect(
    dialog.getByRole("heading", { name: "Choose annual-report sources" }),
  ).toBeVisible();
  expect(fixture.state.posts).toHaveLength(0);
  await dialog
    .getByRole("checkbox", { name: "Public web", exact: true })
    .check();
  await dialog
    .getByRole("button", { name: "Start selected research", exact: true })
    .click();
  await expect(
    dialog
      .getByRole("region", { name: "Task ledger" })
      .getByText("running", { exact: true })
      .first(),
  ).toBeVisible();
  expect(fixture.state.posts[0]?.body).toMatchObject({
    purpose: "business_units",
    sources: ["public_web"],
  });
  expect(fixture.state.posts[0]?.body).not.toHaveProperty("capabilityId");
  fixture.finish();
  await expect(
    dialog
      .getByRole("region", { name: "Task ledger" })
      .getByText("completed", { exact: true })
      .first(),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Return to review", exact: true })
    .click();
  const unit = page.getByRole("combobox", {
    name: "Business unit",
    exact: true,
  });
  await expect(
    unit.getByRole("option", { name: "Synthetic unit (2025)" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Approve business unit", exact: true })
    .click();
  await unit.selectOption(discoveredId);
  await page
    .getByRole("button", { name: "Research capabilities", exact: true })
    .click();
  const programs = page.getByRole("dialog", {
    name: "Research capabilities",
    exact: true,
  });
  await expect(
    programs.getByText(
      "Research is scoped to the selected approved business unit.",
      { exact: true },
    ),
  ).toBeVisible();
  await programs
    .getByRole("button", { name: "Start selected research", exact: true })
    .click();
  await expect(
    programs
      .getByRole("region", { name: "Task ledger" })
      .getByText("running", { exact: true })
      .first(),
  ).toBeVisible();
  expect(fixture.state.posts).toHaveLength(2);
  expect(fixture.state.posts[1]?.body).toMatchObject({
    purpose: "capabilities",
    businessUnitId: discoveredId,
  });
  expect(fixture.state.posts[1]?.body).not.toHaveProperty("capabilityId");
  expect(fixture.unexpected).toEqual([]);
});
