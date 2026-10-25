import { afterEach, expect, it, vi } from "vitest";

const { auth, getToken } = vi.hoisted(() => ({
  auth: vi.fn(),
  getToken: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth }));
import { POST } from "../src/app/api/settings/tenant/[operation]/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
function configure() {
  for (const [key, value] of Object.entries({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YQ==",
    CLERK_SECRET_KEY: "sk_test_synthetic",
    CORE_API_BASE_URL: "https://core.synthetic.invalid",
    MERI_API_BASE_URL: "https://meri.synthetic.invalid",
    MERI_TENANT_SETTINGS_ENABLED: "true",
    CAPIRO_REQUEST_ORIGIN: "http://localhost:5199",
    CAPIRO_PREVIEW_READ_ONLY: "false",
  }))
    vi.stubEnv(key, value);
}
const request = () =>
  new Request("http://localhost:5199/api/settings/tenant/read", {
    method: "POST",
    headers: {
      Origin: "http://localhost:5199",
      "Content-Type": "application/json",
    },
    body: "{}",
  });

it("uses only the current native Clerk session and leaves admin authority to canonical Meri", async () => {
  configure();
  getToken.mockResolvedValue("native");
  auth.mockResolvedValue({ userId: "synthetic-user", getToken });
  const fetcher = vi.fn(async () =>
    Response.json(
      { error: { code: "SETTINGS_ADMIN_REQUIRED" } },
      { status: 403 },
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  expect(
    (await POST(request(), { params: Promise.resolve({ operation: "read" }) }))
      .status,
  ).toBe(403);
  expect(getToken).toHaveBeenCalledExactlyOnceWith();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("refuses preview containment and unsigned sessions without an upstream request", async () => {
  configure();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "true");
  expect(
    (await POST(request(), { params: Promise.resolve({ operation: "read" }) }))
      .status,
  ).toBe(503);
  expect(auth).not.toHaveBeenCalled();
  vi.stubEnv("CAPIRO_PREVIEW_READ_ONLY", "false");
  auth.mockResolvedValue({ userId: null, getToken });
  expect(
    (await POST(request(), { params: Promise.resolve({ operation: "read" }) }))
      .status,
  ).toBe(401);
  expect(getToken).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});
