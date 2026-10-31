import { describe, expect, it, vi } from "vitest";
import { clientLogoResponse } from "../src/shared/portfolio/api/client-logo";
import type { RuntimeConfig } from "../src/shared/portfolio/config/config";

const CLIENT = "33333333-3333-4333-8333-333333333333";
const config = {
  services: { core: "https://core.example.test" },
  destinations: {},
  authConfigured: true,
  issues: [],
} as RuntimeConfig;
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const request = () =>
  new Request(`https://app.example.test/api/client-logo/${CLIENT}`);

describe("client logo route — M1 stable, session-authenticated bytes", () => {
  it("fetches Core with the session token and returns the image bytes as private cacheable", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(png, {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
    );

    const response = await clientLogoResponse(
      request(),
      CLIENT,
      config,
      async () => "session-token",
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]! as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`https://core.example.test/clients/${CLIENT}/logo`);
    expect(init.headers).toEqual({
      Authorization: "Bearer session-token",
      Accept: "image/*",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=300");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(png);
  });

  it("returns 401 with no body and never calls Core without a session", async () => {
    const fetcher = vi.fn();

    const response = await clientLogoResponse(
      request(),
      CLIENT,
      config,
      async () => null,
      fetcher as unknown as typeof fetch,
    );

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("");
    // No unauthenticated fallback fetch.
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns 401 when the session token cannot be read", async () => {
    const fetcher = vi.fn();

    const response = await clientLogoResponse(
      request(),
      CLIENT,
      config,
      async () => {
        throw new Error("no session");
      },
      fetcher as unknown as typeof fetch,
    );

    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("passes an upstream 404 through and never caches it", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 404 }));

    const response = await clientLogoResponse(
      request(),
      CLIENT,
      config,
      async () => "session-token",
      fetcher,
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects a non-image upstream response instead of relaying it", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response("<script>alert(1)</script>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    );

    const response = await clientLogoResponse(
      request(),
      CLIENT,
      config,
      async () => "session-token",
      fetcher,
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects a malformed client id without calling Core", async () => {
    const fetcher = vi.fn();

    const response = await clientLogoResponse(
      request(),
      "not-a-uuid",
      config,
      async () => "session-token",
      fetcher as unknown as typeof fetch,
    );

    expect(response.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refuses to serve when the runtime configuration is incomplete", async () => {
    const fetcher = vi.fn();

    const response = await clientLogoResponse(
      request(),
      CLIENT,
      {
        ...config,
        services: {},
        issues: ["CORE_API_BASE_URL is invalid."],
      } as RuntimeConfig,
      async () => "session-token",
      fetcher as unknown as typeof fetch,
    );

    expect(response.status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
