import { expect, test, type Page } from "@playwright/test";
import { client, json } from "./fixtures";
import {
  firstStrategyId,
  installWorkFixtures,
  otherClientId,
  secondStrategyId,
  workDrafts,
} from "./work-boundary-fixtures";

const member = {
  id: "11000000-0000-4000-8000-000000000001",
  clerkUserId: "user_synthetic_owner",
  name: "Synthetic Jordan Clayton",
  email: "jordan@example.test",
};
const memberRoute = "**/api/capiro/settings.tenantMembers*";

async function installOwners(page: Page) {
  const fixture = await installWorkFixtures(page);
  const { state, requests } = fixture;
  state.details = structuredClone(state.details);
  state.details[firstStrategyId]!.ownerUserId = member.clerkUserId;
  state.details[firstStrategyId]!.nodes.forEach((node) => {
    node.ownerUserId = member.clerkUserId;
  });
  state.drafts = state.drafts.map((draft) => ({
    ...draft,
    ownerId: member.clerkUserId,
  }));
  const owners = { status: 200, members: [member] };
  await page.route(memberRoute, (route) => {
    requests.push(
      `${route.request().method()} ${new URL(route.request().url()).pathname}`,
    );
    return json(
      route,
      owners.status === 200
        ? owners.members
        : { message: "Synthetic member refusal" },
      owners.status,
    );
  });
  return { ...fixture, owners };
}

async function openWork(page: Page, authority = false) {
  await page.clock.setFixedTime(new Date("2026-10-11T12:00:00Z"));
  await page.goto(
    authority ? "/work-owner-authority.html" : "/work-boundary.html",
  );
}

function documentRow(page: Page) {
  return page.getByRole("row").filter({ hasText: workDrafts[0]!.docTitle });
}

function firstStrategy(page: Page) {
  return page
    .getByRole("region", { name: "Strategies", exact: true })
    .getByRole("article")
    .first();
}

test("upcoming nodes display their individual native status", async ({
  page,
}) => {
  await installOwners(page);
  await openWork(page);
  const upcoming = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Upcoming work", exact: true }),
  });
  const first = upcoming
    .getByText("Synthetic first upcoming step", { exact: true })
    .locator("..");
  const second = upcoming
    .getByText("Synthetic independent upcoming step", { exact: true })
    .locator("..");
  await expect(first.getByText("active", { exact: true })).toBeVisible();
  await expect(first.getByText("in progress", { exact: true })).toHaveCount(0);
  await expect(second.getByText("in progress", { exact: true })).toBeVisible();
  await expect(second.getByText("active", { exact: true })).toHaveCount(0);
});

