import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import {
  assertNoEffects,
  clientId,
  otherClientId,
  record,
  recordId,
  setupOutreach,
} from "./core109-outreach-fixtures";
import { session, sessionId } from "../../tests/newsletter-staging-fixtures";

const meetingId = "70000000-0000-4000-8000-000000000007";

test("Engagement opens directly to Outreach with no obsolete sections or meeting action", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  await page.goto("/modules/engagement");
  await expect(
    page.getByRole("heading", { name: "Engagement", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Outreach campaigns" }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Outreach records" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "+ New outreach" }),
  ).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  for (const name of ["New meeting", "Open reports", "Reports"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  }
  await mkdir("test-results/figma34-desktop", { recursive: true });
  await page.screenshot({
    path: "test-results/figma34-desktop/engagement.png",
  });
  assertNoEffects(observed);
});

test("legacy non-meeting view hints still show Outreach, and client selection keeps its scope", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  await page.goto(`/modules/engagement?view=reports&clientId=${clientId}`);
  await expect(
    page.getByRole("table", { name: "Outreach records" }),
  ).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  const scope = page.getByRole("combobox", { name: "Engagement client scope" });
  await expect(scope).toHaveValue(clientId);
  await scope.selectOption(otherClientId);
  await expect(page).toHaveURL(`/modules/engagement?clientId=${otherClientId}`);
  await expect(scope).toHaveValue(otherClientId);
  await expect(
    page.getByRole("table", { name: "Outreach records" }),
  ).toBeVisible();
  assertNoEffects(observed);
});

test("draft and create deep links remain available in the Outreach-only screen", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  await page.goto(`/modules/engagement?clientId=${clientId}&draft=${recordId}`);
  await expect(
    page.getByRole("dialog", { name: "Outreach draft" }),
  ).toBeVisible();
  await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
    record.body,
  );
  await expect(page.getByRole("tab")).toHaveCount(0);
  await page.goto(
    `/modules/engagement?clientId=${clientId}&create=draft&directoryContactId=synthetic-contact`,
  );
  await expect(
    page.getByRole("dialog", { name: "New outreach" }),
  ).toBeVisible();
  await expect(
    page.getByText("Created from a directory selection.", { exact: false }),
  ).toBeVisible();
  assertNoEffects(observed);
});

test("existing campaign session link still opens its current Outreach editor", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  await page.route("**/api/capiro/engagement.session?*", (route) =>
    route.fulfill({ json: session }),
  );
  await page.goto(`/modules/engagement?view=outreach&session=${sessionId}`);
  await expect(
    page.getByRole("heading", { name: session.spec.goal.topic }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save campaign decisions" }),
  ).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  assertNoEffects(observed);
});

test("newsletter and Objective destination hints keep their dedicated route guards", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  await page.goto(
    "/modules/engagement?view=outreach&newsletterStage=90000000-0000-4000-8000-000000000009",
  );
  await expect(
    page.getByRole("heading", { name: "Rich newsletter unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Outreach records" }),
  ).toHaveCount(0);
  await page.goto(
    `/modules/engagement?clientId=${clientId}&objectiveId=90000000-0000-4000-8000-000000000009&objectiveVersion=7`,
  );
  await expect(
    page.getByRole("heading", { name: "Objective destination unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Outreach records" }),
  ).toHaveCount(0);
  assertNoEffects(observed);
});

test("old Modules meeting link points to scoped Portfolio Calendar without reading meeting detail", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  let meetingReads = 0;
  page.on("request", (request) => {
    if (
      /\/api\/(?:capiro\/engagement\.meeting|backend\/core\/engagement\/meetings\/)/.test(
        new URL(request.url()).pathname,
      )
    ) {
      meetingReads++;
    }
  });
  await page.goto(
    `/modules/engagement?view=meetings&clientId=${clientId}&meeting=${meetingId}`,
  );
  await expect(
    page.locator(
      `a[href="/portfolio/${clientId}/calendar?meeting=${meetingId}&objectiveMeeting=1"]`,
    ),
  ).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  expect(meetingReads).toBe(0);
  assertNoEffects(observed);
});

test("saved meeting-library link leads to the selected client's Portfolio library", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  await page.goto(`/modules/engagement?view=library&clientId=${clientId}`);
  const destination = page.getByRole("link", {
    name: "Open Portfolio meeting library",
  });
  await expect(destination).toHaveAttribute(
    "href",
    `/portfolio/${clientId}/calendar?library=1`,
  );
  await expect(page.getByRole("tab")).toHaveCount(0);
  assertNoEffects(observed);
  await destination.click();
  await expect(page).toHaveURL(`/portfolio/${clientId}/calendar?library=1`);
});

