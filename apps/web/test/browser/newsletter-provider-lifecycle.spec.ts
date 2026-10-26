import { test, expect } from "@playwright/test";
import {
  providerFixture,
  selectProviderBlock,
  expectNoProviderSideEffects,
} from "./newsletter-providers-fixture";
import {
  button,
  heldResponse,
  adoptDocument,
  navigate,
  editorUrl,
  otherClientId,
} from "./newsletter-document-fixtures";

for (const replacement of ["block", "document", "actor", "client"] as const) {
  test(`late provider output cannot apply after ${replacement} replacement`, async ({
    page,
  }) => {
    const fixture = await providerFixture(page),
      held = heldResponse();
    fixture.queue("altText", async (route) => {
      await held.wait;
      await route.fulfill({ json: { text: "Late synthetic alt" } });
      held.finished();
    });
    await selectProviderBlock(page);
    await button(page, "Generate alt text").click();
    await button(page, "Generate").click();
    await expect(page.getByText(/Request in progress/)).toBeVisible();
    await button(page, "Close").click();
    if (replacement === "block")
      await selectProviderBlock(page, "Image", false);
    else if (replacement === "document") {
      fixture.assets.document.control.current = {
        ...fixture.assets.document.control.current,
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
    } else await navigate(page, `${editorUrl}&clientId=${otherClientId}`);
    held.release();
    await held.settled;
    await expect(page.getByRole("dialog")).toHaveCount(0);
    if (replacement === "block") {
      await expect(page.getByLabel("Alternative text")).toHaveValue(
        "Preserved manual alt",
      );
      await button(page, "Generate alt text").click();
      await expect(button(page, "Use alt text")).toHaveCount(0);
    }
    expect(fixture.calls("altText")).toHaveLength(1);
    await expectNoProviderSideEffects(fixture);
  });
}

test("an unavailable video adapter reports the producer reason without claiming a thumbnail or retrying", async ({
  page,
}) => {
  const fixture = await providerFixture(page);
  fixture.queue("videoThumbnail", (route) =>
    route.fulfill({
      status: 503,
      json: {
        message:
          "Automatic video thumbnails are unavailable. Choose a custom thumbnail.",
      },
    }),
  );
  await selectProviderBlock(page, "Video");
  await button(page, "Video URL and thumbnail").click();
  await button(page, "Create thumbnail").click();
  await expect(
    page.getByText(
      /Automatic video thumbnails are unavailable. Choose a custom thumbnail./,
    ),
  ).toBeVisible();
  await expect(button(page, "Use video thumbnail")).toHaveCount(0);
  await button(page, "Close").click();
  await button(page, "Video URL and thumbnail").click();
  await expect(button(page, "Create thumbnail")).toBeDisabled();
  expect(fixture.calls("videoThumbnail")).toHaveLength(1);
  await expectNoProviderSideEffects(fixture);
});
