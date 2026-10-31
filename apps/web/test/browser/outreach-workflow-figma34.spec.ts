import { expect, test } from "@playwright/test";
import { setupOutreach, recordId, clientId } from "./core109-outreach-fixtures";
import { newCampaign } from "../../src/features/modules/engagement/outreach/campaign-model";
import { expectAccessibleHome } from "../accessibility";

const mailboxId = "80000000-0000-4000-8000-000000000008";
const artifactId = "90000000-0000-4000-8000-000000000009";
const recipient = {
  id: "synthetic-staff",
  name: "Synthetic staff contact",
  email: "staff@example.test",
  kind: "individual",
  role: "to",
};
const generationKey = `individual:${recipient.id}`;
const campaign = {
  id: recordId,
  revision: 3,
  updatedAt: "2026-10-27T00:00:00Z",
  status: "draft",
  state: {
    ...newCampaign(clientId),
    title: "Synthetic staff briefing",
    mainIdea: "Request a briefing about district impact.",
    recipients: [recipient],
    sender: { connectionId: mailboxId, signature: "" },
    lastStep: 7,
  },
};
const current = {
  id: "90000000-0000-4000-8000-000000000010",
  artifactId,
  outreachRecordId: recordId,
  version: 1,
  sourceVersionId: null,
  generationKey,
  recipientKey: recipient.id,
  audienceKind: "individual",
  subject: "Request for a district briefing",
  body: "Hello,\n\nI would welcome a short briefing on current district priorities. Please let me know a convenient time.\n\nThank you.",
  contentHash: "synthetic-content-hash",
  generationStatus: "generated",
  auditStatus: "passed",
  approvalStatus: "not_required",
  auditDecision: null,
  auditChecks: [],
  reviewRequestId: null,
  provider: null,
  model: null,
  promptSpecVersion: null,
  sendable: true,
  createdAt: "2026-10-27T00:00:00Z",
};

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
        page.getByRole("tablist", { name: "Outreach steps" }),
      ).toBeVisible();
      await expect(page.getByRole("tab", { selected: true })).toHaveCount(1);
      if (step === 7)
        await expect(
          page.getByRole("button", { name: "Review send", exact: true }),
        ).toBeEnabled();
      if (step === 6) {
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
