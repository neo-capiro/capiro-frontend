import { expect, it } from "vitest";
import {
  fundingDeadlineItem,
  fundingSearchWindow,
} from "../src/features/portfolio/calendar/funding-deadline";
import {
  dateFact,
  fundingDetail,
  fundingRecord,
} from "./funding-calendar-fixtures";

it("preserves a source date across zones without inventing a midnight timestamp", () => {
  const detail = fundingDetail(fundingRecord("day-only", "sbir_sttr"));
  const item = fundingDeadlineItem(
    detail.opportunity,
    detail.authoritativeSourceUrl,
    "Pacific/Honolulu",
  );
  expect(item).toMatchObject({
    day: "2026-10-14",
    kind: "deadline",
    timeZone: "Pacific/Honolulu",
  });
  expect(item?.startAt).toBeUndefined();
  expect(item?.provenance).toContain("source date only");
});

it("projects only a declared source instant into the selected Calendar day and zone", () => {
  const detail = fundingDetail(
    fundingRecord(),
    dateFact("2026-11-01T01:30:00-04:00", "timestamp"),
  );
  const item = fundingDeadlineItem(
    detail.opportunity,
    null,
    "America/Los_Angeles",
  );
  expect(item).toMatchObject({
    day: "2026-10-31",
    startAt: "2026-11-01T05:30:00Z",
    timeZone: "America/Los_Angeles",
  });
  expect(item?.provenance).toContain("source timestamp");
});

it.each([
  dateFact("2026-10-14T18:00:00Z", "raw"),
  dateFact("October 14 at noon", "raw"),
  dateFact("2026-10-14T18:00:00", "timestamp"),
  dateFact("2026-02-30", "date"),
  dateFact("2026-10-14", null),
  dateFact(null, "date"),
])(
  "does not turn unsupported or missing source precision into an event: %j",
  (fact) => {
    const detail = fundingDetail(fundingRecord(), fact);
    expect(
      fundingDeadlineItem(detail.opportunity, null, "UTC"),
    ).toBeUndefined();
  },
);

it("does not substitute archive or posted dates for an unavailable response deadline", () => {
  const detail = fundingDetail(fundingRecord(), dateFact(null, null));
  expect(fundingDeadlineItem(detail.opportunity, null, "UTC")).toBeUndefined();
});

it("binds stable keys to source and retained record provenance, not a shared provider ID", () => {
  const sam = fundingDetail(fundingRecord("shared"));
  const sbir = fundingDetail(fundingRecord("shared", "sbir_sttr"));
  const solicitation = fundingDetail({
    ...sbir.opportunity,
    sourceFacts: { provenance: "tango_sbir_solicitation" },
  });
  const keys = [sam, sbir, solicitation].map(
    (d) => fundingDeadlineItem(d.opportunity, null, "UTC")?.key,
  );
  expect(keys.every(Boolean)).toBe(true);
  expect(new Set(keys).size).toBe(3);
});

it("uses only a permitted authoritative HTTPS source link", () => {
  const detail = fundingDetail();
  for (const href of [
    "http://example.test",
    "javascript:alert(1)",
    "https://user:secret@example.test",
    "invalid",
  ])
    expect(
      fundingDeadlineItem(detail.opportunity, href, "UTC")?.href,
    ).toBeUndefined();
  expect(
    fundingDeadlineItem(
      detail.opportunity,
      detail.authoritativeSourceUrl,
      "UTC",
    )?.href,
  ).toBe(detail.authoritativeSourceUrl);
  detail.opportunity.capabilities.sourceClick = {
    allowed: false,
    reason: "Synthetic denied source link",
  };
  expect(
    fundingDeadlineItem(
      detail.opportunity,
      detail.authoritativeSourceUrl,
      "UTC",
    )?.href,
  ).toBeUndefined();
});

it("does not project a denied view or contradictory date availability", () => {
  const detail = fundingDetail();
  detail.opportunity.capabilities.view = {
    allowed: false,
    reason: "Unavailable",
  };
  expect(fundingDeadlineItem(detail.opportunity, null, "UTC")).toBeUndefined();
  const unavailable = fundingDetail();
  expect(
    fundingDeadlineItem(
      {
        ...unavailable.opportunity,
        dates: {
          ...unavailable.opportunity.dates,
          responseDeadline: {
            ...dateFact(),
            unavailableReason: "Not confirmed",
          },
        },
      },
      null,
      "UTC",
    ),
  ).toBeUndefined();
});

it("encloses date-only and zoned bounds across DST without narrowing away either edge", () => {
  expect(
    fundingSearchWindow("2026-11-01", "2026-12-01", "America/New_York"),
  ).toEqual({
    deadlineFrom: "2026-11-01T00:00:00Z",
    deadlineTo: "2026-12-01T05:00:00Z",
  });
  expect(
    fundingSearchWindow("2026-10-01", "2026-11-01", "Pacific/Auckland"),
  ).toEqual({
    deadlineFrom: "2026-09-30T11:00:00Z",
    deadlineTo: "2026-11-01T00:00:00Z",
  });
  expect(() =>
    fundingSearchWindow("2026-11-01", "2026-10-01", "UTC"),
  ).toThrow();
});
