import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { teamPermissions } from "../src/features/settings/team-permissions";
import {
  canRetrySync,
  oauthOutcomeMessage,
  parseOAuthOutcome,
  syncOutcomeMessage,
  type IntegrationConnection,
} from "../src/features/settings/integration-health";
import { HelpShortcutsScreen } from "../src/features/meri/screens/settings/HelpShortcutsScreen";
import { help } from "../src/features/meri/screens/settings/unavailable-account";
import type { CapiroMe } from "../src/shared/capiro/operations/settings-schemas";

const connection: IntegrationConnection = {
  id: "11111111-1111-4111-8111-111111111111",
  provider: "google_workspace",
  status: "connected",
  accountEmail: "synthetic@example.test",
  displayName: "Synthetic test mailbox",
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

describe("A2 Team current permission presentation (synthetic)", () => {
  const actor = (role: CapiroMe["role"], billingAdmin: boolean) => ({
    role,
    billingAdmin,
    user: { id: "actor" } as CapiroMe["user"],
  });
  const member = {
    membershipId: "membership",
    userId: "target",
    role: "user_admin" as const,
    status: "active" as const,
    billingAdmin: true,
    email: "synthetic@example.test",
    firstName: null,
    lastName: null,
    joinedAt: null,
    lastSeenAt: null,
  };
  it.each([
    ["capiro_admin", false, true, true],
    ["user_admin", true, true, true],
    ["user_admin", false, true, false],
    ["standard_user", true, false, false],
    ["standard_user", false, false, false],
    ["client_portal_user", true, false, false],
  ] as const)(
    "%s billing=%s role=%s billing=%s",
    (role, billing, canChangeRole, canBilling) => {
      const result = teamPermissions(actor(role, billing), member);
      expect(result.canChangeRole).toBe(canChangeRole);
      expect(result.canRemove).toBe(canChangeRole);
      expect(result.canGrantBilling).toBe(canBilling);
      expect(result.canRevokeBilling).toBe(canBilling);
    },
  );
  it.each(["invited", "removed"] as const)(
    "%s cannot change role/billing even for HQ",
    (status) => {
      const result = teamPermissions(actor("capiro_admin", true), {
        ...member,
        status,
      });
      expect(result.canChangeRole).toBe(false);
      expect(result.canGrantBilling).toBe(false);
      expect(result.canRevokeBilling).toBe(false);
      expect(result.canRemove).toBe(status === "invited");
      expect(result.reason).toContain("active");
    },
  );
  it("protects self and staff and allows a standard target only revocation", () => {
    for (const target of [
      { ...member, userId: "actor" },
      { ...member, role: "capiro_admin" as const },
    ]) {
      const result = teamPermissions(actor("capiro_admin", true), target);
      expect([
        result.canChangeRole,
        result.canGrantBilling,
        result.canRevokeBilling,
        result.canRemove,
      ]).toEqual([false, false, false, false]);
    }
    expect(
      teamPermissions(actor("user_admin", true), {
        ...member,
        role: "standard_user",
      }).canGrantBilling,
    ).toBe(false);
    expect(
      teamPermissions(actor("user_admin", true), {
        ...member,
        role: "standard_user",
      }).canRevokeBilling,
    ).toBe(true);
  });
});

describe("A2 provider callback and bounded sync presentation (synthetic)", () => {
  const callback = () =>
    parseOAuthOutcome(
      new URLSearchParams(
        `provider=google_workspace&connected=1&connectionId=${connection.id}`,
      ),
    )!;
  it("requires a fresh owned connection matching provider, ID and connected state", () => {
    expect(oauthOutcomeMessage(callback(), undefined)).toContain("Checking");
    expect(oauthOutcomeMessage(callback(), [])).toContain(
      "could not be confirmed",
    );
    expect(
      oauthOutcomeMessage(callback(), [{ ...connection, id: "other" }]),
    ).toContain("could not be confirmed");
    expect(
      oauthOutcomeMessage(callback(), [
        { ...connection, provider: "microsoft_365" },
      ]),
    ).toContain("could not be confirmed");
    expect(
      oauthOutcomeMessage(callback(), [
        { ...connection, status: "needs_configuration" },
      ]),
    ).toContain("could not be confirmed");
    expect(oauthOutcomeMessage(callback(), [connection])).toContain(
      "current connection list confirms",
    );
  });
  it("rejects duplicate, unsupported and malformed hints and does not echo provider text", () => {
    expect(
      parseOAuthOutcome(new URLSearchParams("provider=other&connected=1")),
    ).toBeNull();
    for (const query of [
      "provider=google_workspace&connected=1&connectionId=bad",
      `provider=google_workspace&provider=microsoft_365&connected=1&connectionId=${connection.id}`,
    ])
      expect(parseOAuthOutcome(new URLSearchParams(query))?.kind).toBe("error");
    const error = parseOAuthOutcome(
      new URLSearchParams(
        "provider=google_workspace&error=%3Cscript%3Eprivate%3C/script%3E",
      ),
    )!;
    expect(oauthOutcomeMessage(error, [connection])).not.toContain("private");
    expect(oauthOutcomeMessage(error, [connection])).not.toContain("<script>");
  });
  it("distinguishes denied, cancelled and admin-consent-only from connection success", () => {
    expect(
      parseOAuthOutcome(
        new URLSearchParams("provider=google_workspace&error=access_denied"),
      )?.kind,
    ).toBe("denied");
    expect(
      parseOAuthOutcome(
        new URLSearchParams("provider=google_workspace&error=cancelled"),
      )?.kind,
    ).toBe("cancelled");
    const admin = parseOAuthOutcome(
      new URLSearchParams("provider=microsoft_365&admin_consent=1"),
    )!;
    expect(oauthOutcomeMessage(admin, [connection])).toContain(
      "not a mailbox connection",
    );
    expect(
      parseOAuthOutcome(
        new URLSearchParams("provider=microsoft_365&admin_consent=0"),
      )?.kind,
    ).toBe("denied");
  });
  it("never interprets calendar-only, failures, or remaining pages as complete mail history", () => {
    expect(
      syncOutcomeMessage({ connectionId: connection.id, calendar: stats }),
    ).toContain("no mail result");
    expect(
      syncOutcomeMessage({
        connectionId: connection.id,
        mail: { inbox: { ...stats, failed: 1 } },
      }),
    ).toContain("failed records");
    expect(
      syncOutcomeMessage({
        connectionId: connection.id,
        mail: { inbox: { ...stats, hasMore: true } },
      }),
    ).toContain("More records remain");
    expect(
      syncOutcomeMessage({
        connectionId: connection.id,
        mail: { inbox: stats },
      }),
    ).toContain("not a receipt for complete mailbox history");
  });
  it("allows transient retry while excluding reconnect-required, disabled and unsupported providers", () => {
    expect(canRetrySync(connection)).toBe(true);
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

it("fresh feedback page has no invented receipt and no enabled submit", () => {
  const html = renderToStaticMarkup(
    createElement(HelpShortcutsScreen, {
      view: help,
      chrome: {
        nav: [],
        notice: {
          title: "Unavailable",
          detail: "Synthetic disconnected fixture",
        },
        unavailable: "No support owner",
        localDrafts: false,
        headerOverlays: false,
        embedded: true,
      },
    }),
  );
  expect(html).not.toContain("Report submitted");
  expect(html).not.toContain("Designed receipt state");
  expect(html).toContain("No report has been sent");
  expect(html).toMatch(
    /<button[^>]*disabled=""[^>]*>Submit feedback<\/button>/,
  );
});
