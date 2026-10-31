import { expect, it } from "vitest";
import { fundingDeadlineItems } from "../src/features/modules/calendar/agenda";
import { fundingRecord as fundingRecordSchema } from "../src/shared/capiro/operations/intelligence-funding";
import { fundingRecord } from "./funding-calendar-fixtures";

it.each(["2026-10-14", "2026-10-14T00:00:00Z"])(
  "excludes agency forecasts even when the response supplies a deadline %s",
  (deadline) => {
    // Core currently returns null; the published codec also admits these values.
    // A contradictory response must not promote a forecast to a deadline.
    const forecast = fundingRecordSchema.parse({
      ...fundingRecord("synthetic-forecast", "agency_forecast"),
      deadline,
    });
    const confirmed = fundingRecord("synthetic-confirmed", "sam_gov");
    expect(fundingDeadlineItems([forecast, confirmed])).toEqual(
      fundingDeadlineItems([confirmed]),
    );
    expect(fundingDeadlineItems([forecast])).toEqual([]);
  },
);

it.each(["grants_gov", "sam_gov", "dibbs", "sbir_sttr", "ca_portal"] as const)(
  "preserves the existing %s deadline projection",
  (source) => {
    const record = fundingRecord("synthetic-deadline", source);
    expect(fundingDeadlineItems([record])).toEqual([
      {
        key: `funding:${source}:synthetic-deadline`,
        source: "Deadlines",
        title: record.title,
        date: "2026-10-14",
        time: `Source deadline: ${record.deadline}`,
        context: "Synthetic agency · Source date precision retained",
        href: undefined,
      },
    ]);
  },
);

it("leaves missing deadlines unplaced and unknown sources outside the wire contract", () => {
  expect(
    fundingDeadlineItems([
      fundingRecord("synthetic-forecast", "agency_forecast"),
      { ...fundingRecord(), deadline: null },
    ]),
  ).toEqual([]);
  expect(
    fundingRecordSchema.safeParse({ ...fundingRecord(), source: "unknown" })
      .success,
  ).toBe(false);
});
