import { expect, test, type Page } from "@playwright/test";
import {
  setupOutreach,
  record,
  recordId,
  clientId,
  otherRecordId,
} from "./core109-outreach-fixtures";
import { newCampaign } from "../../src/features/modules/engagement/outreach/campaign-model";
import { expectAccessibleHome } from "../accessibility";

const summary = {
  id: otherRecordId,
  revision: 2,
  status: "draft",
  updatedAt: "2026-10-27T12:00:00Z",
  createdAt: "2026-10-27T12:00:00Z",
  sentAt: null,
  state: {
    ...newCampaign(clientId),
    title: "Synthetic staff briefing",
    mainIdea: "Share current district evidence",
    decisions: {
      goal: "Request a staff briefing",
      objective: "Share current district impact evidence",
      topic: "FY27 priorities",
      whyNow: "Prepare for funding discussions",
      campaignAngle: "District and mission impact",
    },
  },
  category: "drafts",
  recordedSendStatus: null,
  client: record.client,
  type: "campaign",
  hasWorkflow: true,
  recipientCount: 0,
  draftReadiness: { total: 0, ready: 0 },
  delivery: null,
};
async function fixtures(page: Page) {
  const observed = await setupOutreach(page);
  await page.route("**/api/capiro/engagement.campaigns?*", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    return route.fulfill({
      json: {
        items:
          !input.query.q ||
          summary.state.title
            .toLowerCase()
            .includes(input.query.q.toLowerCase())
            ? [summary]
            : [],
        nextCursor: null,
      },
    });
  });
  await page.route("**/api/capiro/engagement.outreach.records?*", (route) =>
    route.fulfill({
      json: { items: [{ ...record, hasWorkflow: false }], nextCursor: null },
    }),
  );
  await page.route("**/api/capiro/engagement.campaign?*", (route) =>
    route.fulfill({ json: summary }),
  );
  await page.route("**/api/capiro/engagement.campaign.drafts?*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/capiro/engagement.campaign.templates?*", (route) =>
    route.fulfill({ json: [] }),
  );
  return observed;
}
for (const width of [1440, 390])
  test(`current Figma list, decisions and simple draft are accessible at ${width}px`, async ({
    page,
  }, info) => {
    const observed = await fixtures(page);
    await page.setViewportSize({ width, height: 1040 });
    await page.goto("/modules/engagement");
    await expect(
      page.getByRole("heading", { name: "Outreach", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Campaign drafts · 1" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("tab", { name: "Campaign drafts · 1" }),
    ).toHaveCSS("font-weight", "500");
    await expect(
      page.getByRole("button", { name: "+ New outreach", exact: true }),
    ).toHaveCSS("font-weight", "500");
    await expect(
      page.getByText("No recorded send", { exact: true }),
    ).toBeVisible();
    await expectAccessibleHome(page, info);
    await page.screenshot({
      path: info.outputPath(`outreach-list-${width}.png`),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Open campaign", exact: true })
      .click();
    await expect(page.getByLabel("Goal", { exact: true })).toHaveValue(
      summary.state.decisions.goal,
    );
    await expect(page).toHaveURL(/detail=overview/);
    await page.reload();
    await expect(page.getByLabel("Goal", { exact: true })).toHaveValue(
      summary.state.decisions.goal,
    );
    await page.screenshot({
      path: info.outputPath(`outreach-decisions-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "← All outreach" }).click();
    await page
      .getByRole("button", { name: `Open draft: ${record.title}` })
      .click();
    await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
      record.body,
    );
    await expect(
      page.getByRole("button", { name: "Send outreach", exact: true }),
    ).toBeDisabled();
    await expectAccessibleHome(page, info);
    await page.screenshot({
      path: info.outputPath(`outreach-draft-${width}.png`),
      fullPage: true,
    });
    expect(observed.writes).toEqual([]);
    expect(observed.errors).toEqual([]);
  });
test("simple draft saves exactly entered content and reopens without sending", async ({
  page,
}) => {
  const observed = await fixtures(page);
  let saved = record;
  await page.route("**/api/capiro/engagement.outreach.create", (route) => {
    const { body } = route.request().postDataJSON();
    saved = { ...record, ...body, client: record.client };
    return route.fulfill({ json: saved });
  });
  await page.route("**/api/capiro/engagement.outreach.record?*", (route) =>
    route.fulfill({ json: saved }),
  );
  await page.goto(`/modules/engagement?clientId=${clientId}&create=draft`);
  await expect(page.getByLabel("Client", { exact: true })).toBeDisabled();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Synthetic saved follow-up");
  await page.getByLabel("Subject", { exact: true }).fill("Saved subject");
  await page.getByLabel("Body", { exact: true }).fill("Saved body");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Saved subject",
  );
  await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
    "Saved body",
  );
  expect(observed.writes).toEqual([
    "POST /api/capiro/engagement.outreach.create",
  ]);
});
test("decisions save retains revision and every structured field", async ({
  page,
}) => {
  await fixtures(page);
  let request:
    | { body: { expectedRevision: number; state: typeof summary.state } }
    | undefined;
  await page.route("**/api/capiro/engagement.campaign.save", (route) => {
    request = route.request().postDataJSON();
    return route.fulfill({
      json: { ...summary, revision: 3, state: request!.body.state },
    });
  });
  await page.goto(
    `/modules/engagement?session=${otherRecordId}&detail=overview`,
  );
  await page.getByLabel("Goal", { exact: true }).fill("Revised briefing goal");
  await page.getByRole("button", { name: "Save campaign decisions" }).click();
  await expect(
    page.getByRole("button", { name: "Save campaign decisions" }),
  ).toBeDisabled();
  expect(request?.body.expectedRevision).toBe(2);
  expect(request?.body.state.decisions).toEqual({
    ...summary.state.decisions,
    goal: "Revised briefing goal",
  });
});
test("tab classification follows recorded evidence and exposes failed status without send actions", async ({
  page,
}) => {
  const observed = await fixtures(page);
  const failed = {
    ...summary,
    category: "attention",
    recordedSendStatus: "failed",
  };
  await page.route("**/api/capiro/engagement.campaigns?*", (route) =>
    route.fulfill({ json: { items: [failed], nextCursor: null } }),
  );
  await page.route("**/api/capiro/engagement.campaign?*", (route) =>
    route.fulfill({ json: failed }),
  );
  await page.goto("/modules/engagement");
  await page.getByRole("tab", { name: "Needs attention · 1" }).click();
  await page.getByRole("button", { name: "Review status" }).click();
  await expect(page.getByText("Failed", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Send|Retry delivery/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Back to needs attention" }).click();
  await expect(
    page.getByRole("tab", { name: "Needs attention · 1" }),
  ).toHaveAttribute("aria-selected", "true");
  expect(observed.writes).toEqual([]);
});
test("record classification stays fenced while pending and on denied access", async ({
  page,
}) => {
  const observed = await fixtures(page);
  let release: (() => void) | undefined;
  await page.route(
    "**/api/capiro/engagement.outreach.record?*",
    async (route) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.fulfill({
        status: 403,
        json: { message: "Synthetic denied record" },
      });
    },
  );
  await page.goto(`/modules/engagement?draft=${recordId}`);
  await expect(page.getByRole("status").last()).toBeVisible();
  await expect(page.getByLabel("Campaign name", { exact: true })).toHaveCount(
    0,
  );
  release!();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic denied record",
  );
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
  expect(observed.writes).toEqual([]);
});

test("sent classification uses recorded native evidence and opens a read-only sent record", async ({
  page,
}, info) => {
  const observed = await fixtures(page);
  const intentId = "80000000-0000-4000-8000-000000000008";
  let returnedRecordId: string = otherRecordId;
  const sent = {
    ...summary,
    category: "sent",
    recordedSendStatus: "completed",
    recipientCount: 1,
    sentAt: "2026-10-28T00:00:00Z",
    delivery: {
      id: intentId,
      status: "completed",
      totals: { sent: 1 },
      createdAt: "2026-10-28T00:00:00Z",
      finishedAt: "2026-10-28T00:00:00Z",
    },
  };
  await page.route("**/api/capiro/engagement.campaigns?*", (route) =>
    route.fulfill({ json: { items: [sent], nextCursor: null } }),
  );
  await page.route("**/api/capiro/engagement.campaign?*", (route) =>
    route.fulfill({ json: sent }),
  );
  await page.route("**/api/capiro/engagement.outreach.record?*", (route) =>
    route.fulfill({ json: { ...record, id: otherRecordId, status: "sent" } }),
  );
  await page.route("**/api/capiro/engagement.campaign.sendStatus?*", (route) =>
    route.fulfill({
      json: {
        id: intentId,
        outreachRecordId: returnedRecordId,
        status: "completed",
        testMode: false,
        requestKey: intentId,
        totals: { sent: 1 },
        error: null,
        startedAt: "2026-10-28T00:00:00Z",
        finishedAt: "2026-10-28T00:00:00Z",
        createdAt: "2026-10-28T00:00:00Z",
        deliveries: [
          {
            id: intentId,
            generationKey: "individual:synthetic-staff",
            recipientKey: "synthetic-staff",
            status: "sent",
            attempt: 1,
            provider: "google_workspace",
            correlationId: "synthetic-delivery",
            to: [{ email: "staff@example.test" }],
            cc: [],
            bcc: [],
            subject: "Actual immutable delivered subject",
            providerMessageId: null,
            providerThreadId: null,
            providerDraftId: null,
            errorCode: null,
            errorMessage: null,
            acceptedAt: "2026-10-28T00:00:00Z",
          },
        ].flatMap((delivery) => [
          delivery,
          {
            ...delivery,
            id: recordId,
            status: "canceled",
            subject: "Canceled planned subject",
            to: [{ email: "canceled@example.test" }],
            acceptedAt: null,
          },
        ]),
      },
    }),
  );
  await page.goto("/modules/engagement");
  await page.getByRole("tab", { name: "Sent campaigns · 1" }).click();
  await expect(page.getByText("Sent", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "View sent record", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sent outreach record" }),
  ).toBeVisible();
  await expect(
    page.getByText("Actual immutable delivered subject", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(record.subject, { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Canceled planned subject", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("1 recipients", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Send|Save|Retry delivery/ }),
  ).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("outreach-sent.png"),
    fullPage: true,
  });
  returnedRecordId = recordId;
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "The recorded outreach does not match this campaign.",
  );
  await expect(
    page.getByText("Actual immutable delivered subject", { exact: true }),
  ).toHaveCount(0);
  expect(observed.writes).toEqual([]);
});

test("list loading and errors conceal rows, retry recovers, and filtered emptiness can be cleared", async ({
  page,
}) => {
  await fixtures(page);
  let release: (() => void) | undefined;
  let reads = 0;
  await page.route(
    "**/api/capiro/engagement.outreach.records?*",
    async (route) => {
      const input = JSON.parse(
        new URL(route.request().url()).searchParams.get("input")!,
      );
      if (++reads === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return route.fulfill({
          status: 503,
          json: { message: "Synthetic unavailable records" },
        });
      }
      return route.fulfill({
        json: {
          items: input.query.q ? [] : [{ ...record, hasWorkflow: false }],
          nextCursor: null,
        },
      });
    },
  );
  await page.goto("/modules/engagement");
  await expect(page.getByRole("status").last()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open campaign", exact: true }),
  ).toHaveCount(0);
  await expect.poll(() => !!release).toBe(true);
  release!();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic unavailable records",
  );
  await expect(
    page.getByRole("button", { name: "Open campaign", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Open draft: ${record.title}` }),
  ).toBeVisible();
  await page
    .getByLabel("Search outreach", { exact: true })
    .fill("Nothing matches");
  await expect(
    page.getByRole("heading", {
      name: "No outreach records match your filters",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No matching campaigns" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: `Open draft: ${record.title}` }),
  ).toBeVisible();
});

test("saved-record pages remain scoped, hide canonical workflow rows and search the server", async ({
  page,
}) => {
  const observed = await fixtures(page);
  const inputs: {
    query: { cursor?: string; q?: string; clientId?: string };
  }[] = [];
  const later = {
    ...record,
    id: "60000000-0000-4000-8000-000000000006",
    title: "Synthetic later outreach",
    hasWorkflow: false,
  };
  await page.route("**/api/capiro/engagement.outreach.records?*", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    inputs.push(input);
    return route.fulfill({
      json:
        input.query.cursor || input.query.q
          ? { items: [later], nextCursor: null }
          : {
              items: [
                { ...record, hasWorkflow: false },
                {
                  ...record,
                  id: otherRecordId,
                  title: "Already a workflow",
                  hasWorkflow: true,
                },
                ...Array.from({ length: 98 }, (_, index) => ({
                  ...record,
                  id: `70000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
                  title: `Synthetic page one record ${index + 1}`,
                  hasWorkflow: false,
                })),
              ],
              nextCursor: "synthetic-next-page",
            },
    });
  });
  await page.goto(`/modules/engagement?clientId=${clientId}`);
  await expect(page.getByText("Already a workflow")).toHaveCount(0);
  await page.getByRole("button", { name: "Next outreach records" }).click();
  await expect(
    page.getByRole("button", { name: `Open draft: ${later.title}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Open draft: ${record.title}` }),
  ).toHaveCount(0);
  await page
    .getByLabel("Search outreach", { exact: true })
    .fill("Synthetic later");
  await expect.poll(() => inputs.at(-1)?.query.q).toBe("Synthetic later");
  expect(inputs.at(-1)?.query.cursor).toBeUndefined();
  expect(inputs.every((input) => input.query.clientId === clientId)).toBe(true);
  expect(observed.writes).toEqual([]);
});

test("deleted canonical records remain visible without reopening actions", async ({
  page,
}) => {
  const observed = await fixtures(page);
  await page.route("**/api/capiro/engagement.outreach.records?*", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    return route.fulfill({
      json: {
        items:
          input.query.deleted === "true"
            ? [
                {
                  ...record,
                  type: "outreach_v3",
                  status: "deleted",
                  hasWorkflow: true,
                },
              ]
            : [],
        nextCursor: null,
      },
    });
  });
  await page.goto("/modules/engagement");
  await page.getByRole("checkbox", { name: "Deleted only" }).check();
  await expect(page.getByText(record.title, { exact: false })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Open draft|Open record|Open campaign/ }),
  ).toHaveCount(0);
  expect(observed.writes).toEqual([]);
});

test("empty list distinguishes no saved records from filtered matches", async ({
  page,
}) => {
  await fixtures(page);
  await page.route("**/api/capiro/engagement.campaigns?*", (route) =>
    route.fulfill({ json: { items: [], nextCursor: null } }),
  );
  await page.route("**/api/capiro/engagement.outreach.records?*", (route) =>
    route.fulfill({ json: { items: [], nextCursor: null } }),
  );
  await page.goto("/modules/engagement");
  await expect(
    page.getByRole("heading", { name: "No campaign drafts yet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No outreach records yet" }),
  ).toBeVisible();
  await page
    .getByLabel("Search outreach", { exact: true })
    .fill("Unmatched title");
  await expect(
    page.getByRole("heading", {
      name: "No outreach records match your filters",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No outreach records yet" }),
  ).toHaveCount(0);
});

test("converted legacy sessions stay excluded across pages and server goal searches retain matches", async ({
  page,
}) => {
  await fixtures(page);
  const legacy = {
    id: recordId,
    title: "Distinct legacy campaign",
    topic: "District priorities",
    goal: "Support local research",
    status: "active",
    currentStateVersion: 1,
    createdAt: "2026-10-27T00:00:00Z",
    updatedAt: "2026-10-27T00:00:00Z",
    archivedAt: null,
    targetCount: 1,
    recordStatus: "draft",
    sentAt: null,
    hasWorkflow: false,
  };
  let query: { search?: string } | undefined;
  await page.route("**/api/capiro/engagement.sessions?*", (route) => {
    query = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    ).query;
    return route.fulfill({
      json: [
        legacy,
        {
          ...legacy,
          id: otherRecordId,
          title: "Converted legacy copy",
          hasWorkflow: true,
        },
      ],
    });
  });
  await page.route("**/api/capiro/engagement.campaigns?*", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    return route.fulfill({
      json:
        input.query.cursor || input.query.q
          ? { items: [], nextCursor: null }
          : { items: [summary], nextCursor: "next-campaign-page" },
    });
  });
  await page.goto("/modules/engagement");
  await page
    .getByRole("button", { name: "Next campaigns", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Converted legacy copy", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Search outreach", { exact: true })
    .fill("  Support local research  ");
  await expect.poll(() => query?.search).toBe("Support local research");
  await expect(
    page.getByRole("button", { name: legacy.title, exact: true }),
  ).toBeVisible();
});

test("invalid date windows hide both campaign and record rows until corrected", async ({
  page,
}) => {
  const observed = await fixtures(page);
  await page.goto("/modules/engagement");
  await expect(
    page.getByRole("button", { name: "Open campaign", exact: true }),
  ).toBeVisible();
  await page.getByLabel("From", { exact: true }).fill("2026-10-20");
  await page.getByLabel("To", { exact: true }).fill("2026-10-10");
  await expect(page.getByRole("alert")).toContainText(
    "The end date must be on or after the start date.",
  );
  await expect(
    page.getByRole("button", { name: "Open campaign", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: `Open draft: ${record.title}` }),
  ).toHaveCount(0);
  await page.getByLabel("To", { exact: true }).fill("2026-10-25");
  await expect(
    page.getByRole("button", { name: "Open campaign", exact: true }),
  ).toBeVisible();
  expect(observed.writes).toEqual([]);
});

test("a confirmed save rejection permits correction, while unknown create remains fenced after reload", async ({
  page,
}) => {
  await fixtures(page);
  let writes = 0;
  await page.route("**/api/capiro/engagement.outreach.create", (route) => {
    writes++;
    return route.fulfill({
      status: writes === 1 ? 422 : 503,
      json: {
        message:
          writes === 1
            ? "Synthetic validation refusal"
            : "Synthetic acknowledgement loss",
      },
    });
  });
  await page.goto("/modules/engagement?create=draft");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Pending synthetic draft");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic validation refusal",
  );
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic acknowledgement loss",
  );
  await expect(page).toHaveURL(/outreachSave=pending/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(/The save result needs confirmation/),
  ).toBeVisible();
  expect(writes).toBe(2);
});
