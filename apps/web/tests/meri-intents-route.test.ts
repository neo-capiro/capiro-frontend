import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/conversations/intents/[operation]/route";
import { actionSessionHeader } from "../src/shared/meri-actions/session-header";

const clerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => clerk);
const origin = "https://frontend.example.test";
const env = {
  CAPIRO_PREVIEW_READ_ONLY: "false",
  CORE_API_BASE_URL: "https://core.example.test/api",
  MERI_API_BASE_URL: "https://meri.example.test",
  CAPIRO_REQUEST_ORIGIN: origin,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  MERI_CONVERSATION_WORKFLOW_ENABLED: "true",
  MERI_INTENT_APPROVALS_WORKFLOW_ENABLED: "true",
};
const conversationId = "20000000-0000-4000-8000-000000000001";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/**
 * Meri's intent routes sit behind the same membership gate as conversation history, settings and
 * memory: Core verifies the native Clerk session token. A capiro template token is Core's own API
 * credential; forwarding it made every list and decide answer a content-free 502 before the
 * intent owner was reached.
 */
it("forwards the native Clerk session token, never the capiro template token", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const getToken = vi.fn(async () => "synthetic-native-bearer");
  clerk.auth.mockResolvedValue({ userId: "synthetic-user", getToken });
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ error: { code: "MEMBERSHIP_CHANGED" } }, { status: 409 }),
  );
  vi.stubGlobal("fetch", fetcher);
  const response = await POST(
    new Request(`${origin}/api/conversations/intents/list`, {
      method: "POST",
      body: JSON.stringify({ conversationId, limit: 50 }),
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        [actionSessionHeader]: `action_session_${"s".repeat(43)}`,
      },
    }),
    { params: Promise.resolve({ operation: "list" }) },
  );
  expect(response.status).toBe(409);
  expect(getToken).toHaveBeenCalledExactlyOnceWith();
  expect(fetcher.mock.calls[0]![0]).toBe(
    `${env.MERI_API_BASE_URL}/api/conversations/intents/list`,
  );
  expect(
    new Headers(fetcher.mock.calls[0]![1]!.headers).get("authorization"),
  ).toBe("Bearer synthetic-native-bearer");
});
