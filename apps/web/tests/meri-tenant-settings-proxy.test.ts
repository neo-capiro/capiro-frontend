import { describe, expect, it, vi } from "vitest";
import {
  proxyTenantSettingsRequest,
  readTenantSettingsConfig,
} from "../src/shared/meri-tenant-settings/proxy";

const env = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YQ==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  CORE_API_BASE_URL: "https://core.synthetic.invalid",
  MERI_API_BASE_URL: "https://meri.synthetic.invalid",
  MERI_TENANT_SETTINGS_ENABLED: "true",
  CAPIRO_REQUEST_ORIGIN: "http://localhost:5199",
};
const config = readTenantSettingsConfig(env);
const save = {
  expectedRevision: 7,
  settings: {
    defaultTimezone: "UTC",
    capabilityPolicy: { preserved: {} },
    model: {
      monthlyCapMicroUsd: 1000000,
      maxTurns: 5,
      maxBudgetMicroUsd: 250000,
    },
  },
};
const request = (
  operation = "read",
  body: unknown = {},
  init: RequestInit = {},
) =>
  new Request(`http://localhost:5199/api/settings/tenant/${operation}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5199",
      Authorization: "Bearer browser-not-authority",
      Cookie: "private=browser",
    },
    body: JSON.stringify(body),
    ...init,
  });

describe("canonical tenant settings relay", () => {
  it("requires literal enablement and configured service/auth before token acquisition", async () => {
    for (const flag of [undefined, "false", "TRUE", "1"])
      expect(
        readTenantSettingsConfig({ ...env, MERI_TENANT_SETTINGS_ENABLED: flag })
          .enabled,
      ).toBe(false);
    for (const url of [
      "https://meri.synthetic.invalid/private",
      "http://remote.invalid",
      "https://user@meri.synthetic.invalid",
    ])
      expect(
        readTenantSettingsConfig({ ...env, MERI_API_BASE_URL: url }).enabled,
      ).toBe(false);
    const token = vi.fn(),
      fetcher = vi.fn();
    expect(
      (
        await proxyTenantSettingsRequest(
          request(),
          "read",
          { ...config, enabled: false },
          token,
          fetcher,
        )
      ).status,
    ).toBe(503);
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["read", "save"])(
    "forwards %s once with current native token and no browser credentials",
    async (operation) => {
      const token = vi.fn(async () => "native-session"),
        fetcher = vi.fn(async () => Response.json({ revision: 8 }));
      const body = operation === "save" ? save : {};
      const result = await proxyTenantSettingsRequest(
        request(operation, body),
        operation,
        config,
        token,
        fetcher,
      );
      expect(result.status).toBe(200);
      expect(token).toHaveBeenCalledTimes(1);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0]).toMatchObject([
        `https://meri.synthetic.invalid/api/settings/tenant/${operation}`,
        {
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer native-session",
          },
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
        },
      ]);
      expect(result.headers.get("cache-control")).toBe("private, no-store");
    },
  );
  it.each([
    ["read", { tenantId: "browser" }],
    ["read", []],
    ["save", { ...save, actorId: "browser" }],
    ["save", { ...save, expectedRevision: -1 }],
    ["save", { ...save, expectedRevision: 1.5 }],
    ["save", { ...save, settings: null }],
    ["save", { settings: {} }],
  ])(
    "rejects invalid %s envelope before credential acquisition",
    async (operation, body) => {
      const token = vi.fn(),
        fetcher = vi.fn();
      expect(
        (
          await proxyTenantSettingsRequest(
            request(String(operation), body),
            String(operation),
            config,
            token,
            fetcher,
          )
        ).status,
      ).toBe(400);
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("rejects cross-origin, wrong path, query, encoded or oversized bodies and unknown methods/routes", async () => {
    const token = vi.fn(),
      fetcher = vi.fn();
    for (const incoming of [
      request(
        "read",
        {},
        {
          headers: {
            Origin: "https://foreign.invalid",
            "Content-Type": "application/json",
          },
        },
      ),
      request("read?query=x"),
      request("save", save),
      request(
        "read",
        {},
        {
          headers: {
            Origin: "http://localhost:5199",
            "Content-Type": "application/json",
            "Content-Encoding": "gzip",
          },
        },
      ),
      request("read", {}, { body: "x".repeat(65537) }),
      request("read", {}, { body: "{" }),
    ])
      expect(
        (
          await proxyTenantSettingsRequest(
            incoming,
            "read",
            config,
            token,
            fetcher,
          )
        ).status,
      ).toBe(400);
    expect(
      (
        await proxyTenantSettingsRequest(
          new Request("http://localhost:5199/api/settings/tenant/read"),
          "read",
          config,
          token,
          fetcher,
        )
      ).status,
    ).toBe(405);
    expect(
      (
        await proxyTenantSettingsRequest(
          request("audit"),
          "audit",
          config,
          token,
          fetcher,
        )
      ).status,
    ).toBe(404);
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires authentication and preserves canonical admin refusal/CAS conflict without retry", async () => {
    const fetcher = vi.fn();
    expect(
      (
        await proxyTenantSettingsRequest(
          request(),
          "read",
          config,
          async () => null,
          fetcher,
        )
      ).status,
    ).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    for (const status of [403, 409]) {
      const upstream = vi.fn(async () =>
        Response.json(
          {
            error: {
              code:
                status === 403
                  ? "SETTINGS_ADMIN_REQUIRED"
                  : "SETTINGS_REVISION_CONFLICT",
            },
          },
          { status },
        ),
      );
      expect(
        (
          await proxyTenantSettingsRequest(
            request("save", save),
            "save",
            config,
            async () => "native",
            upstream,
          )
        ).status,
      ).toBe(status);
      expect(upstream).toHaveBeenCalledTimes(1);
    }
  });
  it("does not retry an uncertain save or adopt redirected/non-JSON responses", async () => {
    for (const fetcher of [
      vi.fn(async () => {
        throw Error("lost acknowledgement");
      }),
      vi.fn(async () => new Response("redirect", { status: 302 })),
      vi.fn(async () => new Response("not json")),
    ]) {
      expect(
        (
          await proxyTenantSettingsRequest(
            request("save", save),
            "save",
            config,
            async () => "native",
            fetcher,
          )
        ).status,
      ).toBe(502);
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
});
