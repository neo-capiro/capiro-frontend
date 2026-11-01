import { describe, expect, it, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  forecastSchema,
  forecastHistorySchema,
  forecastPageSchema,
  type Forecast,
} from "../src/features/portfolio/calendar/forecasts/contracts";
import {
  confidenceLabel,
  elapsedLabel,
  forecastsCsv,
  observationLabel,
  observationMaxAgeMs,
  periodLabel,
} from "../src/features/portfolio/calendar/forecasts/presentation";
import {
  fetchForecasts,
  fetchForecastHistory,
} from "../src/features/portfolio/calendar/forecasts/api";
import type { ApiClient } from "../src/shared/portfolio/api/http";
import { ForecastWindows } from "../src/features/portfolio/calendar/forecasts/ForecastWindows";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
import { readConfig } from "../src/shared/portfolio/config/config";

const query = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => query.value }));
vi.mock("@/shared/portfolio/api/provider", () => ({ useApi: () => ({}) }));
vi.mock("../src/features/portfolio/calendar/useMeetingClock", () => ({
  useMeetingClock: () => Date.parse("2026-11-01T12:00:00Z"),
}));
vi.mock("@/shared/portfolio/ui/QueryState", () => ({
  QueryState: ({ error, pending }: { error?: Error; pending?: boolean }) =>
    error ? error.message : pending ? "Loading…" : null,
}));

const now = Date.parse("2026-11-01T12:00:00Z");
const fixture: Forecast = {
  id: "synthetic-forecast",
  revision: 1,
  title: "Synthetic rulemaking target",
  eventType: "proposed_rule",
  period: { precision: "month", raw: "11/00/2026", year: 2026, month: 11 },
  status: "published",
  source: {
    rin: "SYNTHETIC",
    edition: "Synthetic 2026 edition",
    url: "https://www.reginfo.gov/public/do/eAgendaViewRule?RIN=SYNTHETIC",
    issuedAt: null,
    sha256: "a".repeat(64),
  },
  confidence: "not_supplied",
  observedAt: "2026-10-31T12:00:00Z",
  recordedAt: "2026-10-31T12:00:00Z",
};
const page = {
  schemaVersion: 1 as const,
  items: [fixture],
  page: 1,
  pageSize: 50,
  total: 1,
  coverage: {
    lastSuccessfulCheckAt: fixture.observedAt,
    lastAttemptAt: fixture.observedAt,
    lastCheckStatus: "success" as const,
    edition: fixture.source.edition,
    acceptedCount: 1,
    rejectedCount: 0,
    partial: false,
  },
};
const filter = {
  from: "2026-11-15",
  to: "2026-12-01",
  page: 1,
  includeWithdrawn: false,
  includeUndated: false,
};
beforeEach(() => {
  query.value = { isSuccess: true, isFetching: false, error: null, data: page };
});

