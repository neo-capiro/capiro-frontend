import { describe, expect, it, vi } from "vitest";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
import { readConfig } from "../src/shared/portfolio/config/config";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { readIncomingFiles } from "../src/features/portfolio/relationships/email/incoming-files";

const threadId = "10000000-0000-4000-8000-000000000001";
const messageId = "10000000-0000-4000-8000-000000000002";
const route = [
  "engagement",
  "mail",
  "threads",
  threadId,
  "messages",
  messageId,
  "files",
];
const guidance =
  "Incoming files could not be read. Open the original message in your mailbox.";
const generic = "The service is unavailable. Please retry.";
const config = readConfig({
  CORE_API_BASE_URL: "https://core.example.test/api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  CAPIRO_REQUEST_ORIGIN: "http://localhost:5188",
});
function relay({
  status = 503,
  payload = { message: guidance },
  path = route,
  method = "GET",
  token = "synthetic-token" as string | null,
}: {
  status?: number;
  payload?: unknown;
  path?: string[];
  method?: string;
  token?: string | null;
} = {}) {
  const fetcher = vi.fn(async () =>
    Response.json(payload, {
      status,
      headers: {
        "set-cookie": "private=synthetic",
        "x-provider-diagnostic": "private-provider-detail",
      },
    }),
  );
  const response = proxyRequest(
    new Request(`http://localhost:5188/api/backend/core/${path.join("/")}`, {
      method,
      headers: { origin: "http://localhost:5188" },
    }),
    "core",
    path,
    config,
    async () => token,
    fetcher,
  );
  return { response, fetcher };
}
describe("selected-message incoming-files unavailable response", () => {
  it("retains only Core's exact mailbox guidance, status and no-store boundary", async () => {
    const response = await relay({
      payload: {
        statusCode: 503,
        error: "Service Unavailable",
        message: guidance,
        providerDiagnostic: "private-provider-detail",
      },
    }).response;
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: guidance });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-provider-diagnostic")).toBeNull();
  });
  it.each([
    { message: "raw provider failure" },
    { message: `${guidance} private provider diagnostics` },
    { message: [guidance] },
    { notice: guidance },
    null,
  ])("masks unrecognized or malformed error data", async (payload) => {
    expect(await (await relay({ payload }).response).json()).toEqual({
      message: generic,
    });
  });
  it.each([
    { method: "POST" },
    { path: [...route, "import"] },
    { path: route.slice(0, -1) },
    { path: ["engagement", "meetings"] },
    { path: route.map((part) => (part === threadId ? "not-an-id" : part)) },
    { path: route.map((part) => (part === messageId ? "not-an-id" : part)) },
    { status: 500 },
    { status: 502 },
    { status: 504 },
  ])(
    "does not extend guidance beyond its exact GET route/status",
    async (options) => {
      expect(await (await relay(options).response).json()).toEqual({
        message: generic,
      });
    },
  );
  it("does not dispatch without the existing session", async () => {
    const { response, fetcher } = relay({ token: null });
    expect((await response).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps the actual manifest reader failed with actionable guidance instead of an empty result", async () => {
    const api = createApiClient(async () => relay().response);
    await expect(
      readIncomingFiles(api, {
        threadId,
        messageId,
        connectionId: "10000000-0000-4000-8000-000000000003",
        updatedAt: "2026-10-27T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ status: 503, message: guidance });
  });
});
