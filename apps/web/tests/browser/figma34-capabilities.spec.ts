import { expect, test, type Page } from "@playwright/test";
import { capability, client, clientId, json } from "./fixtures";
import { installCapabilityBoundary } from "./capability-boundary-fixtures";
import { savedSubmission } from "./overview-removal-fixtures";

const areas = [
  [
    "Counter-UAS interceptors",
    "Low-cost kinetic interceptors for Group 1 to 3 threats.",
    6,
    "0604134A",
  ],
  [
    "Autonomy software stack",
    "Lattice command and control for autonomous systems.",
    8,
    "0603461A",
  ],
  ["Sensor fusion", "Multi-sensor fusion for persistent surveillance.", 2, ""],
  [
    "Maritime autonomy",
    "Autonomous surface and undersea vehicles.",
    5,
    "0604454N",
  ],
  ["Field services", "Forward-deployed integration and sustainment.", 7, ""],
  ["Edge compute", "Ruggedized compute for contested environments.", null, ""],
] as const;
const capabilities = areas.map(([name, description, trl, peNumber], index) => ({
  ...capability,
  id: `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  name,
  description,
  trl,
  peNumbers: peNumber ? [peNumber] : [],
}));
const fit = {
  status: "ready",
  computedAt: "2026-10-18T12:00:00Z",
  matches: [
    ["FY27 counter-UAS procurement", "0604134A", 92],
    ["PE 0604134A", "0604134A", 87],
    ["Army SBIR topic A26-014", "A26-014", 81],
  ].map(([target, targetId, score], index) => ({
    id: `synthetic-fit-${index + 1}`,
    kind: "pe",
    targetId,
    target,
    why: "Synthetic capability fit evidence.",
    fit: score,
    capabilityIds: [capabilities[0]!.id],
    href: index === 0 ? `/program-elements/${targetId}` : null,
  })),
};

async function installCapabilitiesFrame(page: Page) {
  const unexpected = await installCapabilityBoundary(page);
  await page.route("**/api/backend/core/me", (route) =>
    json(route, {
      user: {
        id: "a1000000-0000-4000-8000-000000000001",
        email: "test@example.test",
      },
      tenant: { id: savedSubmission.tenantId, name: "Synthetic tenant" },
      role: "user_admin",
    }),
  );
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    json(route, {
      ...client,
      name: "Anduril",
      sectorTag: "Defense technology",
      intakeData: { city: "Costa Mesa", state: "CA" },
    }),
  );
  await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
    json(route, capabilities),
  );
  await page.route(`**/core/clients/${clientId}/capability-fit`, (route) =>
    json(route, fit),
  );
  await page.route(`**/core/clients/${clientId}/submission-history`, (route) =>
    json(route, [
      {
        ...savedSubmission,
        title: "Defense appropriations request",
        meta: "Defense capability submission",
      },
    ]),
  );
  return unexpected;
}

test("desktop capabilities frame composes six source cards with fit and saved history", async ({
  page,
}, info) => {
  const unexpected = await installCapabilitiesFrame(page);
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`/portfolio/${clientId}/capabilities`);
  await expect(page.getByText("6 areas · 2 fielded")).toBeVisible();
  const areasSection = page
    .locator("section")
    .filter({ hasText: "Capability areas" });
  await expect(areasSection.getByRole("button")).toHaveCount(6);
  const fitStrip = page.getByRole("region", { name: "Capability fit" });
  const performance = page
    .locator("details")
    .filter({ hasText: "Past performance" });
  await expect(fitStrip).toContainText("3 fit matches available");
  await expect(
    fitStrip.getByRole("link", { name: "Open target" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);

  const positions = [
    [areasSection.locator(".."), 264, 287, 1144],
    [areasSection.getByRole("button").first(), 285, 332, 359],
    [fitStrip, 264, 696, 1144],
    [performance, 264, 786, 1144],
  ] as const;
  for (const [locator, x, y, width] of positions) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.x - x)).toBeLessThanOrEqual(6);
    expect(Math.abs(box!.y - y)).toBeLessThanOrEqual(6);
    expect(Math.abs(box!.width - width)).toBeLessThanOrEqual(6);
  }
  await page.screenshot({
    path: info.outputPath("capabilities-desktop-light.png"),
  });

  await performance.locator("summary").first().click();
  await expect(
    page.getByRole("heading", { name: "Saved submissions" }),
  ).toBeVisible();
  await expect(page.getByText("Defense appropriations request")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("capabilities-saved-submissions.png"),
    fullPage: true,
  });
  await performance.locator("summary").first().click();
  await areasSection.getByRole("button").first().click();
  await expect(
    page.getByRole("dialog", { name: "Capability: Counter-UAS interceptors" }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});
