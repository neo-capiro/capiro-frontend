import { describe, expect, it, vi } from "vitest";
import { readConfig } from "../src/shared/portfolio/config/config";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
const env = {
  CORE_API_BASE_URL: "https://core.example.test/api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
};
const path = ["intelligence", "clients", "client-a", "health-score"];
describe("recorded activity producer-first server gate", () => {
  it.each([undefined, "", "0", "2", "true", " 1"])(
    "refuses unqualified version %s before any credentials or fetch",
    async (version) => {
      const config = readConfig({
        ...env,
        CAPIRO_RECORDED_ACTIVITY_VERSION: version,
      });
      expect(config.issues).toEqual([]);
      const token = vi.fn(async () => "synthetic");
      const fetcher = vi.fn();
      const result = await proxyRequest(
        new Request(
          "https://app.example.test/api/backend/core/intelligence/clients/client-a/health-score?version=1",
          { headers: { CAPIRO_RECORDED_ACTIVITY_VERSION: "1" } },
        ),
        "core",
        path,
        config,
        token,
        fetcher,
      );
      expect(result.status).toBe(503);
      expect(result.headers.get("Cache-Control")).toBe("no-store");
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("forwards only after explicit server activation with normal authentication", async () => {
    const token = vi.fn(async () => "synthetic");
    const fetcher = vi.fn(async () => Response.json({ ok: true }));
    const result = await proxyRequest(
      new Request("https://app.example.test/read"),
      "core",
      path,
      readConfig({ ...env, CAPIRO_RECORDED_ACTIVITY_VERSION: "1" }),
      token,
      fetcher,
    );
    expect(result.status).toBe(200);
    expect(token).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      new URL(
        "https://core.example.test/api/intelligence/clients/client-a/health-score",
      ),
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: "Bearer synthetic" }),
      }),
    );
  });
  it("leaves unrelated intelligence reads unchanged while the gate is off", async () => {
    const fetcher = vi.fn(async () => Response.json({ ok: true }));
    const result = await proxyRequest(
      new Request("https://app.example.test/read"),
      "core",
      ["intelligence", "clients", "client-a", "recommendations"],
      readConfig(env),
      async () => "synthetic",
      fetcher,
    );
    expect(result.status).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
