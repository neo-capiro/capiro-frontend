import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError } from "../src/shared/portfolio/api/http";
import {
  readOpportunitySource,
  opportunityReadDeadlineMs,
} from "../src/features/portfolio/opportunities/read";
import { ProfileResults } from "../src/features/portfolio/index/ProfileResults";
import { clientSchema } from "../src/features/portfolio/index/contracts";
import { preparationSchema } from "../src/features/portfolio/calendar/preparation/schema";
import { PreparationContent } from "../src/features/portfolio/calendar/preparation/PreparationContent";
import { preparationReview } from "../src/features/portfolio/calendar/preparation/review";
import { facilityDistrict } from "../src/features/portfolio/client-profile/facility-map-model";
import { facilitySchema } from "../src/features/portfolio/client-profile/contracts";

vi.mock("../src/features/portfolio/client-profile/public", () => ({
  ClientMonogram: () => null,
}));
afterEach(() => vi.restoreAllMocks());
describe("bounded opportunity source recovery", () => {
  it("ends a pending read at the deadline, with source-specific recovery and no retry", async () => {
    const deadline = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(deadline.signal);
    const read = vi.fn(
      (signal: AbortSignal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener("abort", () => reject(signal.reason)),
        ),
    );
    const pending = readOpportunitySource(
      "Relevant budget programs",
      new AbortController().signal,
      read,
    );
    const assertion = expect(pending).rejects.toMatchObject({
      status: 504,
      message: expect.stringContaining(
        "Relevant budget programs did not respond within 25 seconds",
      ),
    });
    deadline.abort(new DOMException("Timed out", "TimeoutError"));
    await assertion;
    expect(timeout).toHaveBeenCalledWith(opportunityReadDeadlineMs);
    expect(read).toHaveBeenCalledTimes(1);
  });
  it.each([401, 403, 404])(
    "preserves explicit HTTP %s outcomes",
    async (status) => {
      const refusal = new ApiError(status, "Refused");
      await expect(
        readOpportunitySource(
          "Opportunities",
          new AbortController().signal,
          () => Promise.reject(refusal),
        ),
      ).rejects.toBe(refusal);
    },
  );
  it("allows an explicit successful retry after a failed source", async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, "Internal error"))
      .mockResolvedValueOnce({ total: 0 });
    const signal = new AbortController().signal;
    await expect(
      readOpportunitySource("Opportunities", signal, read),
    ).rejects.toThrow("Opportunities could not be loaded");
    await expect(
      readOpportunitySource("Opportunities", signal, read),
    ).resolves.toEqual({ total: 0 });
  });
});
describe("portfolio record display", () => {
  it("shows legacy nullable client types and omits empty type sections", () => {
    const client = clientSchema.parse({
      id: "10000000-0000-4000-8000-000000000001",
      name: "Synthetic company",
      status: "active",
      profileStatus: "ACTIVE",
      profileType: null,
    });
    const html = renderToStaticMarkup(
      createElement(ProfileResults, { rows: [client], view: "list" }),
    );
    expect(html).toContain("Profile type");
    expect(html).toContain("<td>Client</td>");
    expect(
      renderToStaticMarkup(
        createElement(ProfileResults, { rows: [], view: "list" }),
      ),
    ).toBe("");
  });
  it("displays the same canonical district used for evidence requests", () => {
    const facility = facilitySchema.parse({
      id: "synthetic",
      name: "Test",
      clientId: "synthetic-client",
      state: "DC",
      congressionalDistrict: "98",
      addressLine: null,
      city: null,
      zip: null,
      employeeCount: null,
      notes: null,
    });
    expect(facilityDistrict(facility)).toBe("DC-00");
    expect(facilityDistrict({ ...facility, state: "VA" })).toBeNull();
  });
});
const savedPrep = (status = "evidence_found", factIds = ["fact-one"]) =>
  preparationSchema.parse({
    id: "synthetic-prep",
    status: "approved",
    summary: null,
    agenda: [],
    talkingPoints: [],
    risks: [],
    followUps: [],
    createdAt: "2026-11-04T12:00:00Z",
    generatedFrom: {
      briefing: {
        version: 2,
        takeaways: [],
        sections: {
          decisions: {
            status,
            items: [{ text: "Saved supported decision", factIds }],
            gap: "",
          },
        },
        facts: [
          {
            id: "fact-one",
            sourceId: "source-one",
            quote: "Saved source quote",
          },
        ],
        coverage: {
          extractedBatches: 1,
          totalBatches: 1,
          factCount: 1,
          reviewedFactCount: 1,
          selectedFactCount: 1,
          partial: false,
        },
        limitations: ["A source was not available."],
      },
    },
  });
describe("saved preparation coherence", () => {
  it("distinguishes a legitimate limitation from a structured contradiction, preserving the saved text", () => {
    const prep = savedPrep();
    expect(preparationReview(prep)).toEqual({
      issues: [],
      hasLimitations: true,
    });
    const html = renderToStaticMarkup(
      createElement(PreparationContent, { prep }),
    );
    expect(html).toContain("Source limitations to review");
    expect(html).not.toContain("Saved preparation needs review");
    expect(html).toContain("A source was not available.");
    expect(html).toContain("Saved supported decision");
  });
  it("visibly marks missing references and no-evidence contradictions even on approved saved preps", () => {
    const prep = savedPrep("no_evidence", ["missing-fact"]);
    expect(preparationReview(prep).issues).toHaveLength(2);
    const html = renderToStaticMarkup(
      createElement(PreparationContent, { prep }),
    );
    expect(html).toContain("Saved preparation needs review");
    expect(html).toContain("even if its saved status is approved");
    expect(prep.status).toBe("approved");
  });
});
