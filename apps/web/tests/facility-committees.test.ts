import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  currentCommitteeAssignments,
  facilityCommitteeSnapshotSchema,
  validCommitteeBioguide,
} from "../src/features/portfolio/client-profile/facility-committee-contracts";
import { FacilityCommitteeSnapshotView } from "../src/features/portfolio/client-profile/FacilityCommittees";

const bioguideId = "A000001";
const membership = {
  committeeId: "committee-987",
  committeeName: "Synthetic current committee",
  person: { personType: "member", id: "member-42", sourceId: 42 },
  membershipType: "member",
  position: "Ranking Member",
  party: "Synthetic party",
  rank: 2,
  status: "Source active",
  startedAt: "2025-01-03T12:00:00Z",
  endedAt: null,
  sourceUpdatedAt: "2026-10-14T12:00:00Z",
};
const snapshot = {
  kind: "member",
  id: "member-42",
  source: {
    snapshotId: "synthetic-directory-snapshot",
    memberId: 42,
    lastUpdatedAt: "2026-10-14T12:00:00Z",
  },
  identity: { memberId: 42, bioguideId },
  committees: [membership],
};
const schema = facilityCommitteeSnapshotSchema(bioguideId);

describe("existing Directory member committee snapshot", () => {
  it("correlates official identity case-insensitively without guessing a numeric member ID", () => {
    const value = facilityCommitteeSnapshotSchema("a000001").parse(snapshot);
    expect(value.id).toBe("member-42");
    expect(value.source.snapshotId).toBe(snapshot.source.snapshotId);
    expect(value.source.lastUpdatedAt).toBe(snapshot.source.lastUpdatedAt);
    expect(value.committees[0]).toEqual(membership);
  });

  it("requires canonical member ID and numeric source identity to agree", () => {
    expect(
      schema.safeParse({
        ...snapshot,
        id: "member-43",
        committees: [
          {
            ...membership,
            person: { ...membership.person, id: "member-43" },
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("refuses a different returned Bioguide", () => {
    expect(
      schema.safeParse({
        ...snapshot,
        identity: { ...snapshot.identity, bioguideId: "B000002" },
      }).success,
    ).toBe(false);
  });

  it("refuses uncorrelated numeric source/identity IDs", () => {
    expect(
      schema.safeParse({
        ...snapshot,
        source: { ...snapshot.source, memberId: 43 },
      }).success,
    ).toBe(false);
  });

  for (const [label, person] of [
    ["foreign canonical person", { ...membership.person, id: "member-43" }],
    ["foreign numeric source", { ...membership.person, sourceId: 43 }],
    ["staff person", { ...membership.person, personType: "staff" }],
  ])
    it(`refuses ${label} in the returned member associations`, () => {
      expect(
        schema.safeParse({
          ...snapshot,
          committees: [{ ...membership, person }],
        }).success,
      ).toBe(false);
    });

  it("refuses a staff membership even when the person ID matches", () => {
    expect(
      schema.safeParse({
        ...snapshot,
        committees: [{ ...membership, membershipType: "staff" }],
      }).success,
    ).toBe(false);
  });

  it("requires snapshot provenance and an explicit nullable membership end date", () => {
    expect(
      schema.safeParse({
        ...snapshot,
        source: { ...snapshot.source, snapshotId: "" },
      }).success,
    ).toBe(false);
    const { endedAt: omitted, ...withoutEndDate } = membership;
    expect(omitted).toBeNull();
    expect(
      schema.safeParse({ ...snapshot, committees: [withoutEndDate] }).success,
    ).toBe(false);
  });

  it("uses only the owner's endedAt-null current criterion and keeps stored metadata", () => {
    const value = schema.parse({
      ...snapshot,
      committees: [
        membership,
        {
          ...membership,
          committeeId: "committee-988",
          endedAt: "2026-10-01T00:00:00Z",
        },
        {
          ...membership,
          committeeId: "committee-989",
          endedAt: "2027-01-01T00:00:00Z",
        },
      ],
    });
    expect(currentCommitteeAssignments(value)).toEqual([membership]);
    expect(value.committees).toHaveLength(3);
    expect(value.committees[0]?.status).toBe("Source active");
    expect(value.committees[0]?.startedAt).toBe(membership.startedAt);
    expect(value.committees[0]?.sourceUpdatedAt).toBe(
      membership.sourceUpdatedAt,
    );
  });

  it("rejects name, numeric, membership UUID and whitespace guesses for the Bioguide input", () => {
    for (const value of [
      "Synthetic member",
      "42",
      "member-42",
      "committee-987",
      " A000001",
      "A000001 ",
      "",
    ])
      expect(validCommitteeBioguide(value)).toBe(false);
    expect(validCommitteeBioguide("a000001")).toBe(true);
  });
});

it("renders returned committee role/status and retained snapshot provenance without former associations", () => {
  const value = schema.parse({
    ...snapshot,
    committees: [
      membership,
      {
        ...membership,
        committeeId: "committee-988",
        committeeName: "Synthetic former committee",
        endedAt: "2026-10-01T00:00:00Z",
      },
    ],
  });
  const html = renderToStaticMarkup(
    createElement(FacilityCommitteeSnapshotView, { snapshot: value }),
  );
  expect(html).toContain("Synthetic current committee");
  expect(html).toContain("Ranking Member");
  expect(html).toContain("Source active");
  expect(html).toContain(snapshot.source.snapshotId);
  expect(html).toContain(snapshot.id);
  expect(html).toContain("not a live freshness guarantee");
  expect(html).not.toContain("Synthetic former committee");
});

it("discloses that an empty current result does not establish no assignments", () => {
  const value = schema.parse({ ...snapshot, committees: [] });
  const html = renderToStaticMarkup(
    createElement(FacilityCommitteeSnapshotView, { snapshot: value }),
  );
  expect(html).toContain("No current committee assignments were returned");
  expect(html).toContain("This does not establish that the member has none");
  expect(html).toContain(snapshot.source.snapshotId);
});

it("keeps unavailable source dates and committee names explicit", () => {
  const value = schema.parse({
    ...snapshot,
    source: { ...snapshot.source, lastUpdatedAt: null },
    committees: [
      {
        ...membership,
        committeeName: null,
        startedAt: null,
        sourceUpdatedAt: null,
      },
    ],
  });
  const html = renderToStaticMarkup(
    createElement(FacilityCommitteeSnapshotView, { snapshot: value }),
  );
  expect(html).toContain("Committee name unavailable");
  expect(html).toContain("Source updated Unavailable");
  expect(html).toContain("Started Unavailable");
});
