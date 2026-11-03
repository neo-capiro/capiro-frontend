import { describe, expect, it } from "vitest";
import {
  FUNDING_SOURCE_LABELS,
  FUNDING_STATE_LABELS,
  describeFundingFreshness,
  formatFundingTimestamp,
  fundingSourceLabel,
  fundingStateLabel,
} from "../src/shared/capiro/funding-source-presentation";

describe("funding source labels", () => {
  it("names every source in words instead of the raw enum", () => {
    expect(fundingSourceLabel("grants_gov")).toBe("Grants.gov");
    expect(fundingSourceLabel("sam_gov")).toBe("SAM.gov");
    expect(fundingSourceLabel("dibbs")).toBe("DIBBS");
    expect(fundingSourceLabel("sbir_sttr")).toBe("SBIR/STTR");
    expect(fundingSourceLabel("ca_portal")).toBe("California Grants Portal");
    expect(fundingSourceLabel("agency_forecast")).toBe("Agency forecasts");
    for (const raw of Object.keys(FUNDING_SOURCE_LABELS)) {
      expect(fundingSourceLabel(raw)).not.toBe(raw);
    }
  });

  it("humanises an unknown source without leaking a raw token", () => {
    expect(fundingSourceLabel("future_source")).toBe("Future source");
    expect(fundingSourceLabel(null)).toBe("Unknown source");
  });
});

describe("coverage state labels", () => {
  it("words every state the backend can emit", () => {
    expect(fundingStateLabel("current")).toBe("Up to date");
    expect(fundingStateLabel("stale")).toBe("Update overdue");
    expect(fundingStateLabel("initial_partial")).toBe("Initial sync incomplete");
    expect(fundingStateLabel("error_cached")).toBe(
      "Latest update incomplete; showing saved data",
    );
    expect(fundingStateLabel("degraded")).toBe("No usable coverage yet");
    expect(fundingStateLabel("never_synced")).toBe("Not synced yet");
    expect(fundingStateLabel("unavailable")).toBe("Status unavailable");
    expect(fundingStateLabel("not_enabled")).toBe("Not enabled for this workspace");
    expect(fundingStateLabel("unknown")).toBe("Status unknown");
    for (const raw of Object.keys(FUNDING_STATE_LABELS)) {
      expect(fundingStateLabel(raw)).not.toBe(raw);
    }
  });

  it("falls back to unknown for an unrecognised or missing state", () => {
    expect(fundingStateLabel("brand_new_state")).toBe("Status unknown");
    expect(fundingStateLabel(null)).toBe("Status unknown");
  });
});

describe("timestamps", () => {
  it("formats a real instant in UTC", () => {
    expect(formatFundingTimestamp("2026-10-22T01:21:16.466Z")).toBe(
      "Oct 22, 2026, 01:21 UTC",
    );
  });

  it("returns null instead of throwing on absent or invalid values", () => {
    expect(formatFundingTimestamp(null)).toBeNull();
    expect(formatFundingTimestamp(undefined)).toBeNull();
    expect(formatFundingTimestamp("")).toBeNull();
    expect(formatFundingTimestamp("not-a-date")).toBeNull();
  });
});

describe("freshness presentation", () => {
  it("DIBBS with an initial partial run and no success date claims no success, not no data", () => {
    const view = describeFundingFreshness({
      source: "dibbs",
      state: "initial_partial",
      lastSyncedAt: null,
      lastSuccessAt: null,
      latestAttemptAt: "2026-11-03T10:45:56.992Z",
    });
    expect(view.sourceLabel).toBe("DIBBS");
    expect(view.stateLabel).toBe("Initial sync incomplete");
    expect(view.successLabel).toBe("No successful update yet");
    // The attempt is shown, and never promoted into the success slot.
    expect(view.attemptLabel).toBe("Latest attempt Nov 03, 2026, 10:45 UTC");
    expect(view.successLabel).not.toContain("Nov 03");
  });

  it("SBIR/STTR stale shows the last successful update", () => {
    const view = describeFundingFreshness({
      source: "sbir_sttr",
      state: "stale",
      lastSyncedAt: "2026-10-22T01:21:16.466Z",
      lastSuccessAt: "2026-10-22T01:21:16.466Z",
      latestAttemptAt: "2026-10-22T01:21:16.466Z",
    });
    expect(view.sourceLabel).toBe("SBIR/STTR");
    expect(view.stateLabel).toBe("Update overdue");
    expect(view.successLabel).toBe("Last successful update Oct 22, 2026, 01:21 UTC");
    // Repeating the success instant as an attempt would imply a second event.
    expect(view.attemptLabel).toBeNull();
  });

  it("falls back to lastSyncedAt when the newer success field is absent", () => {
    const view = describeFundingFreshness({
      source: "grants_gov",
      state: "current",
      lastSyncedAt: "2026-11-01T02:35:00.000Z",
    });
    expect(view.successLabel).toContain("Nov 01, 2026");
    expect(view.attemptLabel).toBeNull();
  });

  it("an unparseable date degrades to unavailable wording, never a crash", () => {
    const view = describeFundingFreshness({
      source: "sam_gov",
      state: "error_cached",
      lastSyncedAt: "garbage",
      latestAttemptAt: "also-garbage",
    });
    expect(view.stateLabel).toBe("Latest update incomplete; showing saved data");
    // An unparseable date proves nothing about history.
    expect(view.successLabel).toBe("Last successful update unavailable");
    expect(view.attemptLabel).toBeNull();
  });
});

describe("absent success timestamp wording", () => {
  it.each(["never_synced", "initial_partial", "degraded"])(
    "a state that proves no success (%s) says so plainly",
    (state) => {
      expect(describeFundingFreshness({ source: "dibbs", state, lastSyncedAt: null }).successLabel)
        .toBe("No successful update yet");
    },
  );

  it.each(["unavailable", "unknown", "not_enabled"])(
    "a state that says nothing about history (%s) never claims no success",
    (state) => {
      const label = describeFundingFreshness({ source: "sbir_sttr", state, lastSyncedAt: null }).successLabel;
      expect(label).toBe("Last successful update unavailable");
      expect(label).not.toContain("No successful");
    },
  );
});

describe("source filter contract", () => {
  it("keeps every option value as the raw enum while labelling it", () => {
    const options = Object.keys(FUNDING_SOURCE_LABELS).map((value) => ({
      value,
      label: fundingSourceLabel(value),
    }));
    expect(options.map((o) => o.value)).toEqual([
      "grants_gov",
      "sam_gov",
      "agency_forecast",
      "dibbs",
      "sbir_sttr",
      "ca_portal",
    ]);
    expect(options.every((o) => o.value !== o.label)).toBe(true);
  });
});
