import { expect, test, type Page } from "@playwright/test";
import type { Meeting } from "../../src/features/portfolio/calendar/contracts";
import { client, clientId, installFixtures, json } from "./fixtures";

const anduril = { ...client, name: "Anduril" };
const meeting = (
  id: string,
  subject: string,
  startsAt: string,
  endsAt: string,
  options: Partial<Meeting> = {},
): Meeting => ({
  id,
  subject,
  startsAt,
  endsAt,
  description: null,
  location: "Zoom",
  status: "scheduled",
  joinLink: "https://meet.example.test/join",
  visibility: "private",
  isVirtual: true,
  meri: null,
  client: { id: clientId, name: anduril.name },
  attendees: [
    { id: "one", name: "Jordan Clayton", email: null, role: "Organizer" },
    { id: "two", name: "Nina Moore", email: null, role: "Staff" },
    { id: "three", name: "Synthetic staff", email: null, role: "Staff" },
  ],
  preps: [],
  notes: [],
  debriefs: [],
  ...options,
});

const meetings = [
  meeting(
    "MTG-1038",
    "Fallon office · Anduril",
    "2026-09-30T18:00:00Z",
    "2026-09-30T18:45:00Z",
    {
      preps: [
        {
          id: "prep-one",
          status: "approved",
          summary: "Prior preparation",
          agenda: [],
          talkingPoints: [],
          risks: [],
          followUps: [],
          emailEvidence: [],
          createdAt: "2026-09-29T12:00:00Z",
        },
      ],
      notes: [{ id: "note-one", status: "approved" }],
      debriefs: [{ id: "debrief-one", status: "approved" }],
    },
  ),
  meeting(
    "MTG-1039",
    "Staff call · Anduril",
    "2026-10-01T15:00:00Z",
    "2026-10-01T15:30:00Z",
    {
      location: "Teams",
      preps: [
        {
          id: "prep-two",
          status: "generated",
          summary: "Staff prep",
          agenda: [],
          talkingPoints: [],
          risks: [],
          followUps: [],
          emailEvidence: [],
          createdAt: "2026-09-30T12:00:00Z",
        },
      ],
      notes: [{ id: "note-two", status: "approved" }],
      debriefs: [{ id: "debrief-two", status: "draft" }],
    },
  ),
  meeting(
    "MTG-1041",
    "Strategy review · Anduril",
    "2026-10-05T13:30:00Z",
    "2026-10-05T14:15:00Z",
    {
      preps: [
        {
          id: "prep-three",
          status: "generated",
          summary: "Review strategy",
          agenda: [],
          talkingPoints: [],
          risks: [],
          followUps: [],
          emailEvidence: [],
          createdAt: "2026-10-04T12:00:00Z",
        },
      ],
    },
  ),
  meeting(
    "MTG-1040",
    "HAC-D staff call",
    "2026-10-07T14:00:00Z",
    "2026-10-07T14:45:00Z",
    {
      preps: [
        {
          id: "prep-four",
          status: "generated",
          summary: "HAC-D meeting prep",
          agenda: [],
          talkingPoints: [],
          risks: [],
          followUps: [],
          emailEvidence: [],
          createdAt: "2026-10-06T12:00:00Z",
        },
      ],
      notes: [{ id: "note-four", status: "approved" }],
      debriefs: [{ id: "debrief-four", status: "draft" }],
    },
  ),
  meeting(
    "MTG-1042",
    "FY27 counter-UAS staff briefing",
    "2026-10-12T14:00:00Z",
    "2026-10-12T14:45:00Z",
    {
      preps: [
        {
          id: "prep-five",
          status: "generated",
          summary:
            "Validate the FY27 counter-UAS request and confirm the evidence staff need before markup.",
          agenda: [
            "Operational gap and client context",
            "District production and testing evidence",
            "Questions, owners and next conversation",
          ],
          talkingPoints: ["Explain deployment readiness and district impact."],
          risks: ["Confirm what evidence staff need."],
          followUps: [],
          emailEvidence: [],
          createdAt: "2026-10-07T12:00:00Z",
        },
      ],
    },
  ),
  meeting(
    "MTG-1043",
    "SAC-D defense staff call",
    "2026-10-14T18:00:00Z",
    "2026-10-14T18:45:00Z",
    {
      location: "Teams",
    },
  ),
];
const archiveMeetings = ["MTG-1038", "MTG-1040", "MTG-1039"].flatMap(
  (id, index) =>
    meetings
      .filter((item) => item.id === id)
      .map((item) => ({
        ...item,
        id: `90000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      })),
);

async function installCalendarFixtures(page: Page) {
  const unexpected = await installFixtures(page);
  await page.route("**/api/backend/core/clients", (route) =>
    json(route, [anduril]),
  );
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    json(route, anduril),
  );
  await page.route("**/api/backend/core/engagement/capabilities", (route) =>
    json(route, {
      meetingPrepComprehensiveEnabled: false,
      runtime: { externalActionsEnabled: true },
    }),
  );
  await page.route("**/api/backend/core/engagement/integrations", (route) =>
    json(route, []),
  );
  await page.route("**/api/backend/core/engagement/meetings**", (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET")
      return json(route, { message: "Unexpected synthetic mutation" }, 500);
    if (url.pathname.endsWith("/meetings")) {
      const from = url.searchParams.get("from") ?? "";
      const to = url.searchParams.get("to") ?? "";
      return json(
        route,
        meetings.filter((item) => item.startsAt >= from && item.startsAt < to),
      );
    }
    if (url.pathname.endsWith("/meetings/library"))
      return json(route, {
        data: archiveMeetings.map((item) => ({
          id: item.id,
          subject: item.subject,
          startsAt: item.startsAt,
          client: item.client,
          visibility: item.visibility,
          libraryQualifiedBy: [{ kind: "prep", current: true }],
        })),
        total: 3,
        page: 1,
        limit: 50,
      });
    if (url.pathname.endsWith("/notetaker")) return json(route, null);
    if (url.pathname.endsWith("/notes")) return json(route, []);
    if (url.pathname.endsWith("/debriefs"))
      return json(route, [
        {
          id: "debrief-four",
          meetingId: "MTG-1040",
          clientId,
          body: "Recap\nStaff requested a two-page evidence summary.\n\nAction items\nNina Moore · Prepare the district impact one-pager",
          restricted: false,
          confidential: false,
          status: "draft",
          createdAt: "2026-10-07T16:00:00Z",
          updatedAt: "2026-10-07T16:00:00Z",
          sharedAt: null,
        },
      ]);
    const selected = [...meetings, ...archiveMeetings].find((item) =>
      url.pathname.endsWith(`/meetings/${item.id}`),
    );
    return json(
      route,
      selected ?? { message: "Synthetic meeting unavailable" },
      selected ? 200 : 404,
    );
  });
  return unexpected;
}

async function expectClientMeetingsHeader(page: Page) {
  const header = page.locator("header.pageHeader");
  await expect(
    header.getByRole("heading", { name: "Anduril meetings" }),
  ).toBeVisible();
  const actions = ["Sync calendar", "Meeting Library", "New meeting"];
  await expect(header.getByRole("button")).toHaveText(actions);
  for (const action of actions)
    await expect(
      header.getByRole("button", { name: action, exact: true }),
    ).toBeVisible();
}

test("client calendar desktop views follow the Portfolio 3.4 frames", async ({
  page,
}) => {
  const unexpected = await installCalendarFixtures(page);
  await page.goto(
    `/portfolio/${clientId}/calendar?view=agenda&date=2026-10-08&zone=America%2FNew_York`,
  );
  await expectClientMeetingsHeader(page);
  await expect(
    page.getByRole("row", { name: /FY27 counter-UAS staff briefing/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "../../evidence/playwright/calendar-header/agenda-1440x1040.png",
  });

  await page
    .getByRole("group", { name: "Calendar view" })
    .getByRole("button", { name: "Month" })
    .click();
  await expectClientMeetingsHeader(page);
  await expect(page.locator('[data-view="month"]')).toBeVisible();
  await expect(page.locator('[data-view="month"]')).toContainText(
    "Fallon office",
  );
  await page.screenshot({
    path: "../../evidence/playwright/calendar-header/month-1440x1040.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Sync calendar" }).click();
  const sync = page.getByRole("dialog", { name: "Sync calendar" });
  await expect(sync).toBeVisible();
  await sync.locator('[data-slot="dialog-close"]').click();
  await page.getByRole("button", { name: "New meeting" }).click();
  const create = page.getByRole("dialog", { name: "New meeting" });
  await expect(create).toBeVisible();
  await create.locator('[data-slot="dialog-close"]').click();

  await page
    .getByRole("group", { name: "Calendar view" })
    .getByRole("button", { name: "Week" })
    .click();
  await expectClientMeetingsHeader(page);
  await expect(page.locator('[data-view="week"]')).toBeVisible();
  await expect(page.locator('[data-view="week"]')).toContainText(
    "Strategy review",
  );
  await page.screenshot({
    path: "../../evidence/playwright/calendar-header/week-1440x1040.png",
    animations: "disabled",
  });

  await page
    .getByRole("group", { name: "Calendar view" })
    .getByRole("button", { name: "Agenda" })
    .click();
  await expectClientMeetingsHeader(page);
  await page
    .getByRole("button", { name: "FY27 counter-UAS staff briefing" })
    .click();
  const prep = page.getByRole("dialog", {
    name: "FY27 counter-UAS staff briefing",
  });
  await prep.getByRole("button", { name: "Preparation" }).click();
  await expectClientMeetingsHeader(page);
  await expect(
    prep.getByRole("button", { name: "Preparation" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "../../evidence/playwright/calendar-header/prep-1440x1040.png",
  });
  await page.getByRole("button", { name: "HAC-D staff call" }).click();
  const debrief = page.getByRole("dialog", { name: "HAC-D staff call" });
  await expectClientMeetingsHeader(page);
  await expect(
    debrief.getByRole("button", { name: "Debriefs" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "../../evidence/playwright/calendar-header/debrief-1440x1040.png",
  });

  await debrief.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Meeting Library" }).click();
  await expect(
    page.getByRole("heading", { name: "Meeting Library" }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Approved meeting archive" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../../evidence/playwright/calendar-header/library-1440x1040.png",
  });
  expect(unexpected).toEqual([]);
});

test("Escape from a nested meeting editor leaves the client workspace open", async ({
  page,
}) => {
  const unexpected = await installCalendarFixtures(page);
  const selected = meetings.find((item) => item.id === "MTG-1042")!;
  await page.goto(
    `/portfolio/${clientId}/calendar?view=agenda&date=2026-10-08&zone=America%2FNew_York&meeting=${selected.id}`,
    { waitUntil: "commit" },
  );
  const workspace = page.getByRole("dialog", {
    name: selected.subject,
    exact: true,
  });
  await workspace.getByText("More actions", { exact: true }).click();
  await workspace.getByRole("button", { name: "Edit meeting" }).click();
  const editor = page.getByRole("dialog", {
    name: "Edit meeting",
    exact: true,
  });
  await expect(editor).toBeVisible();
  await editor
    .getByLabel("Subject", { exact: true })
    .fill("Unsaved local edit");
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
  await expect(workspace).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`meeting=${selected.id}$`));
  expect(unexpected).toEqual([]);
});

test("Escape cannot discard a nested meeting editor during its pending save", async ({
  page,
}, testInfo) => {
  const unexpected = await installCalendarFixtures(page);
  const selected = meetings.find((item) => item.id === "MTG-1042")!;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes: Record<string, unknown>[] = [];
  await page.route(
    `**/api/backend/core/engagement/meetings/${selected.id}`,
    async (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      const input = route.request().postDataJSON();
      writes.push(input);
      await held;
      return json(route, {
        ...selected,
        ...input,
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
      });
    },
  );
  await page.goto(
    `/portfolio/${clientId}/calendar?view=agenda&date=2026-10-08&zone=America%2FNew_York&meeting=${selected.id}`,
    { waitUntil: "commit" },
  );
  const workspace = page.getByRole("dialog", {
    name: selected.subject,
    exact: true,
  });
  await workspace.getByText("More actions", { exact: true }).click();
  await workspace.getByRole("button", { name: "Edit meeting" }).click();
  const editor = page.getByRole("dialog", {
    name: "Edit meeting",
    exact: true,
  });
  await editor
    .getByLabel("Subject", { exact: true })
    .fill("Pending local edit");
  await editor
    .getByRole("button", { name: "Save meeting", exact: true })
    .click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(editor.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel("Subject", { exact: true })).toHaveValue(
    "Pending local edit",
  );
  await expect(page).toHaveURL(new RegExp(`meeting=${selected.id}$`));
  await page.screenshot({
    path: testInfo.outputPath("pending-edit-1440x1040.png"),
  });
  release();
  await expect(editor).toHaveCount(0);
  await expect(workspace).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});
