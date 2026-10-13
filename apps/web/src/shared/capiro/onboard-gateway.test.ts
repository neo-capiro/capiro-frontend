import { expect, it, vi } from "vitest";
import { handleCapiroRequest, handlePublicOnboardRequest } from "./gateway";
import { createCapiroApi } from "./http";
import { capiroOperations } from "./registry";
import { publicOnboardOperations } from "./operations/onboard-public";

const capability = "a".repeat(64);
const origin = "https://app.example.test";
const config = {
  services: {
    onboard: "https://onboard.example.test/onboard-api",
    core: "https://core.example.test/api",
  },
  authConfigured: true,
  issues: [],
};
const invite = {
  orgName: "Synthetic firm",
  email: "admin@example.test",
  status: "pending",
  provider: null,
  providers: { google: true, microsoft: true },
  googleClientId: null,
};
function read(key: string, input: unknown = {}) {
  return new Request(
    `${origin}/api/capiro/${key}?input=${encodeURIComponent(JSON.stringify(input))}`,
    {
      headers: {
        Authorization: "Bearer forged",
        Cookie: "session=forged",
        "x-tenant-id": "forged",
      },
    },
  );
}
function write(key: string, input: unknown, requestOrigin = origin) {
  return new Request(`${origin}/api/capiro/${key}`, {
    method: "POST",
    headers: { Origin: requestOrigin, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

it.each([
  ["onboard.funnel.legal", {}, "clerk-session", []],
  ["onboard.core.registrants", { query: { q: "sample" } }, undefined, []],
] as const)(
  "%s obtains its trusted token policy from the fixed descriptor",
  async (key, input, expected, receipt) => {
    const auth = vi.fn(async () => "trusted-token");
    const fetcher = vi.fn(async () => Response.json(receipt));
    const response = await handleCapiroRequest(
      read(key, input),
      key,
      capiroOperations,
      config,
      auth,
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(auth).toHaveBeenCalledExactlyOnceWith(expected);
    const [, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    const headers = new Headers(options.headers);
    expect(headers.get("authorization")).toBe("Bearer trusted-token");
    expect(headers.has("cookie")).toBe(false);
    expect(headers.has("x-tenant-id")).toBe(false);
    expect(options.credentials).toBe("omit");
  },
);

it("public IT reads work without Clerk configuration and forward only the native capability", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({ ...invite, tenantId: "private" }),
  );
  const response = await handlePublicOnboardRequest(
    read("public-onboard.invite", { params: { token: capability } }),
    "public-onboard.invite",
    { ...config, authConfigured: false },
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(invite);
  const [url, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
  expect(url.href).toBe(
    `https://onboard.example.test/onboard-api/it/invite/${capability}`,
  );
  const headers = new Headers(options.headers);
  for (const name of ["cookie", "authorization", "x-tenant-id"])
    expect(headers.has(name)).toBe(false);
  expect(options.credentials).toBe("omit");
  expect(options.redirect).toBe("error");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
});

it.each(["A".repeat(64), "a".repeat(63), "../session"])(
  "invalid IT capability %s never reaches the upstream",
  async (token) => {
    const fetcher = vi.fn();
    const response = await handlePublicOnboardRequest(
      read("public-onboard.invite", { params: { token } }),
      "public-onboard.invite",
      config,
      fetcher,
    );
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each([
  "onboard.setup.state",
  "public-form.read",
  "public-onboard.arbitrary",
  "__proto__",
])("the public Onboard allowlist refuses %s", async (key) => {
  const fetcher = vi.fn();
  const response = await handlePublicOnboardRequest(
    read(key),
    key,
    config,
    fetcher,
  );
  expect(response.status).toBe(404);
  expect(fetcher).not.toHaveBeenCalled();
});

it("public IT mutations require the local origin and cannot carry extra authority", async () => {
  const fetcher = vi.fn(async () => Response.json({ ok: true }));
  const key = "public-onboard.skipGoogle";
  const input = { params: { token: capability } };
  expect(
    (
      await handlePublicOnboardRequest(
        write(key, input, "https://other.example.test"),
        key,
        config,
        fetcher,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await handlePublicOnboardRequest(
        write(key, { ...input, tenantId: "forged" }),
        key,
        config,
        fetcher,
      )
    ).status,
  ).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    (await handlePublicOnboardRequest(write(key, input), key, config, fetcher))
      .status,
  ).toBe(200);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("a revoked IT capability cannot expire the app session or tell the user to sign in", async () => {
  const expired = vi.fn();
  const fetcher = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      expect(init?.credentials).toBe("omit");
      return handlePublicOnboardRequest(
        new Request(`${origin}${String(url)}`, init),
        "public-onboard.invite",
        config,
        async () =>
          Response.json(
            { message: "Private revoked-link detail" },
            { status: 401 },
          ),
      );
    },
  );
  const api = createCapiroApi(publicOnboardOperations, {
    fetcher,
    credentials: "omit",
    onSessionExpired: expired,
  });
  await expect(
    api.request("public-onboard.invite", { params: { token: capability } }),
  ).rejects.toMatchObject({
    status: 401,
    message: "This public link is unavailable or has expired.",
  });
  expect(expired).not.toHaveBeenCalled();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("a capability owner replacement suppresses a late public receipt", async () => {
  const controller = new AbortController();
  let release!: (value: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const api = createCapiroApi(publicOnboardOperations, {
    credentials: "omit",
    scopeSignal: () => controller.signal,
    fetcher: async () => pending,
  });
  const readResult = api.request("public-onboard.invite", {
    params: { token: capability },
  });
  controller.abort();
  release(Response.json(invite));
  await expect(readResult).rejects.toMatchObject({ name: "AbortError" });
});
