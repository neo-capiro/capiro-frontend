import { expect, test, type Route } from "@playwright/test";
import {
  setupOutreach,
  recordId,
  otherRecordId,
  otherClientId,
  clientId,
  record,
} from "./core109-outreach-fixtures";
import { newCampaign } from "../../src/features/modules/engagement/outreach/campaign-model";
const campaign = {
  id: recordId,
  revision: 3,
  updatedAt: "2026-10-27T00:00:00Z",
  status: "draft",
  state: {
    ...newCampaign(),
    title: "Historical campaign",
    mainIdea: "Saved idea",
    lastStep: 2,
  },
};
async function readFixtures(page: Parameters<typeof setupOutreach>[0]) {
  const observed = await setupOutreach(page);
  await page.route("**/api/capiro/engagement.campaign.templates?*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/capiro/engagement.campaign.drafts?*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/capiro/engagement.campaign?*", (route) =>
    route.fulfill({ json: campaign }),
  );
  return observed;
}
test("both historical draft and session links use the same current canonical owner", async ({
  page,
}) => {
  const observed = await readFixtures(page);
  for (const selector of ["draft", "session"]) {
    await page.goto(
      `/modules/engagement?view=meetings&${selector}=${recordId}`,
    );
    await expect(page.getByLabel("Campaign name", { exact: true })).toHaveValue(
      campaign.state.title,
    );
    await expect(
      page.getByRole("tablist", { name: "Outreach steps" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Meetings moved to Portfolio" }),
    ).toHaveCount(0);
  }
  expect(observed.writes).toEqual([]);
});
test("foreign canonical response never opens an editable campaign", async ({
  page,
}) => {
  const observed = await readFixtures(page);
  await page.goto(`/modules/engagement?session=${otherRecordId}`);
  await expect(page.getByRole("alert")).toContainText(
    "does not match this campaign",
  );
  await expect(page.getByLabel("Campaign name", { exact: true })).toHaveCount(
    0,
  );
  expect(observed.writes).toEqual([]);
});
test("historical text with no recipients or versioned drafts remains readable without reopening writes", async ({
  page,
}) => {
  const observed = await readFixtures(page);
  await page.route("**/api/capiro/engagement.campaign?*", (route) =>
    route.fulfill({
      json: {
        ...campaign,
        status: "sent",
        state: { ...campaign.state, clientId: record.client.id },
      },
    }),
  );
  await page.goto(`/modules/engagement?draft=${recordId}`);
  await expect(
    page.getByLabel("Campaign name", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("tab", { name: "Generate & review", exact: true })
    .click();
  await expect(page.getByText(record.subject, { exact: true })).toBeVisible();
  await expect(page.getByText(record.body, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate drafts", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Send", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  expect(observed.writes).toEqual([]);
});
for (const width of [1440, 390])
  test(`canonical save freezes exact submitted state and current revision at ${width}px`, async ({
    page,
  }) => {
    await readFixtures(page);
    await page.setViewportSize({ width, height: 1000 });
    let held: Route | undefined;
    const bodies: {
      params: { id: string };
      body: { expectedRevision: number; state: typeof campaign.state };
    }[] = [];
    await page.route("**/api/capiro/engagement.campaign.save", (route) => {
      held = route;
      bodies.push(route.request().postDataJSON());
    });
    await page.goto(`/modules/engagement?draft=${recordId}`);
    await page
      .getByLabel("Campaign name", { exact: true })
      .fill("Exact submitted title");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => !!held).toBe(true);
    await expect(
      page.getByLabel("Campaign name", { exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "← All outreach" }),
    ).toBeDisabled();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.body.expectedRevision).toBe(3);
    expect(bodies[0]?.body.state.title).toBe("Exact submitted title");
    await held!.fulfill({
      json: { ...campaign, revision: 4, state: bodies[0]!.body.state },
    });
    await expect(
      page.getByLabel("Campaign name", { exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel("Campaign name", { exact: true })).toHaveValue(
      "Exact submitted title",
    );
  });
test("lost create acknowledgement retains exact key across reload and never creates from absent readback", async ({
  page,
}) => {
  await readFixtures(page);
  let writes = 0;
  const queries: string[] = [];
  await page.route("**/api/capiro/engagement.campaign.create", (route) => {
    writes++;
    return route.fulfill({
      status: 503,
      json: { message: "Synthetic acknowledgement loss" },
    });
  });
  await page.route("**/api/capiro/engagement.campaign.request?*", (route) => {
    queries.push(
      JSON.parse(new URL(route.request().url()).searchParams.get("input")!)
        .query.requestKey,
    );
    return route.fulfill({ json: [] });
  });
  await page.goto("/modules/engagement?create=campaign");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Campaign name", { exact: true })
    .fill("Pending campaign");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic acknowledgement loss",
  );
  const key = new URL(page.url()).searchParams.get("campaignRequest");
  expect(key).toBeTruthy();
  await page.reload();
  await page.getByRole("button", { name: "Check saved draft" }).click();
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  expect(queries.every((value) => value === key)).toBe(true);
  expect(writes).toBe(1);
});

// Selected-campaign admission at the mounted UI boundary. These are the cases the
// unit-level list render cannot express: with a campaign in the URL the workflow is
// mounted, and a pending or failed read must not degrade into an editable blank or
// stale campaign.
const selectedCampaign = (state: Record<string, unknown>) => ({
  ...campaign,
  state: { ...campaign.state, clientId, ...state },
});
async function selectedFixtures(
  page: Parameters<typeof setupOutreach>[0],
  respond: (route: Route) => void,
) {
  const observed = await setupOutreach(page);
  await page.route("**/api/capiro/engagement.campaign.templates?*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/capiro/engagement.campaign.drafts?*", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/capiro/engagement.campaign?*", respond);
  return observed;
}
const selectedUrl = (query: string) =>
  `/modules/engagement?clientId=${clientId}&session=${recordId}${query}`;

test("a matching selected campaign opens the editor with zero writes", async ({
  page,
}) => {
  const observed = await selectedFixtures(page, (route) =>
    route.fulfill({ json: selectedCampaign({}) }),
  );
  await page.goto(selectedUrl(""));
  await expect(page.getByLabel("Campaign name", { exact: true })).toHaveValue(
    "Historical campaign",
  );
  expect(observed.writes).toEqual([]);
});

test("a still-loading selected campaign never exposes an editable campaign", async ({
  page,
}) => {
  const observed = await selectedFixtures(page, () => {
    /* never fulfilled: the read stays pending */
  });
  await page.goto(selectedUrl(""));
  // Two independent pending surfaces can be on screen (the screen's client-scope
  // read and the workflow's own read); either way the editor must be absent.
  await expect(page.getByRole("status").first()).toBeVisible();
  await expect(page.getByLabel("Campaign name", { exact: true })).toHaveCount(
    0,
  );
  expect(observed.writes).toEqual([]);
});

for (const status of [404, 403, 503])
  test(`a selected campaign that fails with ${status} never becomes an editable campaign`, async ({
    page,
  }) => {
    const observed = await selectedFixtures(page, (route) =>
      route.fulfill({ status, json: { error: { code: "UNAVAILABLE" } } }),
    );
    await page.goto(selectedUrl(""));
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByLabel("Campaign name", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByText("Historical campaign", { exact: true }),
    ).toHaveCount(0);
    expect(observed.writes).toEqual([]);
  });

for (const [label, client] of [
  ["another client", otherClientId],
  ["no client", null],
] as const)
  test(`a selected campaign bound to ${label} is refused before it can be edited`, async ({
    page,
  }) => {
    const observed = await selectedFixtures(page, (route) =>
      route.fulfill({ json: selectedCampaign({ clientId: client }) }),
    );
    await page.goto(selectedUrl(""));
    await expect(page.getByRole("alert")).toContainText(
      "does not match the selected client",
    );
    await expect(page.getByLabel("Campaign name", { exact: true })).toHaveCount(
      0,
    );
    expect(observed.writes).toEqual([]);
  });
