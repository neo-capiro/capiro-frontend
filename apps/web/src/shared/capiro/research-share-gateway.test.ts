import { expect, it, vi } from "vitest";
import { handlePublicResearchShareRequest } from "./gateway";

const token = "b".repeat(64);
const origin = "https://app.example.test";
const config = {
  services: { core: "https://core.example.test/api" },
  authConfigured: false,
  issues: [],
};
const dashboard = {
  schemaVersion: 1,
  portfolioName: "Portfolio",
  portfolioPurpose: null,
  asOf: "2026-10-26T00:00:00.000Z",
  preparedFor: { clientName: "Client" },
  branding: null,
  layout: { columns: 12, widgets: [], phoneOrder: [] },
  data: {
    totals: [],
    contributions: [],
    coverage: {
      eligibleMembers: 0,
      supportedMembers: 0,
      includedContributions: 0,
      excludedContributions: 0,
      overlapContributions: 0,
      unavailableMembers: 0,
    },
    limitations: [],
    subjects: [],
    sources: [],
    clientFit: null,
    changes: [],
    comparison: null,
  },
  snapshot: {
    id: "s",
    name: "Q4",
    capturedAt: "2026-10-20T00:00:00.000Z",
    portfolioRevision: 1,
    calculationVersion: "v2",
  },
  publishedAt: "2026-10-26T00:00:00.000Z",
  expiresAt: "2026-11-02T00:00:00.000Z",
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
    headers: {
      Origin: requestOrigin,
      "Content-Type": "application/json",
      Cookie: "session=forged",
    },
    body: JSON.stringify(input),
  });
}

it("availability works without Clerk and forwards only the link token", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({ available: true, tenantId: "x" }),
  );
  const response = await handlePublicResearchShareRequest(
    read("public-research-share.availability", { params: { token } }),
    "public-research-share.availability",
    config,
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ available: true });
  const [url, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
  expect(url.href).toBe(
    `https://core.example.test/api/public/research-share/${token}`,
  );
  const headers = new Headers(options.headers);
  for (const name of ["cookie", "authorization", "x-tenant-id"])
    expect(headers.has(name)).toBe(false);
  expect(options.credentials).toBe("omit");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
});

it("the dashboard read carries the view token in the body of a same-origin POST", async () => {
  const fetcher = vi.fn(async () => Response.json(dashboard));
  const response = await handlePublicResearchShareRequest(
    write("public-research-share.dashboard", {
      params: { token },
      body: { viewToken: "link.exp.sig" },
    }),
    "public-research-share.dashboard",
    config,
    fetcher,
  );
  expect(response.status).toBe(200);
  expect((await response.json()).portfolioName).toBe("Portfolio");
  const [url, options] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
  expect(url.href).toBe(
    `https://core.example.test/api/public/research-share/${token}/dashboard`,
  );
  expect(JSON.parse(String(options.body))).toEqual({
    viewToken: "link.exp.sig",
  });
  expect(new Headers(options.headers).has("cookie")).toBe(false);
});

it("cross-origin PIN attempts and malformed tokens never reach the upstream", async () => {
  const fetcher = vi.fn();
  const crossOrigin = await handlePublicResearchShareRequest(
    write(
      "public-research-share.pin",
      { params: { token }, body: { pin: "123456" } },
      "https://evil.example",
    ),
    "public-research-share.pin",
    config,
    fetcher,
  );
  expect(crossOrigin.status).toBe(403);
  for (const bad of ["B".repeat(64), "b".repeat(63), "../session", "12345"]) {
    const response = await handlePublicResearchShareRequest(
      write("public-research-share.pin", {
        params: { token: bad },
        body: { pin: "123456" },
      }),
      "public-research-share.pin",
      config,
      fetcher,
    );
    expect(response.status).toBe(400);
  }
  const shortPin = await handlePublicResearchShareRequest(
    write("public-research-share.pin", {
      params: { token },
      body: { pin: "12" },
    }),
    "public-research-share.pin",
    config,
    fetcher,
  );
  expect(shortPin.status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  "research.sharing",
  "research.shareLinks.publish",
  "public-onboard.invite",
  "public-research-share.arbitrary",
  "__proto__",
])("the public research-share allowlist refuses %s", async (key) => {
  const fetcher = vi.fn();
  const response = await handlePublicResearchShareRequest(
    read(key),
    key,
    config,
    fetcher,
  );
  expect(response.status).toBe(404);
  expect(fetcher).not.toHaveBeenCalled();
});
