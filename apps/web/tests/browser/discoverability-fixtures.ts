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
/** Three rows: a live task proposal for the test client, a completed general watch change, a withheld one. */
export const inboxPage = {
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

const family = (
  name: string,
  state: string,
  over: Record<string, unknown> = {},
) => ({
  family: name,
  covers: `Synthetic coverage for ${name}.`,
  freshness: "asOf",
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
      {
        clientScope: "required",
      },
    ),
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
    inbox?: unknown;
    inboxStatus?: number;
    mailboxConnected?: boolean;
    dataAccess?: (clientId: string | null) => unknown;
  } = {},
) {
  const calls: { path: string; body: unknown }[] = [];
  // Core operations go through the same-origin Capiro gateway: `/api/capiro/<operation>`.
  await page.route("**/api/capiro/settings.integrations.list*", (route) =>
    route.fulfill(
      json(
        options.mailboxConnected
          ? [
              {
                id: "40000000-0000-4000-8000-000000000001",
                provider: "microsoft_365",
                status: "connected",
                accountEmail: "test@example.test",
                displayName: null,
                scopes: [],
                lastSyncAt: null,
                lastError: null,
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
      calls.push({ path: url.pathname, body });
      return route.fulfill(
        json(options.inbox ?? inboxPage, options.inboxStatus ?? 200),
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
