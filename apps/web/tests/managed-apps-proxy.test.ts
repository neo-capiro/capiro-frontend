import { describe, expect, it, vi } from "vitest";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
import { readConfig } from "../src/shared/portfolio/config/config";

const config = readConfig({
  CORE_API_BASE_URL: "https://core.example.test/api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
});
const path = ["clio", "v3", "apps"];
const url = "http://localhost:5190/api/backend/core/clio/v3/apps";

describe("managed app metadata proxy", () => {
  it("forwards the exact authenticated metadata GET without browser authority headers", async () => {
    const token = vi.fn(async () => "synthetic-token");
    const payload = { apps: [] };
    const fetcher = vi.fn(async () => Response.json(payload));
    const response = await proxyRequest(
      new Request(url, {
        headers: { "x-tenant-id": "untrusted", Cookie: "untrusted" },
      }),
      "core",
      path,
      config,
      token,
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
    expect(token).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      new URL("https://core.example.test/api/clio/v3/apps"),
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer synthetic-token",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        redirect: "error",
      }),
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each([
    ["core", ["clio", "v3", "apps"], "POST"],
    ["core", ["clio", "v3", "apps"], "DELETE"],
    ["core", ["clio", "v3", "apps"], "HEAD"],
    ["core", ["clio", "v3", "apps", "synthetic", "connect"], "POST"],
    ["core", ["clio", "v3", "apps", "synthetic", "disconnect"], "POST"],
    ["core", ["clio", "v3", "apps", "synthetic", "cancel"], "POST"],
    ["core", ["clio", "v3", "mcp-tool-schemas"], "GET"],
    ["core", ["clio", "v3", "apps", "synthetic"], "GET"],
    ["core", ["clio", "v3", "apps/other"], "GET"],
    ["workspace", ["clio", "v3", "apps"], "GET"],
  ] as const)(
    "blocks %s %j %s before credentials",
    async (service, segments, method) => {
      const token = vi.fn(async () => "synthetic-token");
      const fetcher = vi.fn(async () => Response.json({ apps: [] }));
      const response = await proxyRequest(
        new Request(url, { method }),
        service,
        [...segments],
        config,
        token,
        fetcher,
      );
      expect(response.status).toBe(400);
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("does not fetch when signed out", async () => {
    const fetcher = vi.fn(async () => Response.json({ apps: [] }));
    const response = await proxyRequest(
      new Request(url),
      "core",
      path,
      config,
      async () => null,
      fetcher,
    );
    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("preserves Core permission refusal without upstream headers", async () => {
    const response = await proxyRequest(
      new Request(url),
      "core",
      path,
      config,
      async () => "synthetic-token",
      async () =>
        Response.json(
          { message: "Permission required." },
          {
            status: 403,
            headers: { "Set-Cookie": "untrusted" },
          },
        ),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Permission required." });
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });
});
