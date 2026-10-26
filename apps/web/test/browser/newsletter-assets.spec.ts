import { test, expect } from "@playwright/test";
import {
  assetFixture,
  openImagePicker,
  chooseDetails,
  asset,
  assetDetails,
  assetId,
  secondId,
  originalUrl,
  auditDialog,
} from "./newsletter-assets-fixture";
import {
  button,
  heldResponse,
  adoptDocument,
  navigate,
  editorUrl,
  otherClientId,
} from "./newsletter-document-fixtures";

test("paged logo selection, bound details and explicit Insert preserve manual alt and one-step undo", async ({
  page,
}, info) => {
  const fixture = await assetFixture(page);
  await openImagePicker(page);
  await expect(button(page, "Insert")).toBeDisabled();
  await button(page, "Next page").click();
  await expect(
    page.getByText("Page 2 · 51 matching images reported"),
  ).toBeVisible();
  await chooseDetails(page, "Synthetic page two image");
  await expect(button(page, "Insert")).toBeEnabled();
  expect(fixture.calls("detail").at(-1)?.input).toEqual({
    params: { id: secondId },
  });
  await expect(page.getByLabel("Current revision")).toHaveText("Yes");
  await expect(page.getByText("Dimensions", { exact: true })).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await auditDialog(page, info, "asset-details-desktop-axe");
  await page.screenshot({
    path: info.outputPath("asset-details-desktop.png"),
    fullPage: false,
  });
  await button(page, "Insert").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    asset(secondId).url,
  );
  await expect(page.getByLabel("Alternative text")).toHaveValue(
    "Preserved manual alt",
  );
  await button(page, "Undo").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    originalUrl,
  );
  await expect(page.getByLabel("Alternative text")).toHaveValue(
    "Preserved manual alt",
  );
  await page
    .getByLabel("Image URL", { exact: true })
    .fill("https://manual.example.test/edited.png");
  await page.getByLabel("Alternative text").fill("Still manually editable");
  await button(page, "Replace from image library").click();
  await page.screenshot({
    path: info.outputPath("asset-library-desktop.png"),
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await auditDialog(page, info, "asset-library-narrow-axe");
  await page.screenshot({
    path: info.outputPath("asset-library-narrow.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await expect(button(page, "Replace from image library")).toBeFocused();
  expect(fixture.document.calls("save")).toEqual([]);
  expect(fixture.document.calls("stage")).toEqual([]);
  expect(fixture.calls("upload")).toEqual([]);
  expect(fixture.document.control.remote).toEqual([]);
  expect(fixture.document.control.errors).toEqual([]);
});

test("a replaced list read cannot restore stale rows or selection", async ({
  page,
}) => {
  const fixture = await assetFixture(page),
    held = heldResponse();
  await openImagePicker(page);
  await button(page, "Select Synthetic policy image").click();
  fixture.queue("list", async (route) => {
    await held.wait;
    await route.fulfill({
      json: {
        page: 2,
        pageSize: 25,
        total: 51,
        items: [asset(secondId, "Stale private row")],
      },
    });
    held.finished();
  });
  await button(page, "Next page").click();
  await expect(page.getByText("Loading images…")).toBeVisible();
  await page.getByLabel("Search files").fill("new search");
  await expect(button(page, "Select Synthetic policy image")).toBeVisible();
  held.release();
  await held.settled;
  await expect(page.getByText("Stale private row")).toHaveCount(0);
  await expect(button(page, "View Details")).toBeDisabled();
  await expect(
    page.getByText("Page 1 · 51 matching images reported"),
  ).toBeVisible();
});

test("query replacement clears selection; denied, wrong-ID, malformed and historical details cannot insert", async ({
  page,
}) => {
  const fixture = await assetFixture(page);
  await openImagePicker(page);
  await button(page, "Select Synthetic policy image").click();
  await page.getByLabel("Search files").fill("policy");
  await expect(button(page, "View Details")).toBeDisabled();
  await page.getByLabel("Sort by").click();
  await page.getByRole("option", { name: "Oldest first" }).click();
  await expect
    .poll(() => fixture.calls("list").at(-1)?.input)
    .toEqual({
      query: { page: 1, pageSize: 25, search: "policy", sort: "oldest" },
    });
  for (const response of [
    { status: 403, json: { message: "Synthetic other-owner denial" } },
    { json: assetDetails(secondId) },
    { json: { ...assetDetails(), sizeBytes: "invented" } },
    { json: { ...assetDetails(), currentRevision: false } },
  ]) {
    fixture.queue("detail", (route) => route.fulfill(response));
    await chooseDetails(page);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(button(page, "Insert")).toBeDisabled();
    await button(page, "Back to library").click();
  }
  fixture.queue("list", (route) => route.fulfill({ status: 403, json: {} }));
  await button(page, "Refresh library").click();
  await expect(page.getByText(/Image library unavailable/)).toBeVisible();
  await expect(button(page, "View Details")).toBeDisabled();
  await expect(page.getByText("No images in your library.")).toHaveCount(0);
  await button(page, "Close").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    originalUrl,
  );
});

test("local file limits do not dispatch and acknowledged upload still needs details and explicit image insertion", async ({
  page,
}) => {
  const fixture = await assetFixture(page);
  await openImagePicker(page, "Image");
  await page.getByLabel("Image file", { exact: true }).setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.getByText(/Not uploaded/)).toBeVisible();
  await expect(button(page, "Upload")).toBeDisabled();
  await page.getByLabel("Image file", { exact: true }).setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(button(page, "Upload")).toBeDisabled();
  expect(fixture.calls("upload")).toEqual([]);
  await page.getByLabel("Image file", { exact: true }).setInputFiles({
    name: "synthetic.png",
    mimeType: "image/png",
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  });
  expect(fixture.calls("upload")).toEqual([]);
  await button(page, "Upload").click();
  await expect(page.getByText(/Added to the library/)).toBeVisible();
  expect(fixture.calls("upload")).toEqual([
    { operation: "upload", method: "POST", input: { multipart: true } },
  ]);
  await expect(button(page, "Insert")).toBeDisabled();
  await button(page, "View uploaded image details").click();
  await expect(button(page, "Insert")).toBeEnabled();
  await button(page, "Insert").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    asset().url,
  );
  await expect(page.getByLabel("Alternative text")).toHaveValue(
    "Preserved manual alt",
  );
  expect(fixture.document.calls("save")).toEqual([]);
});

