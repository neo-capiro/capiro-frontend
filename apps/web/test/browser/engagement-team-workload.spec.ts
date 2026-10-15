import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { client, clientId, otherClient, setup } from "./next-modules-fixtures";

const ownerId = "60000000-0000-4000-8000-000000000001";
const closedOwnerId = "60000000-0000-4000-8000-000000000002";
const doneOwnerId = "60000000-0000-4000-8000-000000000003";
const member = {
  id: ownerId,
  clerkUserId: "synthetic-owner",
  email: "owner@example.test",
  name: "Synthetic follow-up owner",
};
const followup = {
  id: "51000000-0000-4000-8000-000000000001",
  title: "Synthetic follow-up",
  status: "todo",
  dueDate: "2026-10-01T16:00:00Z",
  description: null,
  ownerUserId: ownerId,
  client,
};

test("Team groups only open follow-ups and preserves returned owners and overdue counts", async ({
  page,
}) => {
  const queries: unknown[] = [];
  await setup(page, {
    "settings.tenantMembers": [
      member,
      { ...member, id: closedOwnerId, name: "Synthetic closed-only owner" },
      { ...member, id: doneOwnerId, name: "Synthetic done-only owner" },
    ],
    "engagement.tasks": (input) => {
      queries.push(input);
      return [
        followup,
        {
          ...followup,
          id: "51000000-0000-4000-8000-000000000002",
          status: "in_progress",
          dueDate: "2026-10-08T16:00:00Z",
          client: otherClient,
        },
        {
          ...followup,
          id: "51000000-0000-4000-8000-000000000003",
          status: "blocked",
          dueDate: "2026-10-09T16:00:00Z",
        },
        {
          ...followup,
          id: "51000000-0000-4000-8000-000000000004",
          status: "done",
        },
        {
          ...followup,
          id: "51000000-0000-4000-8000-000000000005",
          ownerUserId: closedOwnerId,
          status: "canceled",
        },
        {
          ...followup,
          id: "51000000-0000-4000-8000-000000000006",
          ownerUserId: null,
          client: null,
        },
        {
          ...followup,
          id: "51000000-0000-4000-8000-000000000007",
          ownerUserId: doneOwnerId,
          status: "done",
        },
      ];
    },
  });
  await page.goto("/modules/engagement?view=team");
  const table = page.getByRole("table", {
    name: "Engagement follow-up owners",
  });
  const assigned = table.getByRole("row").filter({ hasText: member.name });
  await expect(assigned.getByRole("cell")).toHaveText([
    member.name,
    `${client.name} · ${otherClient.name}`,
    "3",
    "1 overdue",
  ]);
  await expect(
    table.getByRole("row").filter({ hasText: "Unassigned" }).getByRole("cell"),
  ).toHaveText(["Unassigned", "Unassigned", "1", "1 overdue"]);
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(table).not.toContainText("Synthetic closed-only owner");
  await expect(table).not.toContainText("Synthetic done-only owner");
  expect(queries).toEqual([{ query: {} }]);
});

test("Team retains workload while member names load or fail and retries only the member read", async ({
  page,
}) => {
  let taskReads = 0;
  let memberReads = 0;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await setup(page, {
    "engagement.tasks": (input) => {
      taskReads++;
      expect(input).toEqual({ query: { clientId } });
      return [followup];
    },
  });
  await page.route("**/api/capiro/settings.tenantMembers?*", async (route) => {
    memberReads++;
    if (memberReads === 1) {
      await held;
      return route.fulfill({
        status: 503,
        json: { message: "Synthetic member lookup unavailable" },
      });
    }
    return route.fulfill({ json: [member] });
  });
  await page.goto(`/modules/engagement?clientId=${clientId}&view=team`);
  const table = page.getByRole("table", {
    name: "Engagement follow-up owners",
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Loading team member names" }),
  ).toBeVisible();
  await expect(table.getByRole("row").nth(1).getByRole("cell")).toHaveText([
    "Team member",
    client.name,
    "1",
    "1 overdue",
  ]);
  release();
  const failure = page.getByRole("alert");
  await expect(failure).toContainText(
    "Team member names unavailable: Synthetic member lookup unavailable",
  );
  await expect(table).toContainText("1 overdue");
  await failure
    .getByRole("button", { name: "Retry team member names" })
    .click();
  await expect(table).toContainText(member.name);
  await expect(failure).toHaveCount(0);
  expect(memberReads).toBe(2);
  expect(taskReads).toBe(1);
});
