import { describe, it, expect } from "vitest";
import type { ActionQueryResponse } from "@capiro/meri-contracts/action-application";
import wire from "./fixtures/meri-actions/query.json";
import { recommendationPage } from "../src/shared/meri-actions/projection";
import { readableTitle } from "../src/shared/presentation/text";

describe("readable public titles", () => {
  it.each(["Quarterly research priorities", "Client: annual priorities"])(
    "preserves useful supplied title %s",
    (title) => {
      expect(readableTitle(title, "Memory review")).toBe(title);
    },
  );
  it.each([
    "user:synthetic-key:learning-signal",
    "30000000-0000-4000-8000-000000000001",
    " ",
  ])("uses a neutral fallback for %s without inferring content", (title) => {
    expect(readableTitle(title, "Memory review")).toBe("Memory review");
  });
});

describe("recommendation display preserves real coverage conditions", () => {
  it.each(["partial", "unavailable", "denied"] as const)(
    "keeps %s source state visible",
    (status) => {
      const query = structuredClone(
        wire.response,
      ) as unknown as ActionQueryResponse;
      query.observation.result.sources[0]!.status = status;
      const page = recommendationPage(query, () => ({}));
      expect(page.coverageSummary!.join(" ")).toContain(
        `Source action_items_complete: ${status}.`,
      );
      expect(page.coverageSummary!.join(" ")).toContain("Freshness is unknown");
      expect(page.coverageNotes.join(" ")).toContain("Enumeration: unknown");
    },
  );
  it("does not invent unknown freshness or limited enumeration for complete fresh input", () => {
    const query = structuredClone(
      wire.response,
    ) as unknown as ActionQueryResponse;
    const result = query.observation.result;
    result.coverage.enumeration = "complete";
    result.coverage.historySupport = "supported";
    result.coverage.limitations = [];
    result.sources[0]!.status = "checked";
    result.sources[0]!.freshness = "fresh";
    const summary = recommendationPage(query, () => ({})).coverageSummary!.join(
      " ",
    );
    expect(summary).not.toContain("Freshness is unknown");
    expect(summary).not.toContain("Coverage is limited");
    expect(summary).toContain("not a global absence");
  });
  it("keeps stale sources and page refusal visible", () => {
    const query = structuredClone(
      wire.response,
    ) as unknown as ActionQueryResponse;
    const result = query.observation.result;
    result.sources[0]!.freshness = "stale";
    result.pageCoverage.sourceReason = "Synthetic access restriction";
    const summary = recommendationPage(query, () => ({})).coverageSummary!.join(
      " ",
    );
    expect(summary).toContain("sources are stale");
    expect(summary).toContain("Synthetic access restriction");
  });
});
