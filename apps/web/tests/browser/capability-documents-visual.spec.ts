import { expect, test, type Locator, type Page } from "@playwright/test";
import { json } from "./fixtures";
import {
  changeDocumentView,
  holdResponse,
  installDocumentFixtures,
  nativeFile,
  openDocuments,
} from "./capability-documents-fixtures";

async function noOverflow(page: Page, editor: Locator) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await editor.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  const documents = editor.getByRole("region", {
    name: "Documents",
    exact: true,
  });
  expect(
    await documents.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
}

for (const screen of [
  {
    name: "desktop-light",
    width: 1440,
    height: 1040,
    colorScheme: "light" as const,
  },
  {
    name: "desktop-dark",
    width: 1440,
    height: 1040,
    colorScheme: "dark" as const,
  },
  {
    name: "phone-light",
    width: 390,
    height: 844,
    colorScheme: "light" as const,
  },
  { name: "phone-dark", width: 390, height: 844, colorScheme: "dark" as const },
]) {
  test(`capability document rows and authored status variants at ${screen.name}`, async ({
    page,
  }, info) => {
    const unexpected = await installDocumentFixtures(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await page.emulateMedia({ colorScheme: screen.colorScheme });
    let phase = "ready";
    const longName =
      "Synthetic-ultra-long-capability-datasheet-without-breakable-spaces-012345678901234567890123456789.txt";
    await page.route("**/core/engagement/attachments?**", (route) =>
      phase === "error"
        ? json(route, { message: "Synthetic service unavailable" }, 500)
        : json(
            route,
            phase === "empty"
              ? []
              : [
                  nativeFile,
                  {
                    ...nativeFile,
                    id: "60000000-0000-4000-8000-000000000002",
                    fileName: longName,
                  },
                  {
                    ...nativeFile,
                    id: "60000000-0000-4000-8000-000000000003",
                    fileName: "Awaiting verification.pdf",
                    usable: false,
                    lifecycleStatus: "quarantined",
                    scanStatus: "pending",
                    blockedReason: "scan_pending",
                    scanDisclosure: "Awaiting malware scan",
                    downloadUrl: null,
                  },
                ],
          ),
    );
    const editor = await openDocuments(page);
    const documents = editor.getByRole("region", {
      name: "Documents",
      exact: true,
    });
    await expect(documents.getByRole("listitem")).toHaveCount(3);
    await expect(
      documents.getByRole("button", { name: longName, exact: true }),
    ).toBeVisible();
    await expect(
      documents.getByRole("link", {
        name: "Download Awaiting verification.pdf",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      documents.getByText("Awaiting malware scan", { exact: true }),
    ).toBeVisible();
    const upload = documents.getByRole("button", {
      name: "Upload document",
      exact: true,
    });
    expect((await upload.boundingBox())!.height).toBe(30);
    const rowStyle = await documents
      .getByRole("listitem")
      .first()
      .locator(":scope > div")
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          top: style.paddingTop,
          side: style.paddingLeft,
          gap: style.gap,
          radius: style.borderRadius,
          border: style.borderTopWidth,
        };
      });
    expect(rowStyle).toEqual({
      top: "10px",
      side: "12px",
      gap: "10px",
      radius: "8px",
      border: "1px",
    });
    expect(
      await documents
        .getByRole("button", { name: nativeFile.fileName, exact: true })
        .evaluate((element) => getComputedStyle(element).fontSize),
    ).toBe("13px");
    const bounds = await editor.boundingBox();
    expect(bounds!.width).toBe(screen.width < 680 ? screen.width - 32 : 720);
    await noOverflow(page, editor);
    await page.screenshot({
      path: info.outputPath(`documents-ready-${screen.name}.png`),
      fullPage: true,
    });

    const name = documents.getByRole("button", {
      name: nativeFile.fileName,
      exact: true,
    });
    await name.focus();
    await name.press("Enter");
    const preview = page.getByRole("dialog", {
      name: nativeFile.fileName,
      exact: true,
    });
    await expect(preview).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(preview).toHaveCount(0);
    await expect(name).toBeFocused();

    phase = "error";
    await changeDocumentView(page, "files");
    await expect(documents.getByRole("alert")).toContainText(
      "Documents could not be loaded.",
    );
    await expect(documents.getByRole("listitem")).toHaveCount(0);
    await expect(upload).toBeDisabled();
    await noOverflow(page, editor);
    await page.screenshot({
      path: info.outputPath(`documents-error-${screen.name}.png`),
      fullPage: true,
    });
    phase = "empty";
    const retry = documents.getByRole("button", { name: "Retry", exact: true });
    await retry.focus();
    await retry.press("Enter");
    await expect(
      documents.getByText("No documents yet for this capability.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(upload).toBeEnabled();
    await noOverflow(page, editor);
    await page.screenshot({
      path: info.outputPath(`documents-empty-${screen.name}.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}

test("the authored loading skeleton announces one status while document access is pending", async ({
  page,
}, info) => {
  const unexpected = await installDocumentFixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const held = await holdResponse(
    page,
    "**/core/engagement/attachments?**",
    "GET",
    [],
  );
  const editor = await openDocuments(page, false);
  await held.started;
  await expect(
    editor.getByRole("status", { name: "Loading documents", exact: true }),
  ).toBeVisible();
  await expect(
    editor.getByRole("button", { name: "Upload document", exact: true }),
  ).toBeDisabled();
  await expect(editor.getByRole("listitem")).toHaveCount(0);
  await noOverflow(page, editor);
  await page.screenshot({
    path: info.outputPath("documents-loading-phone.png"),
    fullPage: true,
  });
  held.release();
  await held.settled;
  await expect(
    editor.getByText("No documents yet for this capability.", { exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});
