import { expect, it } from "vitest";
import type { DataAccessFamily } from "@capiro/meri-client/data-access";
import {
  availableCount,
  familyRow,
  familyState,
  mailboxConnected,
  relationRow,
} from "../src/features/meri/screens/settings/data-access-view";

const family = (over: Partial<DataAccessFamily> = {}): DataAccessFamily => ({
  family: "capiro-data-v5",
  covers: "Text-to-SQL over published relations.",
  freshness: "generatedAt, sourceAsOf and sourceVersion.",
  structured: true,
  clientScope: "optional",
  operations: ["describe_capiro_data", "query_capiro_data"],
  state: "available",
  requires: null,
  ...over,
});
const connected = [{ provider: "microsoft_365", status: "connected" }];

it("Meri's states are shown as they are; only a mailbox-only family waits for the member's own connection", () => {
  expect(familyState(family(), undefined)).toEqual({
    label: "Available",
    tone: "success",
  });
  expect(familyState(family({ state: "policy_off" }), connected).label).toBe(
    "Off by policy",
  );
  expect(
    familyState(family({ state: "client_required" }), connected).label,
  ).toBe("Needs a selected client");
  expect(familyState(family({ state: "not_installed" }), connected).label).toBe(
    "Not installed",
  );
  const mail = family({ family: "mail", requires: "mailbox" });
  expect(familyState(mail, undefined)).toEqual({
    label: "Connector not connected",
    tone: "warning",
  });
  expect(
    familyState(mail, [{ provider: "imap_caldav", status: "connected" }]).label,
  ).toBe("Connector not connected");
  expect(
    familyState(mail, [{ provider: "google_workspace", status: "error" }])
      .label,
  ).toBe("Connector not connected");
  expect(familyState(mail, connected).label).toBe("Available");
  // A mail family that policy turned off stays off whatever the connection says.
  expect(
    familyState(
      family({ family: "mail", requires: "mailbox", state: "policy_off" }),
      connected,
    ).label,
  ).toBe("Off by policy");
  expect(mailboxConnected(undefined)).toBe(false);
});

it("rows explain missing guidance instead of leaving cells blank and count only what a run would list", () => {
  const row = familyRow(
    family({ family: "public-reports", covers: null, freshness: null }),
    connected,
  );
  expect(row.family).toBe("Public reports");
  expect(row.covers).toMatch(/No model-facing description/);
  expect(row.freshness).toMatch(/No freshness or version field/);
  expect(row.operations).toBe("describe_capiro_data, query_capiro_data");
  expect(
    availableCount(
      [
        family(),
        family({ family: "mail", requires: "mailbox" }),
        family({ family: "x", state: "policy_off" }),
      ],
      undefined,
    ),
  ).toBe(1);
  expect(
    relationRow({
      name: "client_people",
      source: "client_records",
      state: "client_required",
    }),
  ).toEqual({
    id: "client_records/client_people",
    name: "client_people",
    state: { label: "Needs a selected client", tone: "neutral" },
  });
});
