import { describe, expect, it, vi } from "vitest";
import { proxyOfficeRequest } from "../src/shared/meri-office/proxy";
import { readOfficeConfig } from "../src/shared/meri-office/config";
import {
  officeCredential,
  officeIds,
  officeWireSnapshot,
} from "./office-wire-fixture";
const origin = "https://frontend.example.test",
  config = {
    enabled: true,
    baseUrl: "https://meri.example.test",
    requestOrigin: origin,
  };
const input = {
  schema: "meri.office-application/1",
  versionId: officeIds.versionId,
  draftId: officeIds.draftId,
};
function request(route = "read", init: RequestInit = {}, suffix = "") {
  return new Request(`${origin}/api/meri/office/${route}${suffix}`, {
    method: "POST",
    body: JSON.stringify(input),
    ...init,
    headers: {
      origin,
      "content-type": "application/json",
      "x-meri-action-session": officeCredential,
      ...init.headers,
    },
  });
}
describe("Office same-origin forwarding", () => {
  it("is opt-in and does not enable Office through the conversation flag alone", () => {
    expect(readOfficeConfig({}).enabled).toBe(false);
    const env = {
      CORE_API_BASE_URL: "https://core.example.test/api",
      MERI_API_BASE_URL: "https://meri.example.test",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
      CLERK_SECRET_KEY: "sk_test_synthetic",
      MERI_CONVERSATION_WORKFLOW_ENABLED: "true",
    };
    expect(readOfficeConfig(env).enabled).toBe(false);
    expect(
      readOfficeConfig({ ...env, MERI_OFFICE_WORKFLOW_ENABLED: "true" })
        .enabled,
    ).toBe(true);
  });
  it("reads native identity per request and forwards only the existing opaque receipt to the fixed service", async () => {
    const identity = vi.fn(async () => "native-secret"),
      upstream = vi.fn(async () => Response.json(officeWireSnapshot()));
    const response = await proxyOfficeRequest(
      request(),
      "read",
      config,
      identity,
      upstream,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(officeWireSnapshot());
    expect(identity).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(upstream as typeof fetch).mock.calls[0]!;
    expect(url).toBe("https://meri.example.test/api/meri/office/read");
    expect(init).toMatchObject({
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
    });
    expect(new Headers(init?.headers).get("authorization")).toBe(
      `Bearer ${officeCredential}`,
    );
    expect(JSON.stringify(init)).not.toContain("native-secret");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("rejects cross-origin, ambient bearer, path/query changes and unknown routes before forwarding", async () => {
    const upstream = vi.fn(),
      identity = vi.fn(async () => "native");
    for (const [route, req] of [
      [
        "read",
        request("read", { headers: { origin: "https://other.example.test" } }),
      ],
      ["read", request("read", { headers: { authorization: "Bearer x" } })],
      ["read", request("read", {}, "?extra=1")],
      ["read", request("open")],
      ["save", request("save")],
    ] as const) {
      expect(
        (await proxyOfficeRequest(req, route, config, identity, upstream))
          .status,
      ).toBeGreaterThanOrEqual(400);
    }
    expect(identity).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
  });
  it("missing current native sign-in never forwards an old receipt", async () => {
    const upstream = vi.fn();
    const response = await proxyOfficeRequest(
      request(),
      "read",
      config,
      async () => null,
      upstream,
    );
    expect(response.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("closed request validation and body bounds stop malformed authority or private content", async () => {
    const upstream = vi.fn();
    for (const body of [
      JSON.stringify({ ...input, tenantId: officeIds.editorId }),
      "x".repeat(8193),
    ]) {
      expect(
        (
          await proxyOfficeRequest(
            request("read", { body }),
            "read",
            config,
            async () => "native",
            upstream,
          )
        ).status,
      ).toBeGreaterThanOrEqual(400);
    }
    expect(upstream).not.toHaveBeenCalled();
  });
  it("malformed or lost write results stay unknown, with no replay or internal error details", async () => {
    for (const upstream of [
      vi.fn(async () => Response.json({ token: "private-token" })),
      vi.fn(async () => {
        throw Error("private-token");
      }),
    ]) {
      const response = await proxyOfficeRequest(
        request("publish", {
          body: JSON.stringify({
            ...input,
            sequence: 1,
            sha256: "b".repeat(64),
          }),
        }),
        "publish",
        config,
        async () => "native",
        upstream,
      );
      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body.error.outcome).toBe("UNKNOWN");
      expect(JSON.stringify(body)).not.toContain("private-token");
      expect(upstream).toHaveBeenCalledTimes(1);
    }
  });
  it("a redirect or mismatched read response cannot cross the public receiving boundary", async () => {
    const response = await proxyOfficeRequest(
      request(),
      "read",
      config,
      async () => "native",
      vi.fn(async () =>
        Response.json({
          ...officeWireSnapshot(),
          draft: {
            ...officeWireSnapshot().draft,
            baseVersionId: officeIds.editorId,
          },
        }),
      ),
    );
    expect(response.status).toBe(502);
    expect((await response.json()).error.outcome).toBe("READ_UNAVAILABLE");
  });
});
