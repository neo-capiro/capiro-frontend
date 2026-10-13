import { describe, expect, it } from "vitest";
import type { Committee } from "../src/features/portfolio/relationships/directory-contracts";
import {
  committeeOptions,
  parentCommitteeBranch,
  validateCommitteeCatalog,
} from "../src/features/portfolio/relationships/committee/catalog";
const house: Committee = {
  id: "house-armed",
  officeId: 1,
  parentOfficeId: null,
  name: "Armed Services",
  chamber: "House",
  kind: "committee",
  staffCount: 10,
};
const subcommittee: Committee = {
  ...house,
  id: "house-tactical",
  officeId: 2,
  parentOfficeId: 1,
  name: "Tactical Air and Land Forces",
  kind: "subcommittee",
  staffCount: 3,
};
const senate: Committee = {
  ...house,
  id: "senate-armed",
  officeId: 3,
  chamber: "Senate",
};
const rows = [subcommittee, senate, house];
describe("complete committee taxonomy", () => {
  it("accepts a complete catalog independently of response order", () => {
    expect(validateCommitteeCatalog(rows)).toEqual(rows);
  });
  it.each(
    [
      [house, house],
      [house, { ...senate, officeId: house.officeId }],
      [subcommittee],
      [{ ...house, parentOfficeId: house.officeId }],
      [{ ...house, parentOfficeId: 2 }, subcommittee],
      [senate, { ...subcommittee, parentOfficeId: senate.officeId }],
    ].map((rows) => ({ rows })),
  )(
    "refuses conflicting, missing, cross-chamber and cyclic parent identities",
    ({ rows }) => {
      expect(() => validateCommitteeCatalog(rows)).toThrow();
    },
  );
  it("uses chambers only as grouping branches and counts direct committees", () => {
    const groups = committeeOptions(rows, null, "");
    expect(
      groups.map(({ label, childCount }) => ({ label, childCount })),
    ).toEqual([
      { label: "House", childCount: 1 },
      { label: "Senate", childCount: 1 },
    ]);
    expect(groups.every((group) => group.committee === undefined)).toBe(true);
  });
  it("allows choosing an actual parent committee separately from opening its descendants", () => {
    const choices = committeeOptions(rows, { chamber: "House" }, "");
    expect(choices).toHaveLength(1);
    expect(choices[0]).toMatchObject({
      committee: house,
      branch: { chamber: "House", officeId: 1 },
      childCount: 1,
    });
    const descendants = committeeOptions(rows, choices[0]!.branch!, "");
    expect(descendants[0]).toMatchObject({
      committee: subcommittee,
      childCount: 0,
    });
    expect(descendants[0]).not.toHaveProperty("branch");
  });
  it("searches the full parent path without confusing same-named committees", () => {
    expect(committeeOptions(rows, null, "  tactical AIR ")[0]).toMatchObject({
      committee: subcommittee,
      detail: "House / Armed Services / Tactical Air and Land Forces",
    });
    expect(
      committeeOptions(rows, null, "Armed Services").map((row) => row.key),
    ).toEqual(["house-armed", "senate-armed", "house-tactical"]);
    expect(
      committeeOptions(rows, null, "Senate").map((row) => row.key),
    ).toEqual(["senate-armed"]);
    expect(committeeOptions(rows, null, "no matching committee")).toEqual([]);
  });
  it("returns to the actual parent branch without changing selected identities", () => {
    expect(
      parentCommitteeBranch(rows, { chamber: "House", officeId: 2 }),
    ).toEqual({ chamber: "House", officeId: 1 });
    expect(
      parentCommitteeBranch(rows, { chamber: "House", officeId: 1 }),
    ).toEqual({ chamber: "House" });
    expect(parentCommitteeBranch(rows, { chamber: "House" })).toBeNull();
  });
});
