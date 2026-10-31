import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProspectResults } from "../src/features/portfolio/index/ProspectResults";
import {
  clientSchema,
  type Client,
} from "../src/features/portfolio/index/contracts";
import { projectPortfolioCatalog } from "../src/features/portfolio/index/catalog-projection";
import {
  readPortfolioState,
  sortProspectProfiles,
} from "../src/features/portfolio/index/filter";
import {
  prospectSchema,
  type Prospect,
} from "../src/features/portfolio/prospects/contracts";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) =>
    createElement("a", props, children),
}));
vi.mock("../src/features/portfolio/index/ProfileResults", () => ({
  ProfileCard: ({ client }: { client: Client }) =>
    createElement("div", null, client.name),
}));

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
  it.each(["cards", "list"] as const)(
    "renders mixed %s in the chosen order while retaining record destinations",
    (view) => {
      const html = renderToStaticMarkup(
        createElement(ProspectResults, {
          coreRows: [
            { ...core(ids.coreOnly, "PROSPECT"), name: "Middle core" },
          ],
          rows: [
            { ...bd(ids.linkedBd, null), displayName: "Zulu prospect" },
            { ...bd(ids.standaloneBd, null), displayName: "Alpha prospect" },
          ],
          view,
          sort: "name",
          owners: {},
        }),
      );
      expect(html.indexOf("Alpha prospect")).toBeLessThan(
        html.indexOf("Middle core"),
      );
      expect(html.indexOf("Middle core")).toBeLessThan(
        html.indexOf("Zulu prospect"),
      );
      expect(html).toContain(`/portfolio/prospects/${ids.linkedBd}`);
      expect(html).toContain(`/portfolio/prospects/${ids.standaloneBd}`);
      if (view === "list") expect(html).toContain(`/portfolio/${ids.coreOnly}`);
    },
  );
  it("applies name sorting to the BD section of All without changing deduplication or counts", () => {
    const prospects = prospectRecords.map((record, index) => ({
      ...record,
      displayName: ["Zulu", "Converted", "Alpha"][index]!,
    }));
    const result = projectPortfolioCatalog({
      records,
      prospectRecords: prospects,
      prospectVisibleCount: prospects.length,
      state: readPortfolioState(new URLSearchParams("sort=name")),
      owners: {},
    });
    expect(result.visibleProspects.map((row) => row.id)).toEqual([
      ids.standaloneBd,
      ids.linkedBd,
    ]);
    expect(result.allCount).toBe(4);
    expect(result.prospectCount).toBe(4);
    expect(prospects.map((row) => row.displayName)).toEqual([
      "Zulu",
      "Converted",
      "Alpha",
    ]);
  });

  it("sorts a combined Core and BD prospect view with numeric names and stable identity ties", () => {
    const coreRows = [{ ...core(ids.coreOnly, "PROSPECT"), name: "Alpha 2" }];
    const bdRows = [
      { ...bd(ids.standaloneBd, null), displayName: "Alpha 10" },
      { ...bd(ids.linkedBd, null), displayName: "alpha 2" },
    ];
    expect(
      sortProspectProfiles(coreRows, bdRows, "name").map(
        (row) => row.record.id,
      ),
    ).toEqual([ids.coreOnly, ids.linkedBd, ids.standaloneBd]);
    expect(
      sortProspectProfiles(coreRows, [...bdRows].reverse(), "name").map(
        (row) => row.record.id,
      ),
    ).toEqual([ids.coreOnly, ids.linkedBd, ids.standaloneBd]);
    expect(bdRows[0]?.id).toBe(ids.standaloneBd);
  });

  it("uses actual creation dates for Recently added across both sources, not last updates", () => {
    const coreRows = [
      { ...core(ids.coreOnly, "PROSPECT"), createdAt: "2026-10-02T00:00:00Z" },
    ];
    const bdRows = [
      {
        ...bd(ids.linkedBd, null),
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-31T00:00:00Z",
      },
      { ...bd(ids.standaloneBd, null), createdAt: "2026-10-03T00:00:00+00:00" },
    ];
    expect(
      sortProspectProfiles(coreRows, bdRows, "recent").map(
        (row) => row.record.id,
      ),
    ).toEqual([ids.standaloneBd, ids.coreOnly, ids.linkedBd]);
    expect(
      sortProspectProfiles(coreRows, bdRows, "saved").map(
        (row) => row.record.id,
      ),
    ).toEqual([ids.coreOnly, ids.linkedBd, ids.standaloneBd]);
  });

  it("keeps absent dates valid and deterministically after known dates without manufacturing timestamps", () => {
    const unknown = core(ids.coreOnly, "PROSPECT");
    const invalid = { ...bd(ids.linkedBd, null), createdAt: "" };
    const dated = bd(ids.standaloneBd, null);
    expect(
      sortProspectProfiles([unknown], [invalid, dated], "recent").map(
        (row) => row.record.id,
      ),
    ).toEqual([ids.standaloneBd, ids.coreOnly, ids.linkedBd]);
    expect(unknown).not.toHaveProperty("createdAt");
    expect(invalid.createdAt).toBe("");
    expect(
      clientSchema.parse({ ...unknown, createdAt: dated.createdAt }).createdAt,
    ).toBe(dated.createdAt);
    expect(
      clientSchema.safeParse({ ...unknown, createdAt: "invalid" }).success,
    ).toBe(false);
  });

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