test("stale Meetings view hint cannot displace draft, session, or create Outreach intents", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  await page.route("**/api/capiro/engagement.session?*", (route) =>
    route.fulfill({ json: session }),
  );
  await page.goto(
    `/modules/engagement?view=meetings&clientId=${clientId}&draft=${recordId}`,
  );
  await expect(
    page.getByRole("dialog", { name: "Outreach draft" }),
  ).toBeVisible();
  await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
    record.body,
  );
  await expect(
    page.getByRole("heading", { name: "Meetings moved to Portfolio" }),
  ).toHaveCount(0);
  await page.goto(`/modules/engagement?view=meetings&session=${sessionId}`);
  await expect(
    page.getByRole("heading", { name: session.spec.goal.topic }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Meetings moved to Portfolio" }),
  ).toHaveCount(0);
  await page.goto(
    `/modules/engagement?view=meetings&clientId=${clientId}&create=draft`,
  );
  await expect(
    page.getByRole("dialog", { name: "New outreach" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Meetings moved to Portfolio" }),
  ).toHaveCount(0);
  assertNoEffects(observed);
});

test("selected-client V3 outreach record remains visible without mounting the plain draft editor", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  const v3 = {
    ...record,
    title: "Synthetic client V3 campaign record",
    type: "outreach_v3",
  };
  await page.route("**/api/capiro/engagement.outreach?*", (route) =>
    route.fulfill({ json: [v3] }),
  );
  await page.goto(`/modules/engagement?clientId=${clientId}`);
  await expect(
    page.getByRole("table", { name: "Outreach records" }).getByText(v3.title),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: v3.title })).toHaveCount(0);
  await page.getByText(v3.title, { exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(observed.reads).toEqual([]);
  assertNoEffects(observed);
});

test("Outreach date filters send UTC start and exclusive end for the chosen inclusive dates", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  const inputs: unknown[] = [];
  await page.route("**/api/capiro/engagement.outreach?*", (route) => {
    inputs.push(
      JSON.parse(new URL(route.request().url()).searchParams.get("input")!),
    );
    return route.fulfill({ json: [] });
  });
  await page.goto("/modules/engagement");
  await page.getByLabel("To", { exact: true }).fill("2026-10-12");
  await page.getByLabel("From", { exact: true }).fill("2026-10-10");
  await expect
    .poll(() =>
      inputs.some((input) => {
        const query = (input as { query?: Record<string, unknown> }).query;
        return (
          query?.from === "2026-10-10T00:00:00.000Z" &&
          query.to === "2026-10-13T00:00:00.000Z" &&
          query.deleted === "false" &&
          query.limit === 500
        );
      }),
    )
    .toBe(true);
  assertNoEffects(observed);
});

test("an inverted Outreach date window hides rows without issuing a read for that range", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  const inputs: { query: { from?: string; to?: string } }[] = [];
  await page.route("**/api/capiro/engagement.outreach?*", (route) => {
    inputs.push(
      JSON.parse(new URL(route.request().url()).searchParams.get("input")!),
    );
    return route.fulfill({ json: [record] });
  });
  await page.goto("/modules/engagement");
  await expect(page.getByRole("button", { name: record.title })).toBeVisible();
  await page.getByLabel("From", { exact: true }).fill("2026-10-09");
  await page.getByLabel("To", { exact: true }).fill("2026-10-10");
  await expect
    .poll(() =>
      inputs.some(
        (input) =>
          input.query.from === "2026-10-09T00:00:00.000Z" &&
          input.query.to === "2026-10-11T00:00:00.000Z",
      ),
    )
    .toBe(true);
  const beforeInvalid = inputs.length;
  await page.getByLabel("From", { exact: true }).fill("2026-10-11");
  await expect(page.getByRole("alert")).toContainText(
    "The end date must be on or after the start date.",
  );
  await expect(page.getByRole("button", { name: record.title })).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  expect(inputs).toHaveLength(beforeInvalid);
  assertNoEffects(observed);
});

test("Show deleted requests deleted-only rows and never opens a deleted draft", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  const deleted = {
    ...record,
    title: "Synthetic deleted draft",
    status: "deleted",
  };
  const inputs: { query: { deleted?: string } }[] = [];
  await page.route("**/api/capiro/engagement.outreach?*", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    inputs.push(input);
    return route.fulfill({
      json: input.query.deleted === "true" ? [deleted] : [record],
    });
  });
  await page.goto("/modules/engagement");
  await expect(page.getByRole("button", { name: record.title })).toBeVisible();
  await page.getByRole("checkbox", { name: "Show deleted" }).check();
  await expect.poll(() => inputs.at(-1)?.query.deleted).toBe("true");
  await expect(
    page.getByRole("heading", { name: "Deleted outreach" }),
  ).toBeVisible();
  await expect(page.getByText(deleted.title, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: deleted.title })).toHaveCount(
    0,
  );
  await page.getByText(deleted.title, { exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(observed.reads).toEqual([]);
  assertNoEffects(observed);
});

test("client scope does not fetch or show owner-only campaign sessions", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  let sessionReads = 0;
  await page.route("**/api/capiro/engagement.sessions?*", (route) => {
    sessionReads++;
    return route.fulfill({
      json: [
        {
          ...session.session,
          topic: "Synthetic owner campaign",
          goal: "Synthetic goal",
          targetCount: 1,
          recordStatus: "draft",
          sentAt: null,
        },
      ],
    });
  });
  await page.goto(`/modules/engagement?clientId=${clientId}`);
  await expect(
    page.getByText(
      /Campaign sessions are available under All permitted clients/,
    ),
  ).toBeVisible();
  await expect(page.getByText("Synthetic owner campaign")).toHaveCount(0);
  await expect(
    page.getByRole("table", { name: "Outreach campaigns" }),
  ).toHaveCount(0);
  expect(sessionReads).toBe(0);
  await page
    .getByRole("combobox", { name: "Engagement client scope" })
    .selectOption("");
  await expect.poll(() => sessionReads).toBe(1);
  await expect(
    page.getByRole("button", { name: "Synthetic owner campaign" }),
  ).toBeVisible();
  assertNoEffects(observed);
});
