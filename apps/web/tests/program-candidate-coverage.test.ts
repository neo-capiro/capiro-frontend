import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { programResponseSchema } from "../src/features/portfolio/opportunities/contracts";
import { RelevantPrograms } from "../src/features/portfolio/opportunities/RelevantPrograms";
import {
  assertClientProgramPage,
  clientProgramPageSchema,
} from "../src/features/portfolio/client-profile/client-program-context";

const emptyPage = { data: [], total: 0, page: 1, limit: 20 };
const complete = {
  complete: true,
  evaluated: 12,
  limit: 400,
  discoveredAtLeast: 12,
  truncatedPaths: [],
  omittedPaths: [],
  totalScope: "complete",
};
const partial = {
  ...complete,
  complete: false,
  evaluated: 400,
  discoveredAtLeast: 470,
  totalScope: "evaluated_candidates",
};
function render(candidateCoverage: unknown, rest = {}) {
  const data = programResponseSchema.parse({
    ...emptyPage,
    ...rest,
    candidateCoverage,
  });
  return renderToStaticMarkup(createElement(RelevantPrograms, { data }))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");
}
describe("PE candidate discovery coverage", () => {
  it.each([undefined, null])(
    "keeps legacy/null coverage unknown (%s)",
    (candidateCoverage) => {
      expect(render(candidateCoverage)).toContain(
        "Discovery coverage is unknown",
      );
      expect(render(candidateCoverage)).not.toContain("Discovery complete");
    },
  );
  it("retains the exact supplied coverage and limits completeness to configured paths", () => {
    const raw = { ...emptyPage, candidateCoverage: complete };
    expect(programResponseSchema.parse(raw)).toEqual(raw);
    expect(
      assertClientProgramPage(clientProgramPageSchema.parse(raw), 1),
    ).toEqual(raw);
    const text = render(complete);
    expect(text).toContain("Discovery complete for the configured paths");
    expect(text).toContain("12 candidates evaluated");
    expect(text).toContain("0 matching results");
    expect(text).toContain("not the full program catalog");
  });
  it("discloses combined overflow even with no individually truncated paths and no filtered matches", () => {
    const text = render(partial);
    expect(text).toContain("Discovery incomplete");
    expect(text).toContain("400 candidates evaluated");
    expect(text).toContain("At least 470 candidates discovered");
    expect(text).toContain("0 matching results within the evaluated subset");
    expect(text).toContain("Ranking applies only within that subset");
    expect(text).not.toContain("Discovery complete");
  });
  it("retains coverage and total on an empty later page", () => {
    const text = render(partial, { page: 3, total: 21 });
    expect(text).toContain("21 matching results within the evaluated subset");
    expect(text).toContain("No relevant budget programs on this page");
  });
  it("discloses separately truncated and omitted paths", () => {
    const text = render({
      ...partial,
      truncatedPaths: ["prior_award"],
      omittedPaths: ["ecosystem"],
    });
    expect(text).toContain("Paths reaching the discovery limit: prior award");
    expect(text).toContain("Paths omitted: ecosystem");
  });
  it.each([
    { evaluated: -1 },
    { evaluated: 401 },
    { evaluated: 1.5 },
    { limit: 401 },
    { discoveredAtLeast: 11 },
    { truncatedPaths: ["unknown"] },
    { omittedPaths: ["unknown"] },
    { complete: "true" },
    { totalScope: "global" },
    { totalScope: "evaluated_candidates" },
    { truncatedPaths: ["prior_award"] },
    { omittedPaths: ["ecosystem"] },
    { discoveredAtLeast: 13 },
  ])("rejects malformed or contradictory coverage %j", (patch) => {
    expect(
      programResponseSchema.safeParse({
        ...emptyPage,
        candidateCoverage: { ...complete, ...patch },
      }).success,
    ).toBe(false);
  });
  it("does not infer completeness from an empty evaluated subset", () => {
    const text = render({
      ...partial,
      evaluated: 0,
      discoveredAtLeast: 0,
      omittedPaths: ["prior_award"],
    });
    expect(text).toContain("Discovery incomplete");
    expect(text).toContain("0 candidates evaluated");
  });
  it("refuses a false-complete scope and preserves the Overview page guard", () => {
    expect(
      programResponseSchema.safeParse({
        ...emptyPage,
        candidateCoverage: { ...partial, totalScope: "complete" },
      }).success,
    ).toBe(false);
    const value = clientProgramPageSchema.parse({
      ...emptyPage,
      candidateCoverage: partial,
    });
    expect(() => assertClientProgramPage(value, 2)).toThrow(
      "page could not be verified",
    );
    expect(value.candidateCoverage).toEqual(partial);
  });
});
