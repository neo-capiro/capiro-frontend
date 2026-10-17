import { describe, expect, it, vi } from "vitest";
import { USER_PREFERENCE_DEFAULTS } from "@capiro/meri-client/user-preferences";
import { readUserPreferencesConfig } from "../src/shared/meri-user-preferences/config";
import { proxyUserPreferencesRequest } from "../src/shared/meri-user-preferences/proxy";

const env = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YQ==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  CORE_API_BASE_URL: "https://core.synthetic.invalid",
  MERI_API_BASE_URL: "https://meri.synthetic.invalid",
  MERI_USER_PREFERENCES_ENABLED: "true",
};
const config = readUserPreferencesConfig(env);
const request = (
  operation = "read",
  body: unknown = {},
  overrides: RequestInit = {},
) =>
  new Request(
    `https://frontend.synthetic.invalid/api/settings/user/${operation}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://frontend.synthetic.invalid",
        authorization: "Bearer browser-must-not-forward",
      },
      body: JSON.stringify(body),
      ...overrides,
    },
  );

describe("fixed native-token personal settings forwarding", () => {
  it("requires literal opt-in and validated existing service/auth configuration", async () => {
    for (const value of [undefined, "false", "TRUE", "1"])
      expect(
        readUserPreferencesConfig({
          ...env,
          MERI_USER_PREFERENCES_ENABLED: value,
        }).enabled,
      ).toBe(false);
    for (const value of [
      "https://meri.synthetic.invalid/private",
      "https://secret@meri.synthetic.invalid",
      "http://untrusted.invalid",
    ])
      expect(
        readUserPreferencesConfig({ ...env, MERI_API_BASE_URL: value }).enabled,
      ).toBe(false);
    const token = vi.fn();
    const fetcher = vi.fn();
    expect(
      (
        await proxyUserPreferencesRequest(
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
  it("forwards only a freshly obtained native token, no cookies or browser authorization", async () => {
    const token = vi
      .fn()
      .mockResolvedValueOnce("native-one")
      .mockResolvedValueOnce("native-two");
    const fetcher = vi.fn(async () =>
      Response.json({
        server: "bounded opaque response; browser receiver validates",
      }),
    );
    const first = await proxyUserPreferencesRequest(
      request(),
      "read",
      config,
      token,
      fetcher,
    );
    await proxyUserPreferencesRequest(
      request(),
      "read",
      config,
      token,
      fetcher,
    );
    expect(token).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]).toMatchObject([
      "https://meri.synthetic.invalid/api/settings/user/read",
      {
        method: "POST",
        body: "{}",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer native-one",
        },
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
      },
    ]);
    expect(fetcher.mock.calls[1]).toMatchObject([
      expect.any(String),
      { headers: { Authorization: "Bearer native-two" } },
    ]);
    expect(first.headers.get("cache-control")).toContain("no-store");
    expect(first.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it.each([
    new Request("https://frontend.synthetic.invalid/api/settings/user/read", {
      method: "POST",
      body: "{}",
      headers: {
        origin: "https://foreign.invalid",
        "content-type": "application/json",
      },
    }),
    new Request(
      "https://frontend.synthetic.invalid/api/settings/user/read?hint=x",
      {
        method: "POST",
        body: "{}",
        headers: {
          origin: "https://frontend.synthetic.invalid",
          "content-type": "application/json",
        },
      },
    ),
    request(
      "read",
      {},
      {
        headers: {
          origin: "https://frontend.synthetic.invalid",
          "content-type": "application/json",
          "content-encoding": "gzip",
        },
      },
    ),
    request("read", { tenantId: "browser-authority" }),
    request("read", {}, { body: "{" }),
    request("read", {}, { body: "x".repeat(8193) }),
  ])(
    "rejects untrusted path/origin/body before native credential acquisition",
    async (incoming) => {
      const token = vi.fn();
      const fetcher = vi.fn();
      expect(
        (
          await proxyUserPreferencesRequest(
            incoming,
            "read",
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
  it("validates full save requests and never accepts an unknown route or absent token", async () => {
    const token = vi.fn(async () => null);
    const fetcher = vi.fn();
    expect(
      (
        await proxyUserPreferencesRequest(
          request("save", {
            expectedRevision: 0,
            preferences: { theme: "dark" },
          }),
          "save",
          config,
          token,
          fetcher,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await proxyUserPreferencesRequest(
          request("tenant"),
          "tenant",
          config,
          token,
          fetcher,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await proxyUserPreferencesRequest(
          request("save", {
            expectedRevision: 0,
            preferences: USER_PREFERENCE_DEFAULTS,
          }),
          "save",
          config,
          token,
          fetcher,
        )
      ).status,
    ).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("bounds downstream bytes and preserves admitted remote status without inventing outcomes", async () => {
    const token = async () => "native";
    const oversize = new Response("x".repeat(16385), {
      headers: { "content-type": "application/json" },
    });
    const result = await proxyUserPreferencesRequest(
      request(),
      "read",
      config,
      token,
      async () => oversize,
    );
    expect(result.status).toBe(502);
    expect(oversize.bodyUsed).toBe(true);
    const error = {
      error: { code: "SETTINGS_COMMIT_UNKNOWN", outcome: "UNKNOWN" },
    };
    const withheld = await proxyUserPreferencesRequest(
      request("save", {
        expectedRevision: 0,
        preferences: USER_PREFERENCE_DEFAULTS,
      }),
      "save",
      config,
      token,
      async () => Response.json(error, { status: 503 }),
    );
    expect(withheld.status).toBe(503);
    expect(await withheld.json()).toEqual(error);
  });
});
