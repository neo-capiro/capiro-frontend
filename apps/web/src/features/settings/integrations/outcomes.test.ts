import { describe, expect, it } from "vitest";
import {
  consumeOAuthOutcome,
  oauthOutcomeNotice,
  syncOutcomeMessage,
  canRetrySync,
} from "./outcomes";

const connection = {
  id: "10000000-0000-4000-8000-000000000001",
  provider: "google_workspace" as const,
  accountEmail: "synthetic@example.test",
  displayName: null,
  status: "connected" as const,
  scopes: [],
  lastSyncAt: null,
  lastError: null,
};
const stats = {
  scanned: 0,
  matched: 0,
  skipped: 0,
  removed: 0,
  failed: 0,
  pages: 1,
  hasMore: false,
};

describe("provider return hints", () => {
  it("removes transient parameters while preserving client context and the fragment", () => {
    const url = new URL(
      `https://app.example.test/settings/integrations?clientId=client&provider=google_workspace&connected=1&connectionId=${connection.id}&code=private&state=private&error_description=private#detail`,
    );
    const outcome = consumeOAuthOutcome(url)!;
    expect(url.href).toBe(
      "https://app.example.test/settings/integrations?clientId=client#detail",
    );
    expect(outcome).toEqual({
      provider: "google_workspace",
      kind: "connected",
      connectionId: connection.id,
    });
    expect(oauthOutcomeNotice(outcome, [connection]).title).toBe(
      "Account is connected",
    );
    expect(consumeOAuthOutcome(url)).toBeNull();
  });
  it("never treats a URL as an owned connection receipt", () => {
    const outcome = {
      provider: "google_workspace" as const,
      kind: "connected" as const,
      connectionId: connection.id,
    };
    for (const rows of [
      [],
      [{ ...connection, id: "another" }],
      [{ ...connection, provider: "microsoft_365" as const }],
      [{ ...connection, status: "needs_configuration" as const }],
    ])
      expect(oauthOutcomeNotice(outcome, rows).error).toBe(true);
  });
  it.each([
    "connected=1&connectionId=invalid",
    "connected=0",
    "connected=1&connected=1",
    "connected=1&error=access_denied",
    "error=private-provider-detail",
    "admin_consent=0",
    "code=private&state=private",
  ])("rejects ambiguous or malformed callbacks: %s", (query) => {
    const outcome = consumeOAuthOutcome(
      new URL(
        `https://app.example.test/settings?provider=google_workspace&${query}`,
      ),
    )!;
    expect(outcome.kind).toBe("failed");
    expect(JSON.stringify(oauthOutcomeNotice(outcome, []))).not.toContain(
      "private",
    );
  });
  it.each(["access_denied", "cancelled"] as const)(
    "renders the allowlisted %s outcome",
    (kind) => {
      expect(
        consumeOAuthOutcome(
          new URL(
            `https://app.example.test/settings?provider=google_workspace&error=${kind}`,
          ),
        )?.kind,
      ).toBe(kind);
    },
  );
  it("does not equate administrator consent with a mailbox connection", () => {
    const outcome = consumeOAuthOutcome(
      new URL(
        "https://app.example.test/settings?provider=microsoft_365&admin_consent=1",
      ),
    )!;
    expect(oauthOutcomeNotice(outcome, [connection]).message).toContain(
      "alone does not connect",
    );
  });
  it("ignores unsupported providers and strips their callback data", () => {
    const url = new URL(
      "https://app.example.test/settings?provider=imap_caldav&error=secret",
    );
    expect(consumeOAuthOutcome(url)).toBeNull();
    expect(url.search).toBe("");
  });
});

describe("bounded sync outcomes", () => {
  it("distinguishes partial resource results from complete batches", () => {
    expect(
      syncOutcomeMessage({ connectionId: connection.id, calendar: stats }),
    ).toContain("only part");
    expect(
      syncOutcomeMessage({
        connectionId: connection.id,
        mail: { inbox: stats },
      }),
    ).toContain("only part");
    expect(
      syncOutcomeMessage({
        connectionId: connection.id,
        calendar: stats,
        mail: {},
      }),
    ).toContain("only part");
  });
  it("shows failed records and pending pages without claiming completion", () => {
    expect(
      syncOutcomeMessage({
        connectionId: connection.id,
        calendar: stats,
        mail: { inbox: { ...stats, failed: 1 } },
      }),
    ).toContain("failed records");
    expect(
      syncOutcomeMessage({
        connectionId: connection.id,
        calendar: stats,
        mail: { inbox: { ...stats, hasMore: true } },
      }),
    ).toContain("More records remain");
  });
  it("describes even an empty completed batch within its configured coverage", () => {
    expect(
      syncOutcomeMessage({
        connectionId: connection.id,
        calendar: stats,
        mail: { inbox: stats },
      }),
    ).toContain("configured folders and history window");
  });
  it("never labels held records or partial durable health complete", () => {
    const result = {
      connectionId: connection.id,
      calendar: stats,
      mail: { inbox: { ...stats, held: 1 } },
    };
    expect(syncOutcomeMessage(result)).toContain("held records");
    expect(
      syncOutcomeMessage({
        ...result,
        mail: { inbox: stats },
        health: {
          mail: {
            attemptedAt: "2026-10-24T12:00:00.000Z",
            lastSuccessAt: null,
            lastCompleteAt: null,
            outcome: "partial",
            hasMore: false,
            failed: 0,
          },
        },
      }),
    ).toContain("pending, failed or held");
  });
  it("allows transient retries but refuses reconnect holds and unsupported providers", () => {
    expect(canRetrySync({ ...connection, status: "error" })).toBe(true);
    expect(canRetrySync({ ...connection, status: "needs_configuration" })).toBe(
      false,
    );
    expect(canRetrySync({ ...connection, status: "disabled" })).toBe(false);
    expect(canRetrySync({ ...connection, provider: "imap_caldav" })).toBe(
      false,
    );
  });
});
