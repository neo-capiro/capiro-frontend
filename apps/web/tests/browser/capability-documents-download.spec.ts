import { expect, test } from "@playwright/test";
import { json } from "./fixtures";
import {
  changeDocumentView,
  holdResponse,
  installDocumentFixtures,
  nativeFile,
  observeDocumentNavigation,
  openDocuments,
  settleDocumentRequests,
} from "./capability-documents-fixtures";

test("an authorized reader keeps keyboard download access without gaining upload access", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  const navigations = await observeDocumentNavigation(page);
  let reads = 0;
  await page.route("**/core/engagement/attachments?**", (route) => {
    reads += 1;
    return json(route, [
      {
        ...nativeFile,
        downloadUrl: "https://storage.example.test/reader-download",
      },
    ]);
  });
  const editor = await openDocuments(page);
  await changeDocumentView(page, "role");
  await expect(
    editor.getByRole("button", { name: "Upload document", exact: true }),
  ).toBeDisabled();
  const download = editor.getByRole("link", {
    name: `Download ${nativeFile.fileName}`,
    exact: true,
  });
  await expect(download).toBeEnabled();
  expect(reads).toBe(2);
  await expect(download).not.toHaveAttribute("href", /./);
  await download.focus();
  await download.press("Enter");
  await expect
    .poll(() => navigations)
    .toEqual(["https://storage.example.test/reader-download"]);
  expect(reads).toBe(3);
  expect(unexpected).toEqual([]);
});

for (const outcome of [
  "denied",
  "failed",
  "removed",
  "wrong-client",
  "wrong-source",
  "quarantined",
] as const) {
  test(`the current ${outcome} list refuses a formerly available download`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    const navigations = await observeDocumentNavigation(page);
    let reads = 0;
    await page.route("**/core/engagement/attachments?**", (route) => {
      reads += 1;
      if (reads === 1) return json(route, [nativeFile]);
      if (outcome === "denied" || outcome === "failed")
        return json(
          route,
          { message: "Synthetic current read refused" },
          outcome === "denied" ? 403 : 500,
        );
      return json(
        route,
        outcome === "removed"
          ? []
          : [
              {
                ...nativeFile,
                ...(outcome === "wrong-client"
                  ? { clientId: "10000000-0000-4000-8000-000000000009" }
                  : {}),
                ...(outcome === "wrong-source" ? { source: "manual" } : {}),
                ...(outcome === "quarantined"
                  ? {
                      usable: false,
                      lifecycleStatus: "quarantined",
                      scanStatus: "pending",
                      blockedReason: "scan_pending",
                      downloadUrl: null,
                    }
                  : {}),
              },
            ],
      );
    });
    const editor = await openDocuments(page);
    await editor
      .getByRole("link", {
        name: `Download ${nativeFile.fileName}`,
        exact: true,
      })
      .click();
    await expect.poll(() => reads).toBeGreaterThan(1);
    await settleDocumentRequests(page);
    expect(navigations).toEqual([]);
    if (
      outcome === "denied" ||
      outcome === "failed" ||
      outcome === "wrong-client"
    ) {
      await expect(editor.getByRole("alert")).toBeVisible();
      await expect(
        editor.getByRole("button", { name: nativeFile.fileName, exact: true }),
      ).toHaveCount(0);
      await expect(
        editor.getByRole("button", { name: "Upload document", exact: true }),
      ).toBeDisabled();
    } else if (outcome === "quarantined") {
      await expect(
        editor.getByRole("link", {
          name: `Download ${nativeFile.fileName}`,
          exact: true,
        }),
      ).toBeDisabled();
      await expect(
        editor.getByText("This file is not available to download yet.", {
          exact: true,
        }),
      ).toBeVisible();
    } else {
      await expect(
        editor.getByText("No documents yet for this capability.", {
          exact: true,
        }),
      ).toBeVisible();
    }
    expect(unexpected).toEqual([]);
  });
}

for (const change of ["actor", "tenant", "client", "source", "unmount"]) {
  test(`a held authorized download cannot navigate after its ${change} changes`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    const navigations = await observeDocumentNavigation(page);
    const editor = await openDocuments(page);
    const held = await holdResponse(
      page,
      "**/core/engagement/attachments?**",
      "GET",
      [
        {
          ...nativeFile,
          downloadUrl: "https://storage.example.test/late-download",
        },
      ],
    );
    await editor
      .getByRole("link", {
        name: `Download ${nativeFile.fileName}`,
        exact: true,
      })
      .click();
    await held.started;
    await changeDocumentView(page, change);
    held.release();
    await held.settled;
    await settleDocumentRequests(page);
    expect(navigations).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}

test("closing a preview while its current read is held closes the reserved blank tab", async ({
  page,
  context,
}) => {
  const unexpected = await installDocumentFixtures(page);
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, [
      { ...nativeFile, previewUrl: "https://storage.example.test/preview" },
    ]),
  );
  const navigations = await observeDocumentNavigation(page);
  const editor = await openDocuments(page);
  await editor
    .getByRole("button", { name: nativeFile.fileName, exact: true })
    .click();
  const preview = page.getByRole("dialog", {
    name: nativeFile.fileName,
    exact: true,
  });
  const held = await holdResponse(
    page,
    "**/core/engagement/attachments?**",
    "GET",
    [
      {
        ...nativeFile,
        previewUrl: "https://storage.example.test/current-preview",
      },
    ],
  );
  const popupPromise = context.waitForEvent("page");
  await preview
    .getByRole("link", { name: "Open in new tab", exact: true })
    .click();
  const popup = await popupPromise;
  await held.started;
  await expect.poll(() => popup.url()).toBe("about:blank");
  await preview.getByRole("button", { name: "Close", exact: true }).click();
  await expect.poll(() => popup.isClosed()).toBe(true);
  held.release();
  await held.settled;
  await settleDocumentRequests(page);
  expect(navigations).toEqual([]);
  expect(unexpected).toEqual([]);
});
