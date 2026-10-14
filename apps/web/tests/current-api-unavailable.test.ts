import { expect, it, vi } from "vitest";
import { z } from "zod";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
import { readConfig } from "../src/shared/portfolio/config/config";
import { handleCapiroRequest } from "../src/shared/capiro/gateway";
import { createCapiroApi } from "../src/shared/capiro/http";
import { capiroOperations } from "../src/shared/capiro/registry";
import { readCapiroConfig } from "../src/shared/capiro/config";
import { saveObjective } from "../src/features/portfolio/objectives/writer";
import { emptyFields } from "../src/features/portfolio/objectives/contracts";

const origin = "https://frontend.synthetic.invalid";
const clientId = "10000000-0000-4000-8000-000000000001";
const env = {
  CORE_API_BASE_URL: "https://backend.synthetic.invalid/api",
  WORKSPACE_API_BASE_URL: "https://backend.synthetic.invalid/workspace-api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_live_synthetic",
};
const message =
  "The requested action or record is unavailable from the current service.";
const missing = () =>
  Response.json(
    {
      statusCode: 404,
      message: "Cannot GET /api/candidate",
      error: "Not Found",
    },
    { status: 404 },
  );

function portfolio() {
  const upstream = vi.fn(async () => missing());
  const api = createApiClient(async (input, init) => {
    const url = new URL(String(input), origin);
    const [service, ...path] = url.pathname
      .slice("/api/backend/".length)
      .split("/");
    return proxyRequest(
      new Request(url, {
        ...init,
        headers: { ...init?.headers, Origin: origin },
      }),
      service!,
      path,
      readConfig(env),
      async () => "synthetic-session-token",
      upstream,
    );
  });
  return { api, upstream };
}

it.each([
  ["GET", `clients/${clientId}/objectives`],
  ["POST", `clients/${clientId}/objectives`],
  ["PATCH", `clients/${clientId}/objectives?objectiveId=${clientId}`],
  ["POST", `clients/${clientId}/objectives/transition?objectiveId=${clientId}`],
  ["DELETE", `clients/${clientId}/objectives?objectiveId=${clientId}`],
  ["GET", `clients/${clientId}/account-owners`],
  ["PUT", `clients/${clientId}/account-owners`],
  [
    "GET",
    "federal-register/effective-date-calendar?dateFrom=2026-10-01&dateTo=2026-10-31",
  ],
])(
  "Portfolio %s %s reports unavailable without admitting a result",
  async (method, path) => {
    const { api, upstream } = portfolio();
    const admitted = vi.fn();
    await expect(
      api.request("core", path!, z.unknown().transform(admitted), {
        method,
        ...(method === "GET" ? {} : { body: {} }),
      }),
    ).rejects.toMatchObject({ status: 404, message });
    expect(admitted).not.toHaveBeenCalled();
    expect(upstream).toHaveBeenCalledTimes(1);
    const [url, options] = upstream.mock.calls[0]! as unknown as [
      URL,
      RequestInit,
    ];
    expect(url.pathname).toMatch(/^\/api\/(clients|federal-register)\//);
    expect(url.pathname).not.toContain("/api/api/");
    expect(new Headers(options.headers).has("origin")).toBe(false);
  },
);

it("a missing create endpoint cannot publish a saved objective or send a transition", async () => {
  const { api, upstream } = portfolio();
  const persisted = vi.fn();
  await expect(
    saveObjective(
      api,
      clientId,
      {
        fields: { ...emptyFields, outcome: "Synthetic draft" },
        requestId: clientId,
      },
      "save",
      persisted,
    ),
  ).rejects.toMatchObject({ status: 404, message });
  expect(persisted).not.toHaveBeenCalled();
  expect(upstream).toHaveBeenCalledTimes(1);
});

it.each([
  [
    "calendar.effectiveDates",
    {
      query: {
        dateFrom: "2026-10-01",
        dateTo: "2026-10-31",
        page: 1,
        limit: 100,
      },
    },
  ],
  [
    "workspace.newsletter.revision",
    { params: { draftId: clientId, versionId: clientId } },
  ],
  [
    "workspace.newsletter.stage",
    {
      params: { sessionId: clientId },
      body: {
        requestId: clientId,
        draftId: clientId,
        versionId: clientId,
        snapshotHash: "a".repeat(64),
        expectedStateVersion: 1,
      },
    },
  ],
] as const)(
  "fixed gateway %s distinguishes unavailable operation from a missing record",
  async (key, input) => {
    const upstream = vi.fn(async () => missing());
    const api = createCapiroApi(capiroOperations, {
      fetcher: async (url, init) =>
        handleCapiroRequest(
          new Request(new URL(String(url), origin), {
            ...init,
            headers: { ...init?.headers, Origin: origin },
          }),
          key,
          capiroOperations,
          readCapiroConfig(env),
          async () => "synthetic-session-token",
          upstream,
        ),
    });
    await expect(api.request(key, input)).rejects.toMatchObject({
      status: 404,
      message,
    });
    expect(upstream).toHaveBeenCalledTimes(1);
  },
);
