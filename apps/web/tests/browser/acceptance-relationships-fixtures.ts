import { expect, type Page } from "@playwright/test";
import { clientId, json, person, sendingMailbox } from "./fixtures";
import { committee } from "./government-fixtures";

export const relationshipsPath = `/portfolio/${clientId}/relationships`;
export const governmentPath = `${relationshipsPath}?kind=government`;
export const otherClientId = "10000000-0000-4000-8000-000000000002";
export const threadId = "a0000000-0000-4000-8000-000000000001";

export async function refreshRelationships(
  page: Page,
  queryKey: readonly string[],
) {
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__acceptanceRelationships)))
    .toBe(true);
  await page.evaluate(
    (key) => window.__acceptanceRelationships!.refresh(key),
    queryKey,
  );
}

/** Each held HTTP response captures its own payload before the test replaces it. */
export async function controlledRead(
  page: Page,
  pattern: string,
  initial: unknown,
) {
  let response = { body: initial, status: 200 };
  let hold = false;
  let reads = 0;
  const releases: (() => void)[] = [];
  const writes: string[] = [];
  await page.route(pattern, async (route) => {
    if (route.request().method() !== "GET") {
      writes.push(`${route.request().method()} ${route.request().url()}`);
      return json(route, { message: "Unexpected synthetic write" }, 500);
    }
    reads++;
    const captured = response;
    if (hold)
      await new Promise<void>((resolve) => {
        releases.push(resolve);
      });
    await json(route, captured.body, captured.status);
  });
  return {
    writes,
    get reads() {
      return reads;
    },
    get waiting() {
      return releases.length;
    },
    fail(status: number) {
      hold = false;
      response = {
        body: { message: `Synthetic current read ${status}` },
        status,
      };
    },
    hold(body: unknown) {
      response = { body, status: 200 };
      hold = true;
    },
    release() {
      hold = false;
      releases.splice(0).forEach((resolve) => resolve());
    },
  };
}

export const readError = (status: number) =>
  status === 403
    ? "You do not have permission for this operation."
    : `Synthetic current read ${status}`;

export function contactThread(client: string | null = clientId) {
  return {
    id: threadId,
    clientId: client,
    subject: "Synthetic acceptance briefing",
    snippet: "Synthetic retained thread",
    connectionId: sendingMailbox.id,
    connectionEmail: sendingMailbox.accountEmail,
    participants: [{ email: person.email, name: person.name }],
    messages: [
      {
        id: "b0000000-0000-4000-8000-000000000001",
        threadId,
        subject: "Synthetic acceptance briefing",
        fromEmail: person.email,
        fromName: person.name,
        toRecipients: [{ email: sendingMailbox.accountEmail }],
        ccRecipients: [],
        bodyText: "Exact requested synthetic thread content",
        sentAt: null,
        receivedAt: "2026-10-13T10:00:00Z",
        createdAt: "2026-10-13T10:00:00Z",
      },
    ],
  };
}

export const recommendation = {
  memberId: "synthetic-recommended-member",
  office: "Synthetic recommended office",
  party: "I",
  state: "VA",
  chamber: "House",
  committee: null,
  score: 0.75,
  tags: ["synthetic"],
  billCount: 2,
};

export const directorySources = [
  { kind: "congress", label: "Members", path: "directory/contacts" },
  { kind: "staff", label: "Congressional staff", path: "directory/people" },
  {
    kind: "state",
    label: "State legislators",
    path: "explorer/state-legislators",
  },
  {
    kind: "committee",
    label: "Committee staff",
    path: `directory/committees/${committee.id}/staff`,
  },
] as const;

export function directoryReceipt(
  kind: (typeof directorySources)[number]["kind"],
  name: string,
) {
  const paging = { page: 1, pageSize: 20, total: 1 };
  if (kind === "congress")
    return {
      ...paging,
      contacts: [
        {
          id: "synthetic-member",
          fullName: name,
          title: "Member",
          chamber: "House",
          state: "VA",
          party: "I",
        },
      ],
    };
  if (kind === "staff")
    return {
      ...paging,
      people: [
        {
          id: "synthetic-staff",
          fullName: name,
          title: "Counsel",
          personType: "staff",
          isCurrent: true,
          state: "VA",
          party: null,
        },
      ],
    };
  if (kind === "state")
    return {
      total: 1,
      rows: [
        {
          id: "synthetic-state",
          name,
          chamber: "lower",
          state: "VA",
          district: "1",
          party: null,
        },
      ],
    };
  return {
    ...paging,
    committee,
    staff: [
      {
        id: "synthetic-committee-staff",
        fullName: name,
        title: "Counsel",
        isCurrent: false,
        committee: { id: committee.id, name: committee.name },
      },
    ],
  };
}
