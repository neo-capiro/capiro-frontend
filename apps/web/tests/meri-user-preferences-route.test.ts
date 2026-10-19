import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/settings/user/[operation]/route";

const clerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => clerk);
const origin = "https://frontend.example.test";
const env = {
  CORE_API_BASE_URL: "https://core.example.test/api",
  MERI_API_BASE_URL: "https://meri.example.test",
  CAPIRO_REQUEST_ORIGIN: origin,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  MERI_USER_PREFERENCES_ENABLED: "true",
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("forwards the native Clerk session token, never the capiro template token", async () => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const getToken = vi.fn(async () => "synthetic-native-bearer");
  clerk.auth.mockResolvedValue({ userId: "synthetic-user", getToken });
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ error: { code: "MEMBERSHIP_CHANGED" } }, { status: 403 }),
  );
  vi.stubGlobal("fetch", fetcher);
  const response = await POST(
    new Request(`${origin}/api/settings/user/read`, {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json", Origin: origin },
    }),
    { params: Promise.resolve({ operation: "read" }) },
  );
  expect(response.status).toBe(403);
  expect(getToken).toHaveBeenCalledExactlyOnceWith();
  expect(fetcher.mock.calls[0]![0]).toBe(
    `${env.MERI_API_BASE_URL}/api/settings/user/read`,
  );
  expect(
    new Headers(fetcher.mock.calls[0]![1]!.headers).get("authorization"),
  ).toBe("Bearer synthetic-native-bearer");
});
