import type { Locator } from "@playwright/test";
/** Continue an explicit identity preview; capacity refusals and held preflights stay pending. */
export async function finishManualIdentity(dialog: Locator) {
  const confirmation = dialog.getByRole("radio", {
    name: "Create a profile with the company details I entered",
    exact: true,
  });
  try {
    await confirmation.waitFor({ state: "visible", timeout: 1200 });
  } catch {
    return;
  }
  await confirmation.check();
  await dialog
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
}
