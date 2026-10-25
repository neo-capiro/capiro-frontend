import { afterEach, expect, it, vi } from "vitest";
import { proxyActionRequest } from "../src/shared/meri-actions/proxy";
import { startObjectiveGeneration } from "../src/features/portfolio/objectives/objective-generation-start";
import { POST } from "../src/app/api/action-followthrough/[operation]/route";
const clerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => clerk);
vi.mock("../src/shared/meri-actions/identity-token.server", () => ({
  meriIdentityToken: async (
    _session: string,
    fallback: () => Promise<string>,
  ) => fallback(),
}));
const generationJobId = "10000000-0000-4000-8000-000000000005";
const ack = { state: "requested", generationJobId };
const origin = "https://frontend.example.test";
const config = {
  enabled: true,
  baseUrl: "https://meri.example.test",
  requestOrigin: origin,
};
const request = (
  body: unknown = { generationJobId },
  headers = {},
  suffix = "",
) =>
  new Request(`${origin}/api/action-followthrough/objective-start${suffix}`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("forwards only native identity and the exact canonical job to the fixed existing starter", async () => {
  const native = vi.fn(async () => "native-session-token");
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(ack, { status: 202 }),
  );
  const result = await proxyActionRequest(
    request({ generationJobId }, { "X-Meri-Action-Session": "untrusted" }),
    "objective-start",
    config,
    native,
    fetcher,
  );
  expect(result.status).toBe(202);
  expect(await result.json()).toEqual(ack);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url, options] = fetcher.mock.calls[0]!;
  expect(url).toBe("https://meri.example.test/api/objective-generation/start");
  expect(options?.headers).toEqual({
    "Content-Type": "application/json",
    Authorization: "Bearer native-session-token",
  });
  expect(JSON.parse(String(options?.body))).toEqual({ generationJobId });
});
it.each([
  { jobId: generationJobId },
  { generationJobId, tenantId: "injected" },
  { generationJobId: "no" },
])("refuses malformed start body without dispatch: %j", async (body) => {
  const fetcher = vi.fn<typeof fetch>();
  expect(
    (
      await proxyActionRequest(
        request(body),
        "objective-start",
        config,
        async () => "native",
        fetcher,
      )
    ).status,
  ).toBe(502);
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([
  [{ generationJobId }, { Authorization: "Bearer browser" }, ""],
  [{ generationJobId }, { Origin: "https://foreign.example.test" }, ""],
  [{ generationJobId }, {}, "?generationJobId=other"],
] as const)(
  "refuses injected origin, bearer or query before credentials",
  async (body, headers, suffix) => {
    const native = vi.fn(async () => "native");
    const fetcher = vi.fn<typeof fetch>();
    expect(
      (
        await proxyActionRequest(
          request(body, headers, suffix),
          "objective-start",
          config,
          native,
          fetcher,
        )
      ).status,
    ).toBe(400);
    expect(native).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);
it("rejects a success receipt for another job and preserves canonical unknown failures", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json(
        { ...ack, generationJobId: "10000000-0000-4000-8000-000000000006" },
        { status: 202 },
      ),
    )
    .mockResolvedValueOnce(
      Response.json(
        { error: { code: "OBJECTIVE_GENERATION_UNKNOWN" } },
        { status: 503 },
      ),
    );
  expect(
    (
      await proxyActionRequest(
        request(),
        "objective-start",
        config,
        async () => "native",
        fetcher,
      )
    ).status,
  ).toBe(502);
  const unknown = await proxyActionRequest(
    request(),
    "objective-start",
    config,
    async () => "native",
    fetcher,
  );
  expect(unknown.status).toBe(503);
  expect(await unknown.json()).toEqual({
    error: { code: "OBJECTIVE_GENERATION_UNKNOWN" },
  });
});
it("browser starter sends exactly one request and does not retry an unknown dispatch", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(
      { error: { code: "OBJECTIVE_GENERATION_UNKNOWN" } },
      { status: 503 },
    ),
  );
  await expect(
    startObjectiveGeneration(
      generationJobId,
      new AbortController().signal,
      fetcher,
    ),
  ).rejects.toThrow(/unconfirmed/);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    "/api/action-followthrough/objective-start",
  );
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
    generationJobId,
  });
});
it("the actual route uses conversation availability with native session identity independently of generic actions", async () => {
  for (const [key, value] of Object.entries({
    CORE_API_BASE_URL: "https://core.example.test/api",
    MERI_API_BASE_URL: config.baseUrl,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
    CLERK_SECRET_KEY: "sk_test_synthetic",
    CAPIRO_PREVIEW_READ_ONLY: "false",
    CAPIRO_REQUEST_ORIGIN: origin,
    MERI_CONVERSATION_WORKFLOW_ENABLED: "true",
    MERI_ACTION_WORKFLOW_ENABLED: "false",
  }))
    vi.stubEnv(key, value);
  const token = vi.fn(async () => "native");
  clerk.auth.mockResolvedValue({
    userId: "actor",
    sessionId: "session",
    getToken: token,
  });
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(ack, { status: 202 }),
  );
  vi.stubGlobal("fetch", fetcher);
  expect(
    (
      await POST(request(), {
        params: Promise.resolve({ operation: "objective-start" }),
      })
    ).status,
  ).toBe(202);
  expect(token).toHaveBeenCalledWith();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
