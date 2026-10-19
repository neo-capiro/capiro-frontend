import { describe, expect, it } from "vitest";
import {
  clientSchema,
  type Client,
} from "../src/features/portfolio/index/contracts";
import { projectPortfolioCatalog } from "../src/features/portfolio/index/catalog-projection";
import { readPortfolioState } from "../src/features/portfolio/index/filter";
import {
  prospectSchema,
  type Prospect,
} from "../src/features/portfolio/prospects/contracts";

const ids = {
  client: "10000000-0000-4000-8000-000000000001",
  linkedCore: "10000000-0000-4000-8000-000000000002",
  coreOnly: "10000000-0000-4000-8000-000000000003",
  linkedBd: "70000000-0000-4000-8000-000000000001",
  convertedBd: "70000000-0000-4000-8000-000000000002",
  standaloneBd: "70000000-0000-4000-8000-000000000003",
};
const core = (id: string, profileType: string): Client =>
  clientSchema.parse({
    id,
    name: id,
    profileType,
    profileStatus: "ACTIVE",
    status: "active",
  });
const bd = (id: string, linkedClientId: string | null): Prospect =>
  prospectSchema.parse({
    id,
    displayName: id,
    domain: null,
    website: null,
    description: null,
    serviceHypothesis: null,
    geography: null,
    ownerUserId: null,
    stage: "identified",
    status: "active",
    nextAction: null,
    nextActionDueAt: null,
    linkedClientId,
    convertedAt: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  });
const records = [
  core(ids.client, "CLIENT"),
  core(ids.linkedCore, "PROSPECT"),
  core(ids.coreOnly, "PROSPECT"),
];
const prospectRecords = [
  bd(ids.linkedBd, ids.linkedCore),
  bd(ids.convertedBd, ids.client),
  bd(ids.standaloneBd, null),
];
const project = (
  query: string,
  visible = prospectRecords.length,
  clients = records,
) =>
  projectPortfolioCatalog({
    records: clients,
    prospectRecords,
    prospectVisibleCount: visible,
    state: readPortfolioState(new URLSearchParams(query)),
    owners: {},
  });

describe("Portfolio Core and Business Development catalog projection", () => {
  it("shows each linked prospect once in All and preserves the converted client's Core card", () => {
    const all = project("");
    expect(all.rows.map((record) => record.id)).toEqual([
      ids.client,
      ids.coreOnly,
    ]);
    expect(all.visibleProspects.map((record) => record.id)).toEqual([
      ids.linkedBd,
      ids.standaloneBd,
    ]);
    expect(all.allCount).toBe(4);
    expect(all.prospectCount).toBe(4);
    expect(all.prospectsCapped).toBe(false);
  });

  it("uses the complete BD prospect set for Prospects and Core clients alone for Clients", () => {
    const prospects = project("type=PROSPECT");
    expect(prospects.rows.map((record) => record.id)).toEqual([ids.coreOnly]);
    expect(prospects.visibleProspects.map((record) => record.id)).toEqual([
      ids.linkedBd,
      ids.convertedBd,
      ids.standaloneBd,
    ]);
    expect(prospects.prospectCount).toBe(4);
    const clients = project("type=CLIENT");
    expect(clients.rows.map((record) => record.id)).toEqual([ids.client]);
    expect(clients.visibleProspects).toEqual([]);
  });

  it("withholds merged counts when unseen capped records could duplicate Core, but keeps exact BD-only counts", () => {
    const capped = project("", 5);
    expect(capped.prospectsCapped).toBe(true);
    expect(capped.allCount).toBeUndefined();
    expect(capped.prospectCount).toBeUndefined();
    const noUnlinkedCoreProspect = project("", 5, records.slice(0, 2));
    expect(noUnlinkedCoreProspect.prospectCount).toBe(5);
    expect(noUnlinkedCoreProspect.allCount).toBeUndefined();
    const bdOnly = project("", 5, []);
    expect(bdOnly.allCount).toBe(5);
    expect(bdOnly.prospectCount).toBe(5);
  });
});
