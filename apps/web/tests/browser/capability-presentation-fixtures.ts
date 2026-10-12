import { expect, type Locator, type Page } from "@playwright/test";
import { capability, capabilityId, clientId, file, json } from "./fixtures";
import { installCapabilityBoundary } from "./capability-boundary-fixtures";

export const presentedCapability = {
  ...capability,
  name: "Counter-UAS interceptors",
  sector: "Defense",
  description: "Synthetic interceptor profile for visual and keyboard checks.",
  tags: ["autonomy", "counter-uas"],
  issueCodes: ["DEF"],
  trl: 6,
  mrl: 4,
  peNumbers: ["0604201A", "0605603A"],
  keywords: ["counter UAS", "kinetic intercept"],
  notes: "Synthetic internal context.",
};

export async function installCapabilityPresentation(page: Page) {
  const unexpected = await installCapabilityBoundary(page);
  await page.route(`**/core/clients/${clientId}/capabilities`, (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return json(route, [presentedCapability]);
  });
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, [
      {
        ...file,
        source: `capability:${capabilityId}`,
        fileName: "Synthetic datasheet.pdf",
      },
      {
        ...file,
        id: "60000000-0000-4000-8000-000000000099",
        source: "manual",
        fileName: "Other record document.pdf",
      },
    ]),
  );
  return unexpected;
}

export async function openPresentedCapability(page: Page) {
  await page.goto(
    `/portfolio/${clientId}/capabilities?capability=${capabilityId}`,
  );
  const editor = page.getByRole("dialog", {
    name: `Capability: ${presentedCapability.name}`,
    exact: true,
  });
  await expect(
    editor.getByRole("tab", { name: "Profile", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    editor.getByRole("button", { name: "Save capability", exact: true }),
  ).toBeEnabled();
  return editor;
}

export async function openCapabilityDetails(editor: Locator) {
  await editor.getByText("Details", { exact: true }).click();
  await expect(editor.getByLabel("Name", { exact: true })).toBeVisible();
}

export async function expectNoCapabilityOverflow(page: Page, editor: Locator) {
  expect(
    await editor.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}
