import { expect, type Page } from "@playwright/test";
import { client, clientId, json } from "./fixtures";
import {
  installDocumentFixtures,
  nativeFile,
} from "./capability-documents-fixtures";
export {
  changeDocumentView,
  holdResponse,
  settleDocumentRequests,
} from "./capability-documents-fixtures";

export const secondClientId = "10000000-0000-4000-8000-000000000002";
export const viewerIds = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
];
export const folderAccessPath = `**/core/clients/${clientId}/files/access/folder`;
export const restrictedReceipt = {
  folder: "Reports",
  viewerMode: "restricted",
  viewerUserIds: viewerIds,
  updated: 1,
};

/** Synthetic inputs only; production FilesPage and FileAccess own the workflow. */
export async function installFolderAccess(
  page: Page,
  folder: string | null = "Reports",
) {
  const unexpected = await installDocumentFixtures(page);
  const reads: string[] = [];
  await page.route("**/core/engagement/attachments?**", (route) => {
    const requested = new URL(route.request().url()).searchParams.get(
      "clientId",
    );
    if (![clientId, secondClientId].includes(requested ?? ""))
      return route.fallback();
    reads.push(requested ?? "");
    return json(route, [{ ...nativeFile, clientId: requested, folder }]);
  });
  await page.route(`**/core/clients/${secondClientId}`, (route) =>
    json(route, {
      ...client,
      id: secondClientId,
      name: "Second synthetic client",
    }),
  );
  await page.route(
    `**/core/clients/${secondClientId}/files/storage-usage`,
    (route) =>
      route.request().method() === "GET"
        ? json(route, { message: "Storage usage unavailable" }, 404)
        : route.fallback(),
  );
  await page.route("**/core/client-account-owners/options", (route) =>
    json(
      route,
      viewerIds.map((id, index) => ({
        id,
        firstName: `Viewer ${index + 1}`,
        lastName: "Synthetic",
        email: `viewer${index + 1}@example.test`,
      })),
    ),
  );
  return { unexpected, reads };
}

export async function openFolderAccess(page: Page, folder = "Reports") {
  const aside = page.locator("aside");
  await aside
    .getByRole("button", { name: new RegExp(`^${folder}\\s*1$`) })
    .click();
  await aside.getByRole("button", { name: "Access", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: `Access: ${folder}`,
    exact: true,
  });
  await expect(
    dialog.getByRole("radio", { name: "All team members" }),
  ).toBeVisible();
  return dialog;
}

export async function requestRestrictedAccess(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Specific people" }).check();
  for (const index of [1, 2])
    await dialog
      .getByRole("checkbox", { name: new RegExp(`Viewer ${index} Synthetic`) })
      .check();
  await dialog.getByRole("button", { name: "Save access" }).click();
}

export async function expectRestrictedDraft(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("radio", { name: "Specific people" }),
  ).toBeChecked();
  for (const index of [1, 2])
    await expect(
      dialog.getByRole("checkbox", {
        name: new RegExp(`Viewer ${index} Synthetic`),
      }),
    ).toBeChecked();
  return dialog;
}
