import { describe, expect, it, vi } from "vitest";
import { readConfig } from "../src/shared/portfolio/config/config";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
const env = {
  CORE_API_BASE_URL: "https://core.example.test/api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
};
describe("retired profile metric proxy boundary", () => {
  it.each([
    ["intelligence", "clients", "client-a", "health-score"],
    ["intelligence", "Clients", "client-a", "health-score"],
    ["intelligence", "clients", "client-a", "Health-Score"],
    ["intelligence", "CLIENTS", "MiXeD-Client", "HEALTH-SCORE"],
  ])(
    "refuses %s/%s/%s/%s before credentials or upstream access",
    async (...path) => {
      const token = vi.fn(async () => "synthetic");
      const fetcher = vi.fn();
      const result = await proxyRequest(
        new Request(
          `https://app.example.test/api/backend/core/${path.join("/")}?version=1`,
        ),
        "core",
        path,
        readConfig({ ...env, CAPIRO_RECORDED_ACTIVITY_VERSION: "1" }),
        token,
        fetcher,
      );
      expect(result.status).toBe(404);
      expect(result.headers.get("Cache-Control")).toBe("no-store");
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("preserves unrelated intelligence reads and exact client identity", async () => {
    const fetcher = vi.fn(async () => Response.json({ ok: true }));
    const token = vi.fn(async () => "synthetic");
    const result = await proxyRequest(
      new Request("https://app.example.test/read"),
      "core",
      ["intelligence", "Clients", "MiXeD-Client", "recommendations"],
      readConfig(env),
      token,
      fetcher,
    );
    expect(result.status).toBe(200);
    expect(token).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      new URL(
        "https://core.example.test/api/intelligence/Clients/MiXeD-Client/recommendations",
      ),
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: "Bearer synthetic" }),
      }),
    );
  });
  it("does not broaden permitted roots", async () => {
    const token = vi.fn(async () => "synthetic");
    const fetcher = vi.fn();
    const result = await proxyRequest(
      new Request("https://app.example.test/read"),
      "core",
      ["Intelligence", "clients", "client-a", "health-score"],
      readConfig(env),
      token,
      fetcher,
    );
    expect(result.status).toBe(400);
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
