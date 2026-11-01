import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  publicCapiroConfig,
  readCapiroConfig,
} from "../src/shared/capiro/config";
const actor = vi.hoisted(() => ({ signedIn: true }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({
    userId: actor.signedIn ? "synthetic" : null,
    getToken: async () => "synthetic-token",
  }),
}));
const { GET } = await import("../src/app/api/capiro/[operation]/route");
const fetcher = vi.fn<typeof fetch>(async () =>
  Response.json({ items: [], nextCursor: null }),
);
beforeEach(() => {
  vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "false");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_YQ==");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_synthetic");
  vi.stubEnv("CORE_API_BASE_URL", "https://core.example.test/api");
  vi.stubEnv("OUTREACH_AUDIENCE_FILTER_VERSION", "");
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockClear();
  actor.signedIn = true;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const invoke = (operation: string, query: unknown) =>
  GET(
    new Request(
      `https://frontend.example.test/api/capiro/${operation}?input=${encodeURIComponent(JSON.stringify({ query }))}`,
    ),
    { params: Promise.resolve({ operation }) },
  );

for (const operation of [
  "engagement.campaigns",
  "engagement.outreach.records",
]) {
  it.each(["", "0", "2", "enabled"])(
    `${operation}: unsupported version %s never forwards the new parameter`,
    async (version) => {
      vi.stubEnv("OUTREACH_AUDIENCE_FILTER_VERSION", version);
      expect(
        (await invoke(operation, { direction: "to-clients" })).status,
      ).toBe(400);
      expect(fetcher).not.toHaveBeenCalled();
      expect((await invoke(operation, { limit: 1 })).status).toBe(200);
      expect(String(fetcher.mock.calls[0]![0])).not.toContain("direction");
    },
  );
  it(`${operation}: enabled producer receives exact selector and existing scope, with no retry`, async () => {
    vi.stubEnv("OUTREACH_AUDIENCE_FILTER_VERSION", "1");
    const clientId = "11111111-1111-4111-8111-111111111111";
    expect(
      (
        await invoke(operation, {
          direction: "on-behalf",
          clientId,
          limit: 1,
          deleted: "true",
          cursor: "opaque",
          q: "Draft",
        })
      ).status,
    ).toBe(200);
    const [target, options] = fetcher.mock.calls[0]!;
    const url = new URL(String(target));
    expect(url.searchParams.get("direction")).toBe("on-behalf");
    expect(url.searchParams.get("clientId")).toBe(clientId);
    expect(url.searchParams.get("cursor")).toBe("opaque");
    expect(url.searchParams.get("deleted")).toBe("true");
    expect(options).toMatchObject({
      method: "GET",
      cache: "no-store",
      redirect: "error",
    });
    fetcher.mockClear();
    fetcher.mockResolvedValueOnce(
      Response.json({ message: "Denied" }, { status: 403 }),
    );
    expect((await invoke(operation, { direction: "on-behalf" })).status).toBe(
      403,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it(`${operation}: malformed selectors and identity injection never reach Core`, async () => {
    vi.stubEnv("OUTREACH_AUDIENCE_FILTER_VERSION", "1");
    for (const query of [
      { direction: "all" },
      { direction: ["to-clients"] },
      { direction: "to-clients", tenantId: "spoof" },
    ])
      expect((await invoke(operation, query)).status).toBe(400);
    actor.signedIn = false;
    expect((await invoke(operation, { direction: "to-clients" })).status).toBe(
      401,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it(`${operation}: read-only preview does not bypass its existing route allocation`, async () => {
    vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "true");
    const result = await invoke(operation, { direction: "to-clients" });
    expect(result.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
}
it("publishes only the explicit version and never infers it from a URL or sessions capability", () => {
  for (const value of [undefined, "", "true", "2"]) {
    const config = readCapiroConfig({
      OUTREACH_AUDIENCE_FILTER_VERSION: value,
      CORE_API_BASE_URL: "https://core.test",
      ENGAGEMENT_SESSIONS_AVAILABILITY: "enabled",
      ENGAGEMENT_API_BASE_URL: "https://engagement.test",
    });
    expect(
      publicCapiroConfig(config).capabilities?.outreachAudienceVersion,
    ).toBeUndefined();
  }
  expect(
    publicCapiroConfig(
      readCapiroConfig({ OUTREACH_AUDIENCE_FILTER_VERSION: "1" }),
    ).capabilities?.outreachAudienceVersion,
  ).toBe(1);
});
