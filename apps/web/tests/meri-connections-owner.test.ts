import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { ConnectorAccountsHost } from "../src/features/meri/screens/settings/ConnectorAccountsHost";
import { ConnectorAccountsScreen } from "../src/features/meri/screens/settings/ConnectorAccountsScreen";
import {
  connectionRows,
  connectionView,
  coverageNotice,
  stamp,
} from "../src/features/meri/screens/settings/connections-view";
import { unavailablePreferences } from "../src/features/meri/screens/settings/preferences-unavailable";
import type { SettingsChrome } from "../src/features/meri/screens/settings/settings-view";
import type { integrationSchema } from "../src/shared/capiro/operations/settings-schemas";

type Connection = z.infer<typeof integrationSchema>;

const state = vi.hoisted(() => ({
  calls: [] as { operation: string; input: unknown }[],
  identity: undefined as unknown,
  identityError: undefined as Error | undefined,
  connections: undefined as unknown,
  connectionsError: undefined as Error | undefined,
  connectionsLoading: false,
  selected: { state: "no-selection" } as unknown,
}));

vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (operation: string, input: unknown) => {
    state.calls.push({ operation, input });
    const common = { loading: false, reload: () => {} };
    if (operation === "me.read")
      return {
        ...common,
        data: state.identity,
        error: state.identityError,
      };
    return {
      ...common,
      loading: state.connectionsLoading,
      data: state.connections,
      error: state.connectionsError,
    };
  },
}));

vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => state.selected,
}));

const chrome: SettingsChrome = {
  nav: [],
  embedded: true,
  notice: { title: "Connections", detail: "" },
  unavailable: "Unavailable",
  localDrafts: false,
  headerOverlays: false,
};

const tenantId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const clientId = "33333333-3333-4333-8333-333333333333";

/** A synthetic provider connection shaped exactly like the fixed operation's response. */
function connection(over: Partial<Connection> = {}): Connection {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    provider: "microsoft_365",
    accountEmail: "owner@example.test",
    displayName: null,
    status: "connected",
    scopes: ["Mail.Read", "Calendars.Read", "offline_access"],
    lastSyncAt: "2026-10-10T09:30:00.000Z",
    lastError: null,
    ...over,
  };
}

const coverage = (
  over: Partial<NonNullable<Connection["mailCoverage"]>> = {},
) => ({
  sourceStatus: "healthy" as const,
  reason: null,
  lastMailSyncAt: "2026-10-10T09:31:00.000Z",
  lastConnectionSyncAt: "2026-10-10T09:31:00.000Z",
  backfillComplete: true,
  hasMore: false,
  captureRepair: "not_applicable" as const,
  ...over,
});

const render = () =>
  renderToStaticMarkup(createElement(ConnectorAccountsHost, { chrome }));

beforeEach(() => {
  state.calls = [];
  state.identity = undefined;
  state.identityError = undefined;
  state.connections = undefined;
  state.connectionsError = undefined;
  state.connectionsLoading = false;
  state.selected = { state: "no-selection" };
});