describe("forecast windows preserve publisher precision", () => {
  it("renders a source month without a day, instant or probability", () => {
    expect(periodLabel(fixture.period)).toBe(
      "November 2026 (approximate calendar month)",
    );
    expect(confidenceLabel).toContain("Not a probability");
    expect(forecastSchema.parse(fixture)).not.toHaveProperty("startsAt");
  });
  it.each(["UTC", "America/New_York", "Pacific/Honolulu"])(
    "does not shift a month in %s",
    (zone) => {
      const before = process.env.TZ;
      process.env.TZ = zone;
      try {
        expect(periodLabel(fixture.period)).toBe(
          "November 2026 (approximate calendar month)",
        );
      } finally {
        if (before === undefined) delete process.env.TZ;
        else process.env.TZ = before;
      }
    },
  );
  it("keeps unknown timing unplaced and does not infer fiscal quarters", () => {
    const unknown = { precision: "unknown" as const, raw: "Q1 FY2027" };
    expect(periodLabel(unknown)).toBe("Timing undetermined: Q1 FY2027");
    expect(elapsedLabel(unknown, "2028-01-01")).toBeNull();
  });
  it.each([0, 13, 1.5])("rejects invalid month %s", (month) => {
    expect(
      forecastSchema.safeParse({
        ...fixture,
        period: { ...fixture.period, month },
      }).success,
    ).toBe(false);
  });
  it("rejects invented numerical confidence and unsafe source URLs", () => {
    expect(
      forecastSchema.safeParse({ ...fixture, confidence: 0.9 }).success,
    ).toBe(false);
    expect(
      forecastSchema.safeParse({
        ...fixture,
        source: { ...fixture.source, url: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
    expect(
      forecastSchema.safeParse({
        ...fixture,
        source: {
          ...fixture.source,
          url: "https://www.reginfo.gov.evil.test/",
        },
      }).success,
    ).toBe(false);
  });
  it("distinguishes observation expiry from publisher issuance", () => {
    expect(
      observationLabel(new Date(now - observationMaxAgeMs).toISOString(), now),
    ).toBe("Checked within 7 days");
    expect(
      observationLabel(
        new Date(now - observationMaxAgeMs - 1).toISOString(),
        now,
      ),
    ).toContain("Stale");
    expect(observationLabel(new Date(now + 1).toISOString(), now)).toContain(
      "unknown",
    );
    expect(observationLabel(null, now)).toContain("unknown");
  });
  it("elapsed months remain unconfirmed", () => {
    expect(elapsedLabel(fixture.period, "2026-12-01")).toBe(
      "Window elapsed; outcome unconfirmed",
    );
    expect(elapsedLabel(fixture.period, "2026-11-30")).toBeNull();
  });
});

describe("read, history and export contracts", () => {
  it("rejects duplicate current identities and foreign or duplicate history revisions", () => {
    expect(
      forecastPageSchema.safeParse({
        ...page,
        items: [fixture, fixture],
        total: 2,
      }).success,
    ).toBe(false);
    expect(
      forecastHistorySchema(fixture.id).safeParse({
        ...page,
        items: [{ ...fixture, id: "different" }],
      }).success,
    ).toBe(false);
    expect(
      forecastHistorySchema(fixture.id).safeParse({
        ...page,
        items: [fixture, fixture],
        total: 2,
      }).success,
    ).toBe(false);
    expect(
      forecastHistorySchema(fixture.id).safeParse({
        ...page,
        items: [{ ...fixture, revision: 2, status: "withdrawn" }, fixture],
        total: 2,
      }).success,
    ).toBe(true);
  });
  it("sends overlap range and explicit status filters without inventing an instant", async () => {
    const request = vi.fn().mockResolvedValue(page);
    await fetchForecasts({ request } as ApiClient, filter);
    expect(request.mock.calls[0]?.[1]).toBe(
      "government-forecasts?from=2026-11-15&to=2026-12-01&page=1&pageSize=50&includeWithdrawn=false&includeUndated=false",
    );
  });
  it("propagates denial and never converts failed reads into an empty catalog", async () => {
    const denied = new Error("denied");
    await expect(
      fetchForecasts(
        { request: vi.fn().mockRejectedValue(denied) } as ApiClient,
        filter,
      ),
    ).rejects.toBe(denied);
  });
  it("checks page echoes for both list and history", async () => {
    const api = {
      request: vi.fn().mockResolvedValue({ ...page, page: 2 }),
    } as ApiClient;
    await expect(fetchForecasts(api, filter)).rejects.toThrow("requested page");
    await expect(fetchForecastHistory(api, fixture.id, 1)).rejects.toThrow(
      "requested page",
    );
  });
  it("exports source window, uncertainty, edition, observation, revision and withdrawal", () => {
    const csv = forecastsCsv(
      [{ ...fixture, status: "withdrawn", revision: 2 }],
      filter,
      now,
    );
    for (const expected of [
      "Loaded page only",
      "Gregorian calendar month",
      "11/00/2026",
      "not supplied",
      "Synthetic 2026 edition",
      "Observed at",
      "withdrawn",
      '"2"',
    ])
      expect(csv).toContain(expected);
    expect(csv).not.toContain("DTSTART");
    expect(csv).not.toContain("2026-11-01T00:00");
  });
  it.each(['=HYPERLINK("x")', " +1", "-1", "@SUM(1)", "\t=1"])(
    "neutralizes spreadsheet formula cells %s",
    (title) => {
      expect(forecastsCsv([{ ...fixture, title }], filter, now)).toContain(
        `"'${title.replaceAll('"', '""')}"`,
      );
    },
  );
  it("preserves publisher completion evidence without promoting it to a confirmed event", () => {
    const item = {
      ...fixture,
      status: "source_completed" as const,
      completionEvidence: { action: "NPRM", rawDate: "10/15/2026" },
    };
    expect(forecastSchema.parse(item).status).toBe("source_completed");
    const csv = forecastsCsv([item], filter, now, {
      ...page.coverage,
      partial: true,
      acceptedCount: 1,
      rejectedCount: 2,
      lastCheckStatus: "failed",
    });
    expect(csv).toContain("10/15/2026");
    expect(csv).toContain("source_completed");
    expect(csv).toContain('"failed"');
    expect(csv).not.toContain("DTSTART");
  });
});

describe("calendar panel state", () => {
  function render() {
    return renderToStaticMarkup(
      createElement(ForecastWindows, { from: filter.from, to: filter.to }),
    );
  }
  it("shows global windows, source edition and uncertainty outside the calendar grid", () => {
    const html = render();
    expect(html).toContain("Global regulatory windows");
    expect(html).toContain("November 2026 (approximate calendar month)");
    expect(html).toContain("Export loaded page as CSV");
    expect(html).toContain("View revision history");
  });
  it.each([
    { isFetching: true, error: null },
    { isFetching: false, error: new Error("Permission revoked") },
  ])(
    "hides cached results and export while checking or after denial",
    (state) => {
      query.value = { isSuccess: true, data: page, ...state };
      const html = render();
      expect(html).not.toContain(fixture.title);
      expect(html).not.toContain("Export loaded page as CSV");
    },
  );
  it("does not turn unavailable coverage into a current zero", () => {
    query.value = {
      isSuccess: true,
      isFetching: false,
      data: {
        ...page,
        items: [],
        total: 0,
        coverage: {
          lastSuccessfulCheckAt: null,
          lastAttemptAt: null,
          lastCheckStatus: "unavailable",
          edition: null,
        },
      },
    };
    expect(render()).toContain("No qualified forecast catalog is available");
  });
  it("discloses partial coverage instead of asserting a qualified empty catalog", () => {
    query.value = {
      isSuccess: true,
      isFetching: false,
      data: {
        ...page,
        items: [],
        total: 0,
        coverage: { ...page.coverage, partial: true, rejectedCount: 2 },
      },
    };
    const html = render();
    expect(html).toContain("Partial source coverage");
    expect(html).toContain("not a complete no-forecasts result");
  });
});

describe("forecast authenticated proxy boundary", () => {
  const config = readConfig({
    CORE_API_BASE_URL: "https://core.example.test/api",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
    CLERK_SECRET_KEY: "sk_test_synthetic",
  });
  it.each([
    ["government-forecasts"],
    ["government-forecasts", "synthetic-id", "history"],
  ])("forwards the authorized read %j", async (...args) => {
    const path = args as string[];
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(page));
    const response = await proxyRequest(
      new Request(
        "https://app.example.test/api/backend/core/government-forecasts",
      ),
      "core",
      path,
      config,
      async () => "synthetic-session",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(
      new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("Authorization"),
    ).toBe("Bearer synthetic-session");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([
    { path: ["government-forecasts"], method: "POST", status: 405 },
    {
      path: ["government-forecasts", "synthetic-id", "history"],
      method: "DELETE",
      status: 405,
    },
    { path: ["government-forecasts", "import"], method: "GET", status: 400 },
  ])(
    "refuses mutation or unallocated path $method $path",
    async ({ path, method, status }) => {
      const token = vi.fn(async () => "synthetic-session");
      const fetcher = vi.fn(async () => Response.json({}));
      const response = await proxyRequest(
        new Request(
          "https://app.example.test/api/backend/core/government-forecasts",
          { method },
        ),
        "core",
        path,
        config,
        token,
        fetcher,
      );
      expect(response.status).toBe(status);
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("refuses unauthenticated reads without forwarding", async () => {
    const fetcher = vi.fn(async () => Response.json({}));
    const response = await proxyRequest(
      new Request(
        "https://app.example.test/api/backend/core/government-forecasts",
      ),
      "core",
      ["government-forecasts"],
      config,
      async () => null,
      fetcher,
    );
    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
