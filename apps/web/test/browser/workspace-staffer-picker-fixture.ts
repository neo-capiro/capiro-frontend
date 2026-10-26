import type { Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import {
  hillDayResumeFixture,
  resumeUrl,
  documentId,
  at,
} from "./workspace-hillday-resume-fixture";
import { clientId } from "./next-modules-fixtures";
import type { DirectoryContact } from "../../src/shared/capiro/operations/directory-schemas";

export const staffer = {
  id: "staff-101",
  fullName: "Priya Raman",
  title: "Legislative Director",
};
export const staffLabel = "Priya Raman, Legislative Director · Rep. Fallon";
export const office: DirectoryContact = {
  id: "member-501",
  fullName: "Rep. Fallon",
  memberName: "Rep. Fallon",
  staff: [staffer],
};
export const directoryPage = (page = 1, contacts = [office], total = 11) => ({
  contacts,
  total,
  page,
  pageSize: 10,
  totals: { all: total, house: total, senate: 0, governors: 0, staff: 100 },
  availableStates: [],
  availableFilters: {
    chambers: [],
    parties: [],
    committees: [],
    issues: [],
    roles: [],
    states: [],
  },
});
export function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
export type DirectoryQuery = { q: string; page: number; pageSize: number };
export type CorrectionWrite = {
  params: { id: string; meetingId: string };
  body: Record<string, string>;
};
type Reply = { json: unknown; status?: number };
const meeting = (number: number) => ({
  meetingId: `meeting-${number}`,
  eventId: `event-${number}`,
  state: "partial",
  needsConfirmation: true,
  office: {
    memberId: "member-501",
    member: "Rep. Fallon",
    memberName: "Rep. Fallon",
    chamber: "House",
    party: "R",
    state: "TX",
    committees: [],
    bio: null,
    officeLocation: null,
    room: "201",
    derivedFrom: "user_selected",
    alternatives: [],
  },
  attendees: [
    {
      attendeeId: `attendee-${number}`,
      address: `invite${number}@example.test`,
      state: "unresolved",
      stafferId: null,
      name: `Invite attendee ${number}`,
      role: "Invite role",
      detail: "Not resolved",
      manual: false,
    },
  ],
});

export async function stafferFixture(
  page: Page,
  options: {
    read?: (query: DirectoryQuery) => Reply | Promise<Reply>;
    writeGate?: Promise<void>;
    writeStatus?: number;
  } = {},
) {
  await hillDayResumeFixture(page, { noJob: true });
  await page.route("**/Geist-Variable.woff2", (route) =>
    route.fulfill({
      path: fileURLToPath(
        new URL(
          "../../../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
          import.meta.url,
        ),
      ),
      contentType: "font/woff2",
    }),
  );
  const writes: CorrectionWrite[] = [];
  const queries: DirectoryQuery[] = [];
  const aborted: string[] = [];
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText.includes("ABORTED"))
      aborted.push(new URL(request.url()).pathname);
  });
  await page.route("**/api/capiro/workspace.hillday.resolution?*", (route) =>
    route.fulfill({
      json: {
        documentId,
        status: "partial",
        resolvedAt: at,
        sources: [],
        meetings: [meeting(1), meeting(2)],
      },
    }),
  );
  await page.route("**/api/capiro/directory.contacts?*", async (route) => {
    const { query } = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    ) as { query: DirectoryQuery };
    queries.push(query);
    const reply = (await options.read?.(query)) ?? {
      json: directoryPage(query.page),
    };
    await route.fulfill(reply).catch(() => {});
  });
  await page.route(
    "**/api/capiro/workspace.hillday.correction",
    async (route) => {
      const write = route.request().postDataJSON() as CorrectionWrite;
      writes.push(write);
      await options.writeGate;
      await route
        .fulfill(
          options.writeStatus
            ? {
                status: options.writeStatus,
                json: { message: "Attendee not found on this meeting" },
              }
            : {
                json: {
                  resolution: meeting(Number(write.params.meetingId.slice(-1))),
                  event: {
                    eventId: "event-1",
                    subject: "Synthetic meeting",
                    startsAt: at,
                    endsAt: "2026-10-26T13:00:00.000Z",
                    timeZone: "UTC",
                    location: "201",
                    kind: "hill",
                    source: "manual",
                    clientId,
                    attendees: [],
                    reason: {
                      kind: "manual",
                      detail: "Synthetic",
                      matchedAddresses: [],
                    },
                  },
                },
              },
        )
        .catch(() => {});
    },
  );
  return { writes, queries, aborted };
}

export async function openStafferDialog(page: Page, target = 0) {
  await page.goto(resumeUrl("resolution"));
  await page
    .getByRole("button", { name: "Resolve", exact: true })
    .nth(target)
    .click();
  return page.getByRole("dialog", { name: "Resolve attendee", exact: true });
}