for (const kind of ["lost", "invalid"] as const) {
  test(`one ${kind} upload acknowledgement remains unknown across close/reopen and refresh`, async ({
    page,
  }, info) => {
    const fixture = await assetFixture(page),
      held = heldResponse();
    fixture.queue("upload", async (route) => {
      await held.wait;
      await route.fulfill(
        kind === "lost"
          ? { status: 503, json: {} }
          : { json: { ...asset(), requestId: assetId } },
      );
      held.finished();
    });
    await openImagePicker(page);
    await page.getByLabel("Image file", { exact: true }).setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: Buffer.from("synthetic bytes"),
    });
    await button(page, "Upload").click();
    await expect(button(page, "Upload")).toBeDisabled();
    await expect.poll(() => fixture.calls("upload").length).toBe(1);
    await button(page, "Close").click();
    await page
      .getByLabel("Alternative text")
      .fill("Manual edit while upload pending");
    held.release();
    await held.settled;
    await button(page, "Replace from image library").click();
    await expect(
      page.getByText(/Upload not confirmed. It may have completed/),
    ).toBeVisible();
    await button(page, "Refresh library").click();
    await expect(button(page, "Select Synthetic policy image")).toBeVisible();
    await expect(page.getByText(/Upload not confirmed/)).toBeVisible();
    await expect(button(page, "Insert")).toBeDisabled();
    await expect(button(page, "Upload")).toBeDisabled();
    expect(fixture.calls("upload")).toHaveLength(1);
    await page.screenshot({
      path: info.outputPath(`asset-upload-${kind}.png`),
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
      originalUrl,
    );
    await expect(page.getByLabel("Alternative text")).toHaveValue(
      "Manual edit while upload pending",
    );
  });
}

for (const replacement of ["block", "document", "actor", "client"] as const) {
  test(`late bound detail cannot insert after ${replacement} replacement`, async ({
    page,
  }) => {
    const fixture = await assetFixture(page),
      held = heldResponse();
    fixture.queue("detail", async (route) => {
      await held.wait;
      await route.fulfill({ json: assetDetails() });
      held.finished();
    });
    await openImagePicker(page);
    await chooseDetails(page);
    await expect(page.getByText("Loading image details…")).toBeVisible();
    await button(page, "Close").click();
    if (replacement === "block") {
      await page
        .getByRole("navigation", { name: "Newsletter structure" })
        .getByRole("button", { name: "Image", exact: true })
        .click();
    } else if (replacement === "document") {
      fixture.document.control.current = {
        ...fixture.document.control.current,
        id: "d2222222-2222-4222-8222-222222222222",
        revision: 5,
      };
      await adoptDocument(page);
    } else if (replacement === "actor") {
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("test:session", {
            detail: {
              userId: "another-synthetic-user",
              sessionId: "another-synthetic-session",
            },
          }),
        ),
      );
    } else {
      await navigate(page, `${editorUrl}&clientId=${otherClientId}`);
    }
    held.release();
    await held.settled;
    await expect(page.getByRole("dialog")).toHaveCount(0);
    if (replacement === "block") {
      await button(page, "Replace from image library").click();
      await expect(button(page, "Insert")).toBeDisabled();
      await expect(button(page, "View Details")).toBeDisabled();
      await button(page, "Close").click();
      await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
        originalUrl,
      );
    }
    expect(fixture.calls("upload")).toEqual([]);
    expect(fixture.document.calls("save")).toEqual([]);
    expect(fixture.document.control.errors).toEqual([]);
  });
}
