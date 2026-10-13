import { describe, expect, it } from "vitest";
import { officialDateSchema } from "../../../../../shared/capiro/operations/legiwatch-calendar-schemas";
import {
  clockHour,
  displayTime,
  officialToday,
  shiftDate,
  weekStart,
} from "./calendar-dates";

describe("official hearing calendar dates", () => {
  it("keeps the official Eastern date at UTC midnight and across DST boundaries", () => {
    expect(officialToday(new Date("2026-10-12T00:30:00Z"))).toBe("2026-10-11");
    expect(shiftDate("2026-03-07", 2)).toBe("2026-03-09");
    expect(weekStart("2026-11-01")).toBe("2026-10-26");
  });
  it("uses announced wall time without inventing an instant or a capture hour", () => {
    expect(displayTime(null, null)).toBe("Time not announced");
    expect(clockHour(null, null)).toBeNull();
    expect(clockHour(null, "10:30 AM")).toBe(10);
    expect(clockHour(null, "12:00 AM")).toBe(0);
    expect(clockHour(null, "2:15 PM")).toBe(14);
    expect(clockHour(null, "Following adjournment")).toBeNull();
    expect(clockHour("2026-11-01T14:00:00Z", null)).toBe(9);
  });
  it("rejects impossible dates before dispatching a calendar operation", () => {
    expect(officialDateSchema.safeParse("2026-02-31").success).toBe(false);
    expect(officialDateSchema.safeParse("2026-13-01").success).toBe(false);
    expect(officialDateSchema.safeParse("2028-02-29").success).toBe(true);
  });
});
