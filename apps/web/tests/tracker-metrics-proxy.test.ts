import { describe, expect, it, vi } from "vitest";
import { readConfig } from "../src/shared/portfolio/config/config";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
const env = {
  CORE_API_BASE_URL: "https://core.example.test/api",
  INTELLIGENCE_API_BASE_URL: "https://intel.example.test/intel-api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  TRACKER_BACKEND: "intelligence",
};
const cases = [
  {
    service: "core",
    path: [
      "intelligence",
      "clients",
      "client-a",
      "tracker",
      "material-changes",
    ],
    query: "",
  },
  {
    service: "intelligence",
    path: ["clients", "client-a", "tracker", "material-changes"],
    query: "",
  },
  {
    service: "core",
    path: ["legiwatch", "live-hearings", "clients", "client-a", "coverage"],
    query: "?trackerBackend=intelligence",
  },
];
describe("tracker metrics producer-first gate", () => {
  it.each([undefined, "", "0", "2", "true", " 1"])(
    "blocks all named reads before credentials when version is %s",
    async (version) => {
      for (const item of cases) {
        const token = vi.fn(async () => "synthetic"),
          fetcher = vi.fn();
        const response = await proxyRequest(
          new Request(`https://app.example.test/read${item.query}`, {
            headers: { CAPIRO_TRACKER_METRICS_VERSION: "1" },
          }),
          item.service,
          item.path,
          readConfig({ ...env, CAPIRO_TRACKER_METRICS_VERSION: version }),
          token,
          fetcher,
        );
        expect(response.status).toBe(503);
        expect(token).not.toHaveBeenCalled();
        expect(fetcher).not.toHaveBeenCalled();
      }
    },
  );
  it.each(["core", "intelligence"])(
    "admits only actual %s material owner and explicit Core coverage query",
    async (backend) => {
      const config = readConfig({
        ...env,
        TRACKER_BACKEND: backend,
        CAPIRO_TRACKER_METRICS_VERSION: "1",
      });
      for (const item of cases) {
        const fetcher = vi.fn<typeof fetch>(async () =>
          Response.json({ ok: true }),
        );
        const query = item.query ? `?trackerBackend=${backend}` : "";
        const response = await proxyRequest(
          new Request(`https://app.example.test/read${query}`),
          item.service,
          item.path,
          config,
          async () => "synthetic",
          fetcher,
        );
        const accepted = Boolean(query) || item.service === backend;
        expect(response.status).toBe(accepted ? 200 : 400);
        expect(fetcher).toHaveBeenCalledTimes(accepted ? 1 : 0);
        if (accepted)
          expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
            method: "GET",
            cache: "no-store",
          });
      }
    },
  );
  it.each([
    "",
    "?trackerBackend=core",
    "?trackerBackend=intelligence&extra=1",
    "?trackerBackend=intelligence&trackerBackend=intelligence",
  ])("rejects missing/mismatched/open coverage query %s", async (query) => {
    const fetcher = vi.fn();
    const item = cases[2]!;
    const result = await proxyRequest(
      new Request(`https://app.example.test/read${query}`),
      "core",
      item.path,
      readConfig({ ...env, CAPIRO_TRACKER_METRICS_VERSION: "1" }),
      async () => "synthetic",
      fetcher,
    );
    expect(result.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps existing manual tracking writes available with the metrics gate off", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ clientId: "client-a", billId: "synthetic-bill" }),
    );
    const result = await proxyRequest(
      new Request("https://app.example.test/read", {
        method: "POST",
        headers: { origin: "https://app.example.test" },
        body: JSON.stringify({
          billId: "synthetic-bill",
          source: "manual_search",
          isManual: true,
        }),
      }),
      "intelligence",
      ["clients", "client-a", "tracker", "track"],
      readConfig(env),
      async () => "synthetic",
      fetcher,
    );
    expect(result.status).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

const equivalentRoutes = [
  [
    "core",
    ["intelligence", "Clients", "MiXeD-Client", "tracker", "material-changes"],
    "",
  ],
  [
    "core",
    ["intelligence", "clients", "MiXeD-Client", "Tracker", "material-changes"],
    "",
  ],
  [
    "core",
    ["intelligence", "clients", "MiXeD-Client", "tracker", "Material-Changes"],
    "",
  ],
  [
    "core",
    ["intelligence", "CLIENTS", "MiXeD-Client", "TRACKER", "MATERIAL-CHANGES"],
    "",
  ],
  [
    "intelligence",
    ["clients", "MiXeD-Client", "Tracker", "material-changes"],
    "",
  ],
  [
    "intelligence",
    ["clients", "MiXeD-Client", "tracker", "Material-Changes"],
    "",
  ],
  [
    "intelligence",
    ["clients", "MiXeD-Client", "TRACKER", "MATERIAL-CHANGES"],
    "",
  ],
  [
    "core",
    ["legiwatch", "Live-Hearings", "clients", "MiXeD-Client", "coverage"],
    "?trackerBackend=intelligence",
  ],
  [
    "core",
    ["legiwatch", "live-hearings", "Clients", "MiXeD-Client", "coverage"],
    "?trackerBackend=intelligence",
  ],
  [
    "core",
    ["legiwatch", "live-hearings", "clients", "MiXeD-Client", "Coverage"],
    "?trackerBackend=intelligence",
  ],
  [
    "core",
    ["legiwatch", "LIVE-HEARINGS", "CLIENTS", "MiXeD-Client", "COVERAGE"],
    "?trackerBackend=intelligence",
  ],
] as const;
describe("backend-equivalent Tracker metric routes", () => {
  it.each(equivalentRoutes)(
    "gate-off refuses %s %j before credentials",
    async (service, path, query) => {
      const token = vi.fn(async () => "synthetic"),
        fetcher = vi.fn(async () => Response.json({ legacy: true }));
      const result = await proxyRequest(
        new Request(`https://app.example.test/read${query}`),
        service,
        [...path],
        readConfig(env),
        token,
        fetcher,
      );
      expect({
        status: result.status,
        tokenCalls: token.mock.calls.length,
        upstreamCalls: fetcher.mock.calls.length,
      }).toEqual({ status: 503, tokenCalls: 0, upstreamCalls: 0 });
    },
  );
  it.each(equivalentRoutes)(
    "gate-on preserves client/path and selected owner for %s %j",
    async (service, path, query) => {
      const token = vi.fn(async () => "synthetic"),
        fetcher = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
      const backend = query ? "intelligence" : service;
      const result = await proxyRequest(
        new Request(`https://app.example.test/read${query}`),
        service,
        [...path],
        readConfig({
          ...env,
          TRACKER_BACKEND: backend,
          CAPIRO_TRACKER_METRICS_VERSION: "1",
        }),
        token,
        fetcher,
      );
      expect(result.status).toBe(200);
      expect(token).toHaveBeenCalledOnce();
      const base =
        service === "core"
          ? env.CORE_API_BASE_URL
          : env.INTELLIGENCE_API_BASE_URL;
      expect(fetcher.mock.calls[0]?.[0]).toEqual(
        new URL(`${base}/${path.join("/")}${query}`),
      );
    },
  );
  it("cannot bypass the selected owner or coverage query using static capitalization", async () => {
    const config = readConfig({ ...env, CAPIRO_TRACKER_METRICS_VERSION: "1" });
    const token = vi.fn(async () => "synthetic"),
      fetcher = vi.fn();
    const material = equivalentRoutes[3],
      coverage = equivalentRoutes[10];
    expect(
      (
        await proxyRequest(
          new Request("https://app.example.test/read"),
          material[0],
          [...material[1]],
          config,
          token,
          fetcher,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await proxyRequest(
          new Request("https://app.example.test/read?trackerBackend=core"),
          coverage[0],
          [...coverage[1]],
          config,
          token,
          fetcher,
        )
      ).status,
    ).toBe(400);
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps root admission and neighboring board routes unchanged", async () => {
    const token = vi.fn(async () => "synthetic"),
      fetcher = vi.fn(async () => Response.json({ ok: true }));
    const request = new Request("https://app.example.test/read"),
      config = readConfig(env);
    expect(
      (
        await proxyRequest(
          request,
          "intelligence",
          ["Clients", "MiXeD-Client", "tracker", "material-changes"],
          config,
          token,
          fetcher,
        )
      ).status,
    ).toBe(400);
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      (
        await proxyRequest(
          request,
          "intelligence",
          ["clients", "MiXeD-Client", "Tracker", "board"],
          config,
          token,
          fetcher,
        )
      ).status,
    ).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
