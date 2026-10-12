import { describe, expect, it } from "vitest";
import {
  portfolioStages,
  prospectForIdSchema,
  stageCatalogSchema,
  type ProspectActivity,
} from "../src/features/portfolio/prospects/contracts";
import {
  prospectHistoryRows,
  prospectStageProgress,
} from "../src/features/portfolio/prospects/overview";
import { prospect, prospectId } from "./browser/fixtures";

const catalog = stageCatalogSchema.parse({
  version: "portfolio-3.1",
  createStage: "identified",
  legacyMapping: "pending",
  allowLegacyTransitions: false,
  stages: portfolioStages.map((value) => ({ value, label: value })),
});
describe("prospect overview read boundary", () => {
  it("rejects a well-shaped record returned for another prospect", () => {
    expect(prospectForIdSchema(prospectId).parse(prospect).id).toBe(prospectId);
    expect(
      prospectForIdSchema(prospectId).safeParse({
        ...prospect,
        id: "70000000-0000-4000-8000-000000000002",
      }).success,
    ).toBe(false);
  });
  it("keeps legacy values and an absent new-stage catalog unmapped", () => {
    expect(prospectStageProgress("won", catalog)).toEqual([]);
    expect(prospectStageProgress("outreach", catalog)).toEqual([]);
    expect(prospectStageProgress("proposal", null)).toEqual([]);
  });
  it("marks the current ordinal position without inventing stage-entry timestamps", () => {
    const progress = prospectStageProgress("proposal", catalog);
    expect(progress.map((step) => step.position)).toEqual([
      "earlier",
      "earlier",
      "earlier",
      "current",
      "later",
      "later",
    ]);
    expect(progress.find((step) => step.position === "current")?.value).toBe(
      "proposal",
    );
    expect(progress.every((step) => !("since" in step))).toBe(true);
  });
  it.each(["closed_won", "closed_lost"])(
    "preserves %s in the shared closed position",
    (value) => {
      const steps = prospectStageProgress(value, catalog);
      expect(steps.filter((step) => step.position === "current")).toEqual([
        {
          value: "closed",
          label: value === "closed_won" ? "Closed won" : "Closed lost",
          position: "current",
        },
      ]);
      expect(steps).toHaveLength(6);
    },
  );
  it("orders activity by actual timestamp, filters exact kinds and leaves cached input unchanged", () => {
    const activity = (
      id: string,
      kind: string,
      createdAt: string,
    ): ProspectActivity => ({
      id,
      kind,
      createdAt,
      body: id,
      actorUserId: null,
    });
    const rows = [
      activity("a", "note", "2026-10-11T19:00:00Z"),
      activity("b", "stage", "2026-10-11T16:30:00-04:00"),
      activity("c", "note", "2026-10-11T20:00:00Z"),
    ];
    expect(prospectHistoryRows(rows).map((row) => row.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(prospectHistoryRows(rows, "note").map((row) => row.id)).toEqual([
      "c",
      "a",
    ]);
    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
  });
});
