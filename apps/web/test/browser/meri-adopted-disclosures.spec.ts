import { test, expect } from "@playwright/test";
import { tabTo, expectFocusEvidence } from "../accessibility-interaction";
import {
  colorSchemes,
  expectExplainedUnavailable,
  expectKeyboardDisclosure,
  fixtureScreenPath,
  openFixtureScreen,
  press,
} from "./meri-fixture-screen-helpers";

// Adopted Collapsible-based AI Elements as the Meri fixture screens compose them.
for (const colorScheme of colorSchemes) {
  test(`Meri Tool activity disclosure is keyboard operable in ${colorScheme} at 1440px`, async ({
    page,
  }, info) => {
    const finish = await openFixtureScreen(
      page,
      info,
      "tool-activity",
      colorScheme,
    );
    // Figma 02.07: the Tool header is a level-2 heading wrapping the shared trigger.
    const heading = page.getByRole("heading", {
      level: 2,
      name: "Search authorized client records Complete",
    });
    const trigger = heading.getByRole("button", {
      name: "Search authorized client records Complete",
      exact: true,
    });
    const request = page.getByRole("heading", {
      level: 3,
      name: "Request",
      exact: true,
    });
    await tabTo(page, trigger);
    await expectFocusEvidence(trigger, info);
    await expectKeyboardDisclosure(page, trigger, request, true);
    await expect(
      page.getByRole("table", {
        name: "Search authorized client records result",
      }),
    ).toBeVisible();
    await expectExplainedUnavailable(
      page.getByRole("button", { name: "Open source evidence", exact: true }),
    );
    const expanded = page.getByRole("link", {
      name: "View expanded tool activity",
      exact: true,
    });
    await tabTo(page, expanded);
    await expectFocusEvidence(expanded, info);
    await finish();
    await press(page, "Enter");
    await expect(page).toHaveURL(fixtureScreenPath("tool-activity-expanded"));
  });

  test(`Meri specialist Task details expand and collapse by keyboard in ${colorScheme} at 1440px`, async ({
    page,
  }, info) => {
    const finish = await openFixtureScreen(
      page,
      info,
      "specialist-activity",
      colorScheme,
    );
    const names = ["Research", "Data", "Document", "Verification"];
    for (const name of names)
      await expect(
        page.getByRole("button", { name: `${name} details`, exact: true }),
      ).toHaveAttribute("aria-expanded", "false");
    const research = page.getByRole("button", {
      name: "Research details",
      exact: true,
    });
    const details = page.getByText("Reading 2 client records", {
      exact: true,
    });
    await expect(details).toBeHidden();
    await tabTo(page, research);
    await expectFocusEvidence(research, info);
    await expectKeyboardDisclosure(page, research, details, false);
    await press(page, "Enter");
    await expect(details).toBeVisible();
    await expect(
      page.getByText("Checking the date on 1 public source", { exact: true }),
    ).toBeVisible();
    // Opening one specialist leaves the others collapsed.
    for (const name of names.slice(1))
      await expect(
        page.getByRole("button", { name: `${name} details`, exact: true }),
      ).toHaveAttribute("aria-expanded", "false");
    await finish();
  });

  test(`Meri run Plan card renders its Queue steps and keyboard link in ${colorScheme} at 1440px`, async ({
    page,
  }, info) => {
    const finish = await openFixtureScreen(
      page,
      info,
      "research-progress",
      colorScheme,
    );
    // Plan is an open Card-based Collapsible with no trigger in this composition.
    const plan = page.locator('[data-slot="plan"]');
    await expect(plan).toHaveAttribute("data-state", "open");
    await expect(plan.locator('[data-slot="plan-header"]')).toBeVisible();
    await expect(plan.locator('[data-slot="plan-content"]')).toHaveAttribute(
      "data-state",
      "open",
    );
    await expect(plan.locator("[aria-expanded]")).toHaveCount(0);
    await expect(
      plan.getByRole("heading", {
        level: 2,
        name: "Meeting brief · 4 steps",
        exact: true,
      }),
    ).toBeVisible();
    const steps = plan
      .getByRole("list", { name: "Plan steps" })
      .getByRole("listitem");
    await expect(steps).toHaveCount(4);
    // Each Queue step states its completion before its title.
    await expect(steps.nth(0)).toHaveText(/^Done\W+Confirm scope/);
    await expect(steps.nth(1)).toHaveText(/^Not done\W+Research developments/);
    const view = plan.getByRole("link", { name: "View run", exact: true });
    await tabTo(page, view);
    await expectFocusEvidence(view, info);
    await finish();
    await press(page, "Enter");
    await expect(page).toHaveURL(fixtureScreenPath("run-detail"));
    // Run detail composes the same Plan; its run link is an explained unavailable control.
    await expect(
      page.getByRole("list", { name: "Plan steps" }).getByRole("listitem"),
    ).toHaveCount(4);
    await expectExplainedUnavailable(
      page.getByRole("button", { name: "View run", exact: true }),
    );
    await expect(
      page
        .getByRole("list", { name: "Recent run activity" })
        .getByRole("listitem"),
    ).toHaveCount(4);
  });
}
