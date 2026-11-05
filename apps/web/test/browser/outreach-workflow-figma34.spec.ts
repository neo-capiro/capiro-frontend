import { expect, test } from "@playwright/test";
import { setupOutreach, recordId } from "./core109-outreach-fixtures";
import {
  campaign,
  current,
  recipient,
  mailboxId,
  artifactId,
  generationKey,
} from "./outreach-visual-data";
import { expectAccessibleHome } from "../accessibility";

for (const width of [1440, 390])
  test(`companion workflow and explicit send confirmation are accessible at ${width}px`, async ({
    page,
  }, info) => {
    const observed = await setupOutreach(page);
    await page.setViewportSize({ width, height: 1040 });
    await page.route("**/api/capiro/engagement.campaign?*", (route) =>
      route.fulfill({ json: campaign }),
    );
    await page.route("**/api/capiro/engagement.campaign.templates?*", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.route("**/api/capiro/engagement.campaign.drafts?*", (route) =>
      route.fulfill({
        json: [
          {
            id: artifactId,
            outreachRecordId: recordId,
            generationKey,
            recipientKey: recipient.id,
            audienceKind: "individual",
            recipientSnapshot: { name: recipient.name, email: recipient.email },
            currentVersion: 1,
            current,
            history: [],
          },
        ],
      }),
    );
    await page.route(
      "**/api/capiro/engagement.newsletter.mailboxes?*",
      (route) =>
        route.fulfill({
          json: [
            {
              id: mailboxId,
              provider: "google_workspace",
              accountEmail: "sender@example.test",
              displayName: "Synthetic sender",
              availability: "available",
              signaturePolicy: "actor",
            },
          ],
        }),
    );
    for (const [step, label] of [
      [1, "direction"],
      [2, "setup"],
      [6, "review"],
      [7, "send"],
    ] as const) {
      await page.goto(`/modules/engagement?session=${recordId}&step=${step}`);
      await expect(
        width === 390
          ? page.getByRole("combobox", { name: "Outreach step", exact: true })
          : page.getByRole("navigation", { name: "Outreach steps" }),
      ).toBeVisible();
      await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
      if (step === 7)
        await expect(
          page.getByRole("button", { name: "Review send", exact: true }),
        ).toBeEnabled();
      if (step === 6) {
        await page.getByText("Improve & versions", { exact: true }).click();
        await expect(
          page.getByText("Ready to send", { exact: true }),
        ).toHaveCSS("font-size", "14px");
        await expect(
          page.getByLabel("What would you like to improve?", { exact: true }),
        ).toHaveCSS("height", "47px");
      }
      await expectAccessibleHome(page, info);
      await page.screenshot({
        path: info.outputPath(`outreach-workflow-${label}-${width}.png`),
        fullPage: true,
      });
    }
    await page
      .getByRole("button", { name: "Review send", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Send this outreach?" }),
    ).toContainText(recipient.email);
    await expect(
      page.getByRole("button", { name: "Send 1 message", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Send 1 message", exact: true }),
    ).toHaveCSS("font-weight", "500");
    const confirmation = page.getByRole("dialog", { name: "Send this outreach?" });
    const bounds = await confirmation.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) throw new Error("Send confirmation has no bounds");
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(1040);
    for (const name of ["Cancel", "Send 1 message"]) {
      await expect(confirmation.getByRole("button", { name, exact: true })).toBeInViewport({ ratio: 1 });
    }
    await expectAccessibleHome(page, info);
    await page.screenshot({
      path: info.outputPath(`outreach-workflow-confirmation-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(observed.writes).toEqual([]);
    expect(observed.errors).toEqual([]);
  });
