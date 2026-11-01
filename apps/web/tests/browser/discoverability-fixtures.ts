import type { Page } from "@playwright/test";
import { clientId } from "./fixtures";

/** Scripted Meri answers for the approval inbox and the data-access read. Every page below must pass the
 * public receivers in the browser; a shape the contract refuses shows as "unavailable" and fails the spec. */
export const conversationId = "30000000-0000-4000-8000-000000000001";
const sdk = (n: number) => `sdk:${String(n).padStart(64, "0")}`;
const inboxRow = (
  n: number,
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({
  conversationId,
  deliveryId: sdk(n),
  createdAt: `2026-11-01T1${n}:00:00.000Z`,
  operation: { id: "create_task", version: "0.2.0" },
  kind: "proposal",
  withheld: false,
  clientId,
  expiresAt: "2099-01-01T00:00:00.000Z",
  phase: "awaiting_approval",
  ...over,
});
export type InboxPage = {
  rows: Record<string, unknown>[];
  next: { conversationId: string; deliveryId: string } | null;
  pending: { count: number; complete: boolean };
};
/** Three rows: a live task proposal for the test client, a completed general watch change, a withheld one. */
export const inboxPage: InboxPage = {
  rows: [
    inboxRow(2),
    inboxRow(1, {
      kind: "watch_action",
      operation: { id: "watch_action", version: "0.2.0" },
      clientId: null,
      phase: "completed",
    }),
    {
      conversationId,
      deliveryId: sdk(0),
      createdAt: "2026-11-01T10:00:00.000Z",
      operation: { id: "create_task", version: "0.2.0" },
      kind: "proposal",
      withheld: true,
    },
  ],
  next: null,
  pending: { count: 1, complete: true },
};
export const cursorTo = (row: Record<string, unknown>) => ({
  conversationId: row.conversationId as string,
  deliveryId: row.deliveryId as string,
});

const family = (
  name: string,
  state: string,
  over: Record<string, unknown> = {},
) => ({
  family: name,
  covers: "Synthetic coverage for this source.",
  freshness: "Records carry asOf and a sourceVersion",
  structured: false,
  clientScope: "optional",
  operations: [`read_${name.replaceAll("-", "_")}`],
  state,
  requires: null,
  ...over,
});
export const dataAccessPage = (requestedClientId: string | null) => ({
  schemaVersion: "meri.data-access/1",
  checkedAt: "2026-11-01T12:00:00.000Z",
  clientId: requestedClientId,
  generalReads: true,
  families: [
    family(
      "action-items-complete",
      requestedClientId ? "available" : "client_required",
      { clientScope: "required" },
    ),
    family("capiro-data", "policy_off", { structured: true }),
    family("capiro-data-v5", "available", {
      structured: true,
      operations: ["describe_capiro_data", "query_capiro_data"],
    }),
    family("federal-legislation", "not_installed"),
    family("mail", "available", { requires: "mailbox" }),
    family("public-reports", "policy_off", { covers: null, freshness: null }),
  ],
  relations: [
    { name: "congress_bills", source: "public", state: "available" },
    {
      name: "client_people",
      source: "client_records",
      state: requestedClientId ? "available" : "client_required",
    },
  ],
});

const json = (value: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(value),
});

/** Meri routes answer from scripts; conversation summaries stay unavailable so titles fall back to the creation receipt. */
export async function serveMeri(
  page: Page,
  options: {
    /** Inbox answers in request order; the last one repeats. A number is an HTTP status answered with a content-free error. */
    inbox?: (InboxPage | number)[];
    /** `none`: no provider connection; `mailbox`: a Microsoft 365 connection (any status); `error`: Core refuses the read. */
    connections?: "none" | "mailbox" | "error";
    dataAccess?: (clientId: string | null) => unknown;
  } = {},
) {
  const calls: { path: string; body: unknown }[] = [];
  const inboxAnswers = options.inbox ?? [inboxPage];
  // Core operations go through the same-origin Capiro gateway: `/api/capiro/<operation>`.
  await page.route("**/api/capiro/settings.integrations.list*", (route) =>
    options.connections === "error"
      ? route.fulfill(json({ message: "Connections unavailable" }, 503))
      : route.fulfill(
          json(
            options.connections === "mailbox"
              ? [
                  {
                    id: "40000000-0000-4000-8000-000000000001",
                    provider: "microsoft_365",
                    status: "error",
                    accountEmail: "test@example.test",
                    displayName: null,
                    scopes: [],
                    lastSyncAt: null,
                    lastError: "Synthetic provider error",
                  },
                ]
              : [],
          ),
        ),
  );
  await page.route("**/api/conversations/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/conversations/intents/inbox") {
      const body = route.request().postDataJSON() as unknown;
      const index = calls.filter((call) => call.path === url.pathname).length;
      calls.push({ path: url.pathname, body });
      const answer = inboxAnswers[Math.min(index, inboxAnswers.length - 1)]!;
      return route.fulfill(
        typeof answer === "number"
          ? json(
              {
                error: {
                  code:
                    answer === 403
                      ? "MEMBERSHIP_REVOKED"
                      : "INTENT_JOURNAL_UNAVAILABLE",
                },
              },
              answer,
            )
          : json(answer),
      );
    }
    return route.fulfill(
      json({ error: { code: "CONVERSATION_UNAVAILABLE" } }, 503),
    );
  });
  await page.route("**/api/data-access/read", (route) => {
    const body = route.request().postDataJSON() as { clientId: string | null };
    calls.push({ path: "/api/data-access/read", body });
    return route.fulfill(
      json((options.dataAccess ?? dataAccessPage)(body.clientId)),
    );
  });
  return calls;
}
