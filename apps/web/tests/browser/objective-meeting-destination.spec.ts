import { expect, test } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";

const meetingId = "40000000-0000-4000-8000-000000000001";
const otherClientId = "10000000-0000-4000-8000-000000000002";
const meeting = {
  id: meetingId,
  subject: "Synthetic linked Portfolio meeting",
  description: null,
  location: null,
  startsAt: "2026-10-17T14:00:00Z",
  endsAt: "2026-10-17T15:00:00Z",
  status: "scheduled",
  joinLink: null,
  visibility: "private",
  isVirtual: false,
  meri: null,
  client: { id: clientId, name: "Test Aerospace" },
  attendees: [],
  preps: [],
};
const url = (query: string) => `/portfolio/${clientId}/calendar?${query}`;

test("linked Objective meeting opens the current Portfolio detail", async ({
  page,
}) => {
  await installFixtures(page);
  let detailReads = 0;
  await page.route(
    `**/core/engagement/meetings/${meetingId}?clientId=${clientId}`,
    (route) => {
      detailReads++;
      return json(route, meeting);
    },
  );
  await page.goto(url(`meeting=${meetingId}&objectiveMeeting=1`));
  await expect(
    page.getByRole("dialog", { name: meeting.subject }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preparation", exact: true }),
  ).toBeVisible();
  expect(detailReads).toBeGreaterThan(0);
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(page).not.toHaveURL(/objectiveMeeting=/);
});

test("malformed and duplicate Objective selectors do not read a meeting", async ({
  page,
}) => {
  await installFixtures(page);
  let detailReads = 0;
  page.on("request", (request) => {
    if (/\/core\/engagement\/meetings\//.test(request.url())) detailReads++;
  });
  for (const query of [
    "meeting=invalid&objectiveMeeting=1",
    `meeting=${meetingId}&meeting=${meetingId}&objectiveMeeting=1`,
  ]) {
    await page.goto(url(query));
    await expect(page.getByRole("alert")).toContainText(
      "This meeting link is invalid.",
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.goto(
    url(`meeting=${meetingId}&objectiveMeeting=1&clientId=${otherClientId}`),
  );
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(detailReads).toBe(0);
});

test("foreign Portfolio meeting receipt withholds its workspace", async ({
  page,
}) => {
  await installFixtures(page);
  await page.route(
    `**/core/engagement/meetings/${meetingId}?clientId=${clientId}`,
    (route) =>
      json(route, {
        ...meeting,
        client: { id: otherClientId, name: "Other client" },
      }),
  );
  await page.goto(url(`meeting=${meetingId}&objectiveMeeting=1`));
  await expect(page.getByRole("alert")).toContainText(
    "This meeting is not associated with the selected client.",
  );
  await expect(page.getByText(meeting.subject)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Preparation", exact: true }),
  ).toHaveCount(0);
});
