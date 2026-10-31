import { beforeEach, afterEach, expect, it, vi } from "vitest";
const authState = vi.hoisted(() => ({
  signedIn: true,
  token: vi.fn(async () => "synthetic-token"),
}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({
    userId: authState.signedIn ? "synthetic-user" : null,
    getToken: authState.token,
  }),
}));
const { GET } = await import("../src/app/api/capiro/[operation]/route");
const fetcher = vi.fn<typeof fetch>(async () => Response.json([]));
beforeEach(() => {
  vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "false");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_YQ==");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_synthetic");
  vi.stubEnv("CORE_API_BASE_URL", "https://core.example.test/api");
  vi.stubEnv("ENGAGEMENT_API_BASE_URL", "https://engagement.example.test/api");
  vi.stubEnv("ENGAGEMENT_SESSIONS_AVAILABILITY", "enabled");
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockClear();
  authState.token.mockClear();
  authState.signedIn = true;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function invoke(
  operation: string,
  input: unknown = { query: { limit: 100, offset: 0 } },
) {
  return GET(
    new Request(
      "https://frontend.example.test/api/capiro/" +
        operation +
        "?input=" +
        encodeURIComponent(JSON.stringify(input)),
    ),
    { params: Promise.resolve({ operation }) },
  );
}
it("enabled list uses engagement owner and preserves authenticated, no-store request", async () => {
  expect((await invoke("engagement.sessions")).status).toBe(200);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
  expect(url.href).toBe(
    "https://engagement.example.test/api/engagement/outreach-v3/sessions?limit=100&offset=0",
  );
  expect(options.cache).toBe("no-store");
  expect(options.redirect).toBe("error");
  expect(options.headers).toMatchObject({
    Authorization: "Bearer synthetic-token",
  });
  expect(authState.token).toHaveBeenCalledWith({ template: "capiro" });
});
it("enabled detail uses engagement while unrelated campaigns remain core", async () => {
  await invoke("engagement.session", {
    params: { sessionId: "10000000-0000-4000-8000-000000000001" },
  });
  expect(String(fetcher.mock.calls[0]![0])).toContain(
    "https://engagement.example.test/api/engagement/outreach-v3/sessions/",
  );
  fetcher.mockClear();
  await invoke("engagement.campaigns", {
    query: { limit: 100, deleted: "false" },
  });
  expect(String(fetcher.mock.calls[0]![0])).toContain(
    "https://core.example.test/api/",
  );
});
it.each(["", "disabled", "malformed"])(
  "%s preserves existing direct operation routing rather than globally retiring it",
  async (availability) => {
    vi.stubEnv("ENGAGEMENT_SESSIONS_AVAILABILITY", availability);
    await invoke("engagement.sessions");
    expect(String(fetcher.mock.calls[0]![0])).toContain(
      "https://core.example.test/api/",
    );
  },
);
it("unauthenticated requests reach no service", async () => {
  authState.signedIn = false;
  expect((await invoke("engagement.sessions")).status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});
it("invalid inputs reach no service", async () => {
  expect(
    (await invoke("engagement.sessions", { query: { limit: 101 } })).status,
  ).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
it("an enabled operation never silently falls back to core when configured owner disappears", async () => {
  vi.stubEnv("CORE_API_BASE_URL", "");
  expect((await invoke("engagement.sessions")).status).toBe(200);
  expect(String(fetcher.mock.calls[0]![0])).toContain(
    "https://engagement.example.test/api/",
  );
});
