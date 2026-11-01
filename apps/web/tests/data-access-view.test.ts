import { expect, it } from "vitest";
import type { DataAccessFamily } from "@capiro/meri-client/data-access";
import {
  availableCount,
  familyRows,
  familyState,
  hasMailbox,
  relationRow,
  type ConnectionsRead,
} from "../src/features/meri/screens/settings/data-access-view";

const family = (over: Partial<DataAccessFamily> = {}): DataAccessFamily => ({
  family: "capiro-data-v5",
  covers: "Published data tables and authorized client records.",
  freshness: "Rows with generatedAt, sourceAsOf and sourceVersion when known.",
  structured: true,
  clientScope: "optional",
  state: "available",
  requires: null,
  ...over,
});
const ready = (providers: string[]): ConnectionsRead => ({
  status: "ready",
  connections: providers.map((provider) => ({ provider })),
});
const connected = ready(["microsoft_365"]);

it("states are shown as Meri gave them; a mailbox-only source waits for the member's own connection, whatever its provider status", () => {
  expect(familyState(family(), ready([]))).toEqual({
    label: "Available",
    tone: "success",
  });
  expect(familyState(family({ state: "policy_off" }), connected).label).toBe(
    "Off by policy",
  );
  expect(
    familyState(family({ state: "client_required" }), connected).label,
  ).toBe("Needs a selected client");
  const mail = family({ family: "mail", requires: "mailbox" });
  expect(familyState(mail, ready([]))).toEqual({
    label: "Connector not connected",
    tone: "warning",
  });
  expect(familyState(mail, ready(["imap_caldav"])).label).toBe(
    "Connector not connected",
  );
  expect(familyState(mail, ready(["google_workspace"])).label).toBe(
    "Available",
  );
  expect(familyState(mail, { status: "unavailable" })).toEqual({
    label: "Could not check your connections",
    tone: "warning",
  });
  expect(familyState(mail, { status: "loading" }).label).toBe(
    "Checking your connections",
  );
  // A mail source that policy turned off stays off whatever the connection says.
  expect(
    familyState(
      family({ family: "mail", requires: "mailbox", state: "policy_off" }),
      connected,
    ).label,
  ).toBe("Off by policy");
  expect(hasMailbox([])).toBe(false);
});

it("rows hide uninstalled sources, collapse the SQL versions into one Capiro data row with the best state, and use plain names", () => {
  const rows = familyRows(
    [
      family({ family: "capiro-data", state: "policy_off" }),
      family({ family: "capiro-data-v3", state: "not_installed" }),
      family({ family: "capiro-data-v5", state: "available" }),
      family({ family: "federal-legislation", state: "not_installed" }),
      family({ family: "mail", requires: "mailbox", structured: false }),
      family({ family: "public-reports", covers: null, freshness: null }),
      family({ family: "pe-references" }),
      family({ family: "operational-reads" }),
    ],
    connected,
  );
  expect(rows.map((row) => [row.family, row.state.label])).toEqual([
    ["Capiro data (SQL)", "Available"],
    ["Mail", "Available"],
    ["Operational records", "Available"],
    ["Program element references", "Available"],
    ["Public reports", "Available"],
  ]);
  expect(rows.some((row) => "freshness" in row)).toBe(false);
  expect(rows.map((row) => row.family).join()).not.toMatch(/capiro-data|v\d/);
  expect(rows[4]!.covers).toBe(
    "No description is published for this source yet.",
  );
  expect(availableCount(rows)).toBe(5);
  expect(
    availableCount(
      familyRows(
        [family(), family({ family: "mail", requires: "mailbox" })],
        ready([]),
      ),
    ),
  ).toBe(1);
});

it("data tables are plain labels with Meri's state", () => {
  expect(
    relationRow({
      name: "client_people",
      source: "client_records",
      state: "client_required",
    }),
  ).toEqual({
    id: "client_records/client_people",
    name: "Client people",
    state: { label: "Needs a selected client", tone: "neutral" },
  });
});
