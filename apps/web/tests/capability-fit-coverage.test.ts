import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fitSchema } from "../src/features/portfolio/capabilities/contracts";
import { CapabilityFit } from "../src/features/portfolio/capabilities/CapabilityFit";
import { refreshCapabilityFit } from "../src/features/portfolio/capabilities/writer";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { clientId } from "./browser/fixtures";
import { fit } from "./browser/capability-boundary-fixtures";

const observed = vi.hoisted(() => ({
  data: undefined as unknown,
  error: null as Error | null,
}));
vi.mock("../src/features/portfolio/capabilities/queries", () => ({
  useCapabilityFit: () => ({
    data: observed.data,
    isSuccess: !observed.error,
    error: observed.error,
    isPending: false,
    isFetching: false,
  }),
}));
vi.mock("../src/features/portfolio/capabilities/mutations", () => ({
  useRefreshFit: () => ({
    canWrite: true,
    isPending: false,
    error: null,
    mutate: vi.fn(),
  }),
}));

const partial = {
  ...fit,
  status: "partial",
  sources: { pe: true, bill: false, fo: true },
  emptyReason:
    "Some capability-fit sources are unavailable or incomplete. Available matches are shown but were not saved; the previous saved result was retained.",
};
const unknown =
  "Source coverage for this saved result is unknown. Refresh to compute a result with source coverage.";
function render(raw: unknown, compact: boolean) {
  observed.data = fitSchema.parse(raw);
  observed.error = null;
  return renderToStaticMarkup(
    createElement(CapabilityFit, {
      clientId,
      compact,
      existingApp: "https://example.test",
    }),
  );
}

describe("capability fit source coverage", () => {
  it("accepts partial/unavailable and preserves a validated source mask", () => {
    expect(fitSchema.parse(partial)).toMatchObject(partial);
    expect(
      fitSchema.parse({
        ...partial,
        status: "unavailable",
        matches: [],
        computedAt: null,
      }),
    ).toMatchObject({ status: "unavailable", matches: [] });
  });
  it.each([null, { pe: true }, { pe: "true", bill: false, fo: false }])(
    "rejects malformed supplied source coverage %s",
    (sources) => {
      expect(fitSchema.safeParse({ ...fit, sources }).success).toBe(false);
    },
  );
  it("keeps older responses valid without inventing coverage", () => {
    expect(fitSchema.parse(fit)).toEqual(fit);
    expect(fitSchema.parse(fit)).not.toHaveProperty("sources");
  });
  for (const compact of [false, true]) {
    it(`shows partial explanation with matches and source contributions (compact=${compact})`, () => {
      const html = render(partial, compact);
      expect(html).toContain("Partial coverage");
      expect(html).toContain(partial.emptyReason);
      expect(html).toContain("Program elements: contributed");
      expect(html).toContain("Bills: not confirmed");
      expect(html).toContain("Funding opportunities: contributed");
      expect(html).toContain(
        "Source contributions do not establish full catalog coverage.",
      );
      expect(html).toContain(fit.matches[0]!.target);
      expect(html).toContain("Open target");
    });
    it(`distinguishes legacy unknown coverage from failed unsaved refresh (compact=${compact})`, () => {
      const html = render(
        {
          ...fit,
          status: "partial",
          sources: { pe: false, bill: false, fo: false },
          emptyReason: unknown,
        },
        compact,
      );
      expect(html).toContain(unknown);
      expect(html).not.toContain("were not saved");
      expect(html).not.toContain(": contributed");
    });
    it(`preserves stale warning plus unknown explanation (compact=${compact})`, () => {
      const html = render(
        { ...fit, status: "stale", emptyReason: unknown },
        compact,
      );
      expect(html).toContain("Profile changed");
      expect(html).toContain(unknown);
      expect(html).toContain("Source contributions unknown");
    });
    it(`renders unavailable outcome and then the separate prior GET snapshot (compact=${compact})`, () => {
      const reason =
        "Capability-fit sources are unavailable. No match result was computed; the previous saved result was retained.";
      const failed = render(
        {
          ...fit,
          status: "unavailable",
          matches: [],
          computedAt: null,
          sources: { pe: false, bill: false, fo: false },
          emptyReason: reason,
        },
        compact,
      );
      expect(failed).toContain("Fit unavailable");
      expect(failed).toContain(reason);
      expect(failed).not.toContain(fit.matches[0]!.target);
      const reread = render(
        { ...fit, sources: { pe: true, bill: true, fo: true } },
        compact,
      );
      expect(reread).toContain(fit.matches[0]!.target);
      expect(reread).not.toContain(reason);
      expect(reread).not.toContain("Fit unavailable");
    });
    it(`preserves thin/not-computed empty reasons (compact=${compact})`, () => {
      for (const status of ["empty", "profile_too_thin"]) {
        const html = render(
          {
            ...fit,
            status,
            matches: [],
            computedAt: null,
            emptyReason: "Server supplied empty reason",
            sources: { pe: false, bill: false, fo: false },
          },
          compact,
        );
        expect(html).toContain("Server supplied empty reason");
        expect(html).not.toContain(": contributed");
      }
    });
  }
  it("parses the partial refresh receipt through the existing guarded writer without another request", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(partial));
    const guard = vi.fn();
    const signal = new AbortController().signal;
    await expect(
      refreshCapabilityFit(createApiClient(fetcher), clientId, {
        signal,
        guard,
      }),
    ).resolves.toEqual(partial);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      `/api/backend/core/clients/${clientId}/capability-fit/refresh`,
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      signal,
    });
    expect(guard).toHaveBeenCalledTimes(2);
  });
  it("does not show cached matches when the current read has failed", () => {
    observed.data = fit;
    observed.error = new Error("Current read unavailable");
    const html = renderToStaticMarkup(
      createElement(CapabilityFit, { clientId }),
    );
    expect(html).not.toContain(fit.matches[0]!.target);
    expect(html).toContain("Current read unavailable");
  });
});
