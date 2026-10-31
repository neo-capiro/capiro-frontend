import { describe, expect, it, vi } from "vitest";
import { firmLogoResponse } from "../src/shared/portfolio/api/firm-logo";
import type { RuntimeConfig } from "../src/shared/portfolio/config/config";

/**
 * M1 (firm half): the firm logo reaches the app as bytes through this route, authenticated by
 * the signed-in session, instead of a presigned S3 URL embedded in the branding payload.
 */
const config = {
  services: { core: "https://core.example.test" },
  destinations: {},
  authConfigured: true,
  issues: [],
} as RuntimeConfig;
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const request = (method = "GET") =>
  new Request("https://app.example.test/api/firm-logo", { method });

const image = (contentType = "image/png") =>
  vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    new Response(png, { status: 200, headers: { "Content-Type": contentType } }),
  );

describe("firm logo route — M1 stable, session-authenticated bytes", () => {
  it("fetches Core with the session token and returns the image bytes as private cacheable", async () => {
    const fetcher = image();

    const response = await firmLogoResponse(
      request(),
      config,
      async () => "session-token",
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe("https://core.example.test/tenant-admin/branding/logo");
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

  it("answers HEAD with the same bytes contract and no unauthenticated fallback", async () => {
    const fetcher = image();

    const response = await firmLogoResponse(
      request("HEAD"),
      config,
      async () => "session-token",
      fetcher,
    );

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect((fetcher.mock.calls[0]![1] as RequestInit).method).toBe("HEAD");
  });

  it("returns 401 with no body and never calls Core without a session", async () => {
    const fetcher = vi.fn();

    const response = await firmLogoResponse(
      request(),
      config,
      async () => null,
      fetcher as unknown as typeof fetch,
    );

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns 401 when the session token cannot be read", async () => {
    const fetcher = vi.fn();

    const response = await firmLogoResponse(
      request(),
      config,
      async () => {
        throw new Error("no session");
      },
      fetcher as unknown as typeof fetch,
    );

    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects methods other than GET/HEAD without touching Core", async () => {
    const fetcher = vi.fn();

    const response = await firmLogoResponse(
      request("POST"),
      config,
      async () => "session-token",
      fetcher as unknown as typeof fetch,
    );

    expect(response.status).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns 503 when the runtime config is incomplete", async () => {
    const fetcher = vi.fn();

    const response = await firmLogoResponse(
      request(),
      { ...config, issues: ["core unset"] } as RuntimeConfig,
      async () => "session-token",
      fetcher as unknown as typeof fetch,
    );

    expect(response.status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("passes a 404 through and turns any other upstream failure into an uncached 502", async () => {
    const missing = vi.fn(async () => new Response(null, { status: 404 }));
    expect(
      (
        await firmLogoResponse(request(), config, async () => "t", missing)
      ).status,
    ).toBe(404);

    const failed = vi.fn(async () => new Response("boom", { status: 500 }));
    const failure = await firmLogoResponse(request(), config, async () => "t", failed);
    expect(failure.status).toBe(502);
    expect(await failure.text()).toBe("");
    expect(failure.headers.get("Cache-Control")).toBe("no-store");

    const rejected = vi.fn(async () => {
      throw new Error("network");
    });
    expect(
      (
        await firmLogoResponse(
          request(),
          config,
          async () => "t",
          rejected as unknown as typeof fetch,
        )
      ).status,
    ).toBe(502);
  });

  it("refuses a non-image upstream response instead of proxying it", async () => {
    const fetcher = image("text/html");

    const response = await firmLogoResponse(
      request(),
      config,
      async () => "session-token",
      fetcher,
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("Content-Type")).toBeNull();
  });
});