describe("Meri connections owner projection", () => {
  it("reports the provider account, refresh and status without inferring a grant", () => {
    const [row] = connectionRows([
      connection({
        status: "needs_configuration",
        permissions: {
          requestedScopes: ["Mail.Read", "Calendars.Read", "offline_access"],
          grantedScopes: null,
          lastVerifiedAt: null,
        },
      }),
    ]);
    expect(row?.connection).toBe("Microsoft 365");
    expect(row?.account).toBe("owner@example.test");
    // Registered scope names are a request until the provider grant is verified.
    expect(row?.scope).toBe("Not verified");
    expect(row?.refresh).toBe(stamp("2026-10-10T09:30:00.000Z"));
    expect(row?.health).toBe("Needs setup");
  });

  it("reports a verified provider grant only from verified grant evidence", () => {
    const [row] = connectionRows([
      connection({
        permissions: {
          requestedScopes: ["Mail.Read", "Calendars.Read", "offline_access"],
          grantedScopes: ["Mail.Read", "Calendars.Read"],
          lastVerifiedAt: "2026-10-11T12:00:00.000Z",
        },
      }),
    ]);
    expect(row?.scope).toBe("2 scopes verified");
  });

  it("shows no connector row and no selection when the current account has none", () => {
    const view = connectionView(
      [],
      "/settings/integrations",
      unavailablePreferences.connections,
    );
    expect(view.connections.rows).toHaveLength(1);
    expect(view.connections.rows[0]?.connection).toBe("No provider account");
    expect(view.connections.initialSelectedId).toBeUndefined();
    expect(view.connections.description).toContain("Capiro Integrations");
  });

  it("states coverage, refresh health and reauthorization from Core evidence only", () => {
    const missing = coverageNotice(connection());
    expect(missing.tone).toBe("warning");
    expect(missing.detail).toContain("No mail coverage is reported");

    const degraded = coverageNotice(
      connection({
        mailCoverage: coverage({
          sourceStatus: "degraded",
          reason: "mail_sync_stale",
          backfillComplete: false,
          hasMore: true,
          captureRepair: "required",
        }),
      }),
    );
    expect(degraded.tone).toBe("warning");
    expect(degraded.detail).toContain("Mail source degraded");
    expect(degraded.detail).toContain("More mail remains to import");
    expect(degraded.detail).toContain("Retention repair is still required");
    // The provider reason code is not user-facing copy.
    expect(degraded.detail).not.toContain("mail_sync_stale");

    const unavailable = coverageNotice(
      connection({ mailCoverage: coverage({ sourceStatus: "unavailable" }) }),
    );
    expect(unavailable.tone).toBe("danger");

    const reauthorization = coverageNotice(
      connection({
        subscriptions: {
          configured: true,
          updatedAt: null,
          lastNotificationAt: null,
          lastLifecycleEvent: null,
          resources: [
            {
              resource: "me/events",
              expiresAt: null,
              lastRenewedAt: null,
              needsReauthorization: true,
            },
          ],
        },
      }),
    );
    expect(reauthorization.tone).toBe("warning");
    expect(reauthorization.detail).toContain(
      "1 calendar subscription need reauthorization",
    );
  });

  it("binds the supported owner and states the real revoke impact", () => {
    const owner = "/settings/integrations?clientId=abc";
    const view = connectionView(
      [connection()],
      owner,
      unavailablePreferences.connections,
    );
    const account = view.accounts?.[0];
    expect(view.ownerHref).toBe(owner);
    expect(view.coverageHref).toBe(owner);
    expect(view.connections.initialSelectedId).toBe(connection().id);
    expect(account?.id).toBe(connection().id);
    expect(account?.disconnect.confirm).toBe("Review in Capiro Integrations");
    expect(account?.disconnect.description).toContain(
      "retained but become unavailable in mail views",
    );
    expect(account?.disconnect.description).toContain("Capiro Integrations");
    // The handoff is stated once, on the page notice, not again in the card.
    expect(view.connections.description).not.toContain(
      "performed in Capiro Integrations",
    );
  });
});

