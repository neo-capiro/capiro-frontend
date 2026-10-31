import { describe, expect, it, vi } from "vitest";
import { proxyOwnerHistory } from "../src/features/meri/memory-review/owner-history-proxy.server";
const ref = {
  kind: "item" as const,
  id: "11111111-1111-4111-8111-111111111111",
};
const origin = "https://frontend.synthetic.invalid";
const path = `/api/memory/owner/items/${ref.id}/versions`;
const env = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YQ==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  CORE_API_BASE_URL: "https://core.synthetic.invalid/api",
  CAPIRO_REQUEST_ORIGIN: origin,
  MERI_MEMORY_OWNER_REVIEW_ENABLED: "true",
};
const page = {
  schemaVersion: 1,
  anchor: { ...ref, revision: "2026-10-31T12:00:00.123456Z" },
  availability: "available",
  entries: [],
  nextCursor: null,
};
describe("owner history proxy", () => {
  it("uses a fixed route and server token without forwarding browser credentials", async () => {
    const fetcher = vi.fn(async () => Response.json(page));
    const result = await proxyOwnerHistory(
      new Request(origin + path, {
        headers: { Authorization: "Bearer browser", Cookie: "private=1" },
      }),
      ref,
      "versions",
      env,
      async () => "server",
      fetcher,
    );
    expect(result.status).toBe(200);
    expect(fetcher).toHaveBeenCalledWith(
      `https://core.synthetic.invalid${path}?limit=25`,
      expect.objectContaining({
        headers: { Authorization: "Bearer server", Accept: "application/json" },
        redirect: "error",
        credentials: "omit",
      }),
    );
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("refuses unknown and duplicate query keys before dispatch", async () => {
    for (const suffix of [
      "?tenant=other",
      "?limit=25&limit=25",
      "?cursor=x&cursor=y",
      "?limit=101",
    ]) {
      const fetcher = vi.fn();
      expect(
        (
          await proxyOwnerHistory(
            new Request(origin + path + suffix),
            ref,
            "versions",
            env,
            async () => "server",
            fetcher,
          )
        ).status,
      ).toBe(400);
      expect(fetcher).not.toHaveBeenCalled();
    }
  });
  it("preserves changed history and unavailable outcomes", async () => {
    for (const status of [404, 409, 503])
      expect(
        (
          await proxyOwnerHistory(
            new Request(origin + path),
            ref,
            "versions",
            env,
            async () => "server",
            async () => new Response(null, { status }),
          )
        ).status,
      ).toBe(status);
    expect(
      (
        await proxyOwnerHistory(
          new Request(origin + path),
          ref,
          "versions",
          env,
          async () => "server",
          async () => Response.json({ items: [] }),
        )
      ).status,
    ).toBe(503);
  });
});
