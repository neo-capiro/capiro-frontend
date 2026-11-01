import { describe, expect, it } from "vitest";
import { readConfig } from "../src/shared/portfolio/config/config";
import { formatDay } from "../src/shared/portfolio/ui/formatDay";

const baseEnv = {
  CORE_API_BASE_URL: "https://core.example.test",
  CAPIRO_REQUEST_ORIGIN: "https://app.capiro.ai",
};

describe("externalApp destination", () => {
  it("is not exposed when the existing app is this app at its own root", () => {
    const config = readConfig({
      ...baseEnv,
      CAPIRO_EXISTING_APP_URL: "https://app.capiro.ai",
    });
    expect(config.destinations.existingApp).toBe("https://app.capiro.ai");
    expect(config.destinations.externalApp).toBeUndefined();
  });

  it("is exposed for a genuinely different origin", () => {
    const config = readConfig({
      ...baseEnv,
      CAPIRO_EXISTING_APP_URL: "https://os.capiro.ai",
    });
    expect(config.destinations.externalApp).toBe("https://os.capiro.ai");
  });

  it("is exposed when the existing app is a path base on the same origin", () => {
    const config = readConfig({
      CORE_API_BASE_URL: "http://127.0.0.1:5191/api",
      CAPIRO_REQUEST_ORIGIN: "http://127.0.0.1:5191",
      CAPIRO_EXISTING_APP_URL: "http://127.0.0.1:5191/existing",
    });
    expect(config.destinations.externalApp).toBe(
      "http://127.0.0.1:5191/existing",
    );
  });

  it("stays unset when no existing app is configured", () => {
    const config = readConfig({ ...baseEnv });
    expect(config.destinations.existingApp).toBeUndefined();
    expect(config.destinations.externalApp).toBeUndefined();
  });
});

describe("formatDay", () => {
  it("renders day-only dates in one short-month format", () => {
    expect(formatDay("2026-09-03T15:06:04.065Z")).toBe("Sep 3, 2026");
    expect(formatDay("2026-11-01")).toBe("Nov 1, 2026");
    expect(formatDay(null)).toBe("—");
    expect(formatDay("")).toBe("—");
    expect(formatDay("not-a-date")).toBe("—");
  });
  it("keeps a day-only date on its calendar day in a US zone", () => {
    const previous = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      // Midnight UTC on 1 Nov is still 31 Oct in New York; the day must not move.
      expect(new Date("2026-11-01").getDate()).toBe(31);
      expect(formatDay("2026-11-01")).toBe("Nov 1, 2026");
      expect(formatDay(new Date("2026-11-01"))).toBe("Oct 31, 2026");
      // A timestamp still renders in the local zone because its time is the point.
      expect(formatDay("2026-11-01T03:00:00.000Z")).toBe("Oct 31, 2026");
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
});