describe("Meri connections selected-account detail", () => {
  const archive = () =>
    connection({
      id: "55555555-5555-4555-8555-555555555555",
      provider: "google_workspace",
      accountEmail: "archive@example.test",
      permissions: {
        requestedScopes: ["Mail.Read", "Calendars.Read", "offline_access"],
        grantedScopes: ["Mail.Read", "Calendars.Read"],
        lastVerifiedAt: "2026-10-12T08:00:00.000Z",
      },
      mailCoverage: coverage({
        sourceStatus: "degraded",
        reason: "mail_sync_stale",
        backfillComplete: false,
        hasMore: true,
      }),
      subscriptions: {
        configured: false,
        updatedAt: null,
        lastNotificationAt: null,
        lastLifecycleEvent: "reauthorizationRequired",
        resources: [
          {
            resource: "me/events",
            expiresAt: null,
            lastRenewedAt: null,
            needsReauthorization: true,
          },
        ],
      },
    });

  const twoConnections = () =>
    connectionView(
      [connection({ mailCoverage: coverage() }), archive()],
      "/settings/integrations",
      unavailablePreferences.connections,
    );

  it("gives each row its own scope, coverage and revoke detail", () => {
    const built = twoConnections();
    const [first, second] = built.accounts ?? [];
    expect(built.accounts).toHaveLength(2);
    expect(first?.id).toBe(connection().id);
    expect(second?.id).toBe(archive().id);
    expect(first?.grantedScope.description).toContain(
      "Microsoft 365 · owner@example.test",
    );
    expect(first?.grantedScope.description).toContain("have not been verified");
    expect(second?.grantedScope.description).toContain(
      "Google Workspace · archive@example.test",
    );
    expect(second?.grantedScope.description).toContain(
      "2 of 3 requested scopes were verified",
    );
    expect(second?.coverage.title).toContain("Google Workspace");
    expect(second?.coverage.detail).toContain("Mail source degraded");
    expect(second?.coverage.detail).toContain("need reauthorization");
    expect(second?.disconnect.confirm).toBe("Review in Capiro Integrations");
    // The first row's healthy statement is not reused for the second account.
    expect(first?.coverage.detail).toContain("Mail source healthy");
    expect(second?.coverage.detail).not.toContain("Mail source healthy");
  });

  it("shows the selected row's own detail, not the first row's", () => {
    const built = twoConnections();
    const html = renderToStaticMarkup(
      createElement(ConnectorAccountsScreen, {
        chrome,
        view: {
          ...built,
          connections: {
            ...built.connections,
            initialSelectedId: archive().id,
          },
        },
      }),
    );
    expect(html).toContain("Google Workspace · archive@example.test");
    expect(html).toContain("Mail source degraded");
    expect(html).toContain("need reauthorization");
    expect(html).not.toContain("Microsoft 365 · owner@example.test");
    expect(html).not.toContain("Mail source healthy");
    // The unselected row stays listed and the owner handoff still points there.
    expect(html).toContain("owner@example.test");
    expect(html).toContain('href="/settings/integrations"');
  });
});

describe("Meri connections current-account binding", () => {
  it("reads no connection data and offers no action before the account is verified", () => {
    const html = render();
    expect(html).toContain("Verifying your current account");
    expect(
      state.calls.filter(
        (call) => call.operation === "settings.integrations.list",
      ),
    ).toHaveLength(0);
    expect(html).not.toContain("owner@example.test");
    expect(html).not.toContain('href="/settings/integrations"');
  });

  it("refuses to present connections when the current account cannot be verified", () => {
    state.identityError = new Error("synthetic failure");
    state.connections = [connection()];
    const html = render();
    expect(html).toContain("Current account could not be verified");
    expect(html).not.toContain("owner@example.test");
    expect(
      state.calls.filter(
        (call) => call.operation === "settings.integrations.list",
      ),
    ).toHaveLength(0);
  });

  it("shows the verified account's own connection and hands actions to the owner", () => {
    state.identity = { tenant: { id: tenantId }, user: { id: actorId } };
    state.connections = [connection()];
    const html = render();
    expect(html).toContain("owner@example.test");
    expect(html).toContain("Microsoft 365");
    expect(html).toContain("Not verified");
    expect(html).not.toContain("scopes verified");
    expect(html).toContain('href="/settings/integrations"');
    expect(state.calls).toContainEqual({
      operation: "settings.integrations.list",
      input: {},
    });
  });

  it("preserves the selected client context on the owner link", () => {
    state.identity = { tenant: { id: tenantId }, user: { id: actorId } };
    state.connections = [connection()];
    state.selected = {
      state: "authorized-client",
      requestedId: clientId,
      client: { id: clientId },
    };
    const html = render();
    expect(html).toContain(
      `href="/settings/integrations?clientId=${clientId}"`,
    );
  });

  it("never presents an unreadable connection list as an empty account", () => {
    state.identity = { tenant: { id: tenantId }, user: { id: actorId } };
    state.connectionsError = new Error("synthetic failure");
    const html = render();
    expect(html).toContain("Connection status unavailable");
    expect(html).not.toContain("No provider account is connected");
    expect(html).not.toContain('href="/settings/integrations"');
  });
});