for (const width of [1088, 390]) {
  test(`supplied native owner labels appear in document and all node projections at ${width}px`, async ({
    page,
  }, testInfo) => {
    const { requests, unexpected } = await installOwners(page);
    await page.setViewportSize({ width, height: 1040 });
    await openWork(page);
    await expect(
      documentRow(page).getByLabel(`Owner: ${member.name}`),
    ).toBeVisible();
    await expect(
      firstStrategy(page).getByText(`Owner: ${member.name}`, { exact: true }),
    ).toHaveCount(3);
    const upcoming = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Upcoming work", exact: true }),
    });
    const risks = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: "Risks & blockers",
        exact: true,
      }),
    });
    await expect(
      upcoming.getByText(`Owner: ${member.name}`, { exact: true }),
    ).toBeVisible();
    const firstUpcoming = upcoming
      .getByText("Synthetic first upcoming step", { exact: true })
      .locator("..");
    const secondUpcoming = upcoming
      .getByText("Synthetic independent upcoming step", { exact: true })
      .locator("..");
    await expect(
      firstUpcoming.getByText("active", { exact: true }),
    ).toBeVisible();
    await expect(
      secondUpcoming.getByText("in progress", { exact: true }),
    ).toBeVisible();
    await expect(
      risks.getByText(`Owner: ${member.name}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(member.clerkUserId, { exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`work-owners-${width}.png`),
      fullPage: true,
    });
    expect(requests.every((request) => request.startsWith("GET "))).toBe(true);
    expect(unexpected).toEqual([]);
  });
}

test("null nodes stay unassigned while unknown, empty and Core UUID owners remain unresolved", async ({
  page,
}) => {
  const { state } = await installOwners(page);
  state.details[firstStrategyId]!.nodes[0]!.ownerUserId = null;
  state.details[firstStrategyId]!.nodes[1]!.ownerUserId = "user_unknown";
  state.details[secondStrategyId]!.nodes[0]!.ownerUserId = "";
  state.drafts[0]!.ownerId = member.id;
  await openWork(page);
  await expect(
    documentRow(page).getByLabel("Owner: Owner unavailable"),
  ).toBeVisible();
  await expect(
    firstStrategy(page).getByText("Owner: Unassigned", { exact: true }),
  ).toBeVisible();
  await expect(
    firstStrategy(page).getByText("Owner: Owner unavailable", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("user_unknown", { exact: true })).toHaveCount(0);
});

for (const status of [403, 503]) {
  test(`a new member read with ${status} withholds previous labels and retry admits only the new response`, async ({
    page,
  }) => {
    const { owners } = await installOwners(page);
    await openWork(page);
    await expect(
      documentRow(page).getByLabel(`Owner: ${member.name}`),
    ).toBeVisible();
    owners.status = status;
    await page.evaluate(() => window.__workBoundary!.remount());
    await expect(
      page.getByText("Owner names could not be loaded."),
    ).toBeVisible();
    await expect(
      documentRow(page).getByLabel("Owner: Owner unavailable"),
    ).toBeVisible();
    await expect(page.getByText(member.name, { exact: true })).toHaveCount(0);
    await expect(
      page.getByText(`Owner: ${member.name}`, { exact: true }),
    ).toHaveCount(0);
    let release = () => {};
    let started = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(memberRoute, async (route) => {
      started = true;
      await gate;
      await json(route, [{ ...member, name: "Synthetic current owner name" }]);
    });
    try {
      await page.getByRole("button", { name: "Retry owner names" }).click();
      await expect.poll(() => started).toBe(true);
      await expect(
        documentRow(page).getByLabel("Owner: Owner unavailable"),
      ).toBeVisible();
      await expect(page.getByText(member.name, { exact: true })).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Retry owner names" }),
      ).toHaveCount(0);
    } finally {
      release();
    }
    await expect(
      documentRow(page).getByLabel("Owner: Synthetic current owner name"),
    ).toBeVisible();
  });
}

test("malformed member data is unavailable while documents and node destinations remain usable", async ({
  page,
}) => {
  await installOwners(page);
  await page.route(memberRoute, (route) =>
    json(route, [{ id: member.id, name: member.name }]),
  );
  await openWork(page);
  await expect(
    page.getByText("Owner names could not be loaded."),
  ).toBeVisible();
  await expect(
    documentRow(page).getByLabel("Owner: Owner unavailable"),
  ).toBeVisible();
  await expect(
    documentRow(page).getByRole("link", { name: "Open workspace" }),
  ).toBeVisible();
  await expect(
    firstStrategy(page).getByRole("link", { name: "Open step ↗" }),
  ).toHaveCount(2);
});

for (const replacement of [
  "user",
  "session",
  "organization",
  "client",
] as const) {
  test(`a held member result cannot cross actual application ${replacement} replacement`, async ({
    page,
  }) => {
    const { state, owners } = await installOwners(page);
    let release = () => {};
    let reads = 0;
    let oldReadReleased = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(memberRoute, async (route) => {
      reads += 1;
      if (reads === 1) {
        await gate;
        await json(route, [member]);
        oldReadReleased = true;
      } else await json(route, owners.members);
    });
    await openWork(page, true);
    await expect.poll(() => reads).toBe(1);
    owners.members = [{ ...member, name: "Synthetic replacement owner" }];
    try {
      if (replacement === "client") {
        const next = {
          ...client,
          id: otherClientId,
          name: "Synthetic replacement client",
        };
        state.clients = [client, next];
        state.drafts = state.drafts.map((draft) => ({
          ...draft,
          client: next.name,
        }));
        state.summaries = state.summaries.map((strategy) => ({
          ...strategy,
          clientId: otherClientId,
        }));
        for (const detail of Object.values(state.details))
          detail.clientId = otherClientId;
        await page.route(`**/core/clients/${otherClientId}`, (route) =>
          json(route, next),
        );
        await page.evaluate((id) => {
          history.pushState({}, "", `/portfolio/${id}/work`);
          dispatchEvent(new PopStateEvent("popstate"));
        }, otherClientId);
      } else {
        const field = {
          user: "userId",
          session: "sessionId",
          organization: "orgId",
        }[replacement];
        await page.evaluate(
          (key) =>
            dispatchEvent(
              new CustomEvent("test:session", {
                detail: { [key]: "synthetic-replacement" },
              }),
            ),
          field,
        );
      }
      await expect.poll(() => reads).toBe(2);
      await expect(
        documentRow(page).getByLabel("Owner: Synthetic replacement owner"),
      ).toBeVisible();
    } finally {
      release();
    }
    await expect.poll(() => oldReadReleased).toBe(true);
    await expect(
      documentRow(page).getByLabel("Owner: Synthetic replacement owner"),
    ).toBeVisible();
    await expect(page.getByText(member.name, { exact: true })).toHaveCount(0);
  });
}

test("member-read session expiry removes owner labels and Work through the shared application boundary", async ({
  page,
}) => {
  await installOwners(page);
  await page.route(memberRoute, (route) =>
    json(route, { message: "Synthetic expired session" }, 401),
  );
  await openWork(page, true);
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Client work" })).toHaveCount(
    0,
  );
  await expect(page.getByText(member.name, { exact: true })).toHaveCount(0);
});
