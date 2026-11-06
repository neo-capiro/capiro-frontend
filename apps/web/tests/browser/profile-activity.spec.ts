import { expect, test } from "@playwright/test";
import axe from "axe-core";
import { clientId, json } from "./fixtures";
import { installEnrichment } from "./client-enrichment-fixtures";

for (const width of [1440, 390]) {
  test(`profile activity brings completeness and research together at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1040 });
    const { state, unexpected } = await installEnrichment(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(`**/clients/${clientId}/profile-build/profile`, (route) =>
      json(route, {
        subject: { kind: "client", id: clientId },
        version: "a".repeat(64),
        fields: {},
        facts: [],
        conflicts: [],
        completeness: {
          completed: 5,
          total: 6,
          missing: ["advocacy"],
          sections: [
            "company",
            "registration",
            "locations",
            "leadership",
            "capabilities",
            "advocacy",
          ].map((key) => ({
            key,
            status: key === "advocacy" ? "missing" : "complete",
            researched: key !== "advocacy",
            reviewCount: 0,
          })),
        },
        sections: { leadership: [], notes: [], documents: [] },
      }),
    );
    await page.goto(`/portfolio/${clientId}`);
    const card = page.getByRole("region", {
      name: "Profile activity",
      exact: true,
    });
    const trigger = card.getByRole("button", {
      name: "Profile activity",
      exact: true,
    });
    const details = page.getByRole("region", {
      name: "Profile activity details",
      exact: true,
    });
    await expect(card).toContainText("5 of 6 details complete");
    await expect(card.getByRole("progressbar")).toHaveAttribute("value", "5");
    await expect(card.getByRole("progressbar")).toHaveAttribute("max", "6");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(details).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit details", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Recorded activity", exact: true }),
    ).toHaveCount(0);
    await card.screenshot({
      path: info.outputPath(`profile-activity-card-${width}.png`),
    });
    await trigger.focus();
    await trigger.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(details).toBeFocused();
    await expect(details).toBeInViewport();
    await expect(details).toContainText("5 of 6 details complete");
    const completeness = details.getByRole("complementary", {
      name: "Profile completeness",
    });
    for (const label of [
      "Company basics",
      "Federal registration",
      "Sites",
      "Leadership",
      "Capabilities",
    ]) {
      const row = completeness.getByRole("listitem").filter({ hasText: label });
      await expect(row).toContainText("Complete");
    }
    await expect(
      completeness
        .getByRole("listitem")
        .filter({ hasText: "Advocacy profile" }),
    ).toContainText("Not researched");
    await expect(
      details.getByText("Sourced profile", { exact: true }),
    ).toBeVisible();
    await expect(
      details.getByRole("heading", {
        name: "Research and review",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      details.getByRole("region", { name: "Sources and review", exact: true }),
    ).toBeVisible();
    await page.addScriptTag({ content: axe.source });
    const accessibility = await page.evaluate(() =>
      (window as unknown as Window & { axe: typeof axe }).axe.run({
        include: [
          '[aria-label="Profile activity"]',
          '[aria-label="Profile activity details"]',
        ],
      }),
    );
    await info.attach("profile-activity-accessibility", {
      body: JSON.stringify(accessibility, null, 2),
      contentType: "application/json",
    });
    expect(accessibility.violations).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: info.outputPath(`profile-activity-details-${width}.png`),
    });

    await details
      .getByRole("button", { name: "Edit details", exact: true })
      .click();
    const editor = page.getByRole("dialog", {
      name: "Edit company details",
      exact: true,
    });
    await expect(editor).toBeVisible();
    await editor.press("Escape");
    await expect(editor).not.toBeVisible();
    await expect(details).toBeVisible();
    const research = details.getByRole("region", {
      name: "Profile research",
      exact: true,
    });
    await research
      .getByRole("button", { name: "Select eligible", exact: true })
      .click();
    await expect(
      research.getByRole("button", { name: "Approve 2 selected", exact: true }),
    ).toBeEnabled();
    await details
      .getByRole("button", { name: "Close profile activity", exact: true })
      .click();
    await expect(details).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Approve 2 selected", exact: true }),
    ).toHaveCount(0);
    await trigger.press("Space");
    await expect(details).toBeFocused();
    await expect(
      research.getByRole("button", { name: "Approve 2 selected", exact: true }),
    ).toBeEnabled();
    await details.press("Escape");
    await expect(details).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(state.posts).toEqual([]);
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}

test("collapsing profile activity retains the exact uncertain conflict decision", async ({
  page,
}) => {
  const { unexpected } = await installEnrichment(page);
  const fact = {
    id: "10000000-0000-4000-8000-000000000030",
    fieldKey: "description",
    value: "Synthetic current description",
    origin: "person",
    sourceType: null,
    sourceUrl: null,
    attachmentId: null,
    evidence: [],
    observedAt: null,
    confidence: null,
    status: "approved",
    approvedBy: null,
    approvedAt: null,
    version: 1,
    isCurrent: true,
  };
  const proposed = {
    ...fact,
    id: "10000000-0000-4000-8000-000000000031",
    value: "Synthetic proposed description",
    status: "pending",
    isCurrent: false,
  };
  const snapshot = {
    subject: { kind: "client", id: clientId },
    version: "a".repeat(64),
    fields: {},
    facts: [fact, proposed],
    conflicts: [
      {
        id: "10000000-0000-4000-8000-000000000032",
        fieldKey: "description",
        currentFactId: fact.id,
        proposedFactId: proposed.id,
        status: "pending",
        version: 3,
        resolution: null,
      },
    ],
    completeness: { completed: 1, total: 6, missing: [], sections: [] },
    sections: { leadership: [], notes: [], documents: [] },
  };
  const decisions: unknown[] = [];
  await page.route(`**/clients/${clientId}/profile-build/profile`, (route) =>
    json(route, snapshot),
  );
  await page.route(
    `**/clients/${clientId}/profile-build/facts/${proposed.id}/resolve`,
    (route) => {
      decisions.push(route.request().postDataJSON());
      if (decisions.length === 1)
        return json(
          route,
          { message: "Synthetic uncertain conflict decision" },
          503,
        );
      return json(route, { ...snapshot, conflicts: [] });
    },
  );
  await page.goto(`/portfolio/${clientId}`);
  const trigger = page.getByRole("button", {
    name: "Profile activity",
    exact: true,
  });
  await trigger.click();
  const sources = page.getByRole("region", {
    name: "Sources and review",
    exact: true,
  });
  await sources
    .getByRole("button", { name: "Accept proposed", exact: true })
    .click();
  const retry = sources.getByRole("button", {
    name: "Check or retry this decision",
    exact: true,
  });
  await expect(retry).toBeEnabled();
  expect(decisions).toHaveLength(1);
  await page
    .getByRole("button", { name: "Close profile activity", exact: true })
    .click();
  await expect(sources).toHaveCount(0);
  await trigger.click();
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect(retry).toHaveCount(0);
  expect(decisions).toHaveLength(2);
  expect(decisions[1]).toEqual(decisions[0]);
  expect(decisions[0]).toEqual({
    requestId: expect.any(String),
    expectedVersion: 3,
    resolution: "accept_proposed",
  });
  expect(unexpected).toEqual([]);
});

test("profile activity keeps pending and unavailable completeness distinct from zero", async ({
  page,
}) => {
  const { unexpected } = await installEnrichment(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    `**/clients/${clientId}/profile-build/profile`,
    async (route) => {
      await pending;
      return json(route, { message: "Synthetic unavailable profile" }, 403);
    },
  );
  await page.goto(`/portfolio/${clientId}`);
  const card = page.getByRole("region", {
    name: "Profile activity",
    exact: true,
  });
  await expect(card).toContainText("Loading profile completeness");
  await expect(card.getByRole("progressbar")).toHaveCount(0);
  release();
  await expect(card).toContainText("Profile completeness unavailable");
  await expect(card.getByRole("progressbar")).toHaveCount(0);
  await card
    .getByRole("button", { name: "Profile activity", exact: true })
    .click();
  const completeness = page.getByRole("complementary", {
    name: "Profile completeness",
  });
  await expect(completeness).toContainText("You do not have permission");
  await expect(
    completeness.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await expect(completeness).not.toContainText("0 of 6");
  expect(unexpected).toEqual([]);
});
