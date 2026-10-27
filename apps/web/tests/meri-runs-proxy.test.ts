import { expect, it, vi } from "vitest";
import { proxyConversationNativeRead } from "../src/shared/meri-conversations/history-proxy";
import { runReadOperation } from "../src/shared/meri-runs/operations";
import { listRequest, listResponse, run } from "./meri-runs-fixtures";
const origin = "https://frontend.example.test";
const config = {
  enabled: true,
  baseUrl: "https://meri.example.test",
  frontendOrigin: origin,
};
const request = (
  headers = {},
  body: unknown = listRequest,
  path = "/api/conversations/runs/list",
) =>
  new Request(origin + path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

it("forwards only the exact native run read with server-derived membership credentials", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(listResponse));
  const result = await proxyConversationNativeRead(
    request(),
    runReadOperation("list"),
    config,
    async () => "synthetic-native",
    fetcher,
  );
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual(listResponse);
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    config.baseUrl + "/api/conversations/runs/list",
  );
  expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
    Authorization: "Bearer synthetic-native",
  });
});

it.each([
  { Authorization: "Bearer browser-substitution" },
  { Origin: "https://foreign.example.test" },
  { "Sec-Fetch-Site": "cross-site" },
  { "Last-Event-ID": "4" },
])(
  "rejects untrusted request authority before native-token lookup: %o",
  async (headers) => {
    const token = vi.fn(async () => "synthetic-native");
    const fetcher = vi.fn<typeof fetch>();
    const result = await proxyConversationNativeRead(
      request(headers),
      runReadOperation("list"),
      config,
      token,
      fetcher,
    );
    expect(result.status).toBe(400);
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("refuses wrong routes and identity fields, and never creates a session on missing auth", async () => {
  const fetcher = vi.fn<typeof fetch>();
  for (const input of [
    request({}, { ...listRequest, tenantId: "forged" }),
    request({}, listRequest, "/api/conversations/runs/execute"),
    request({}, listRequest, "/api/conversations/runs/list?cursor=forged"),
  ]) {
    expect(
      (
        await proxyConversationNativeRead(
          input,
          runReadOperation("list"),
          config,
          async () => "synthetic-native",
          fetcher,
        )
      ).status,
    ).toBe(400);
  }
  expect(
    (
      await proxyConversationNativeRead(
        request(),
        runReadOperation("list"),
        config,
        async () => null,
        fetcher,
      )
    ).status,
  ).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});

it("does not release a mismatched run page or private error content", async () => {
  const result = await proxyConversationNativeRead(
    request(),
    runReadOperation("list"),
    config,
    async () => "synthetic-native",
    async () =>
      Response.json({
        ...listResponse,
        scope: { kind: "all" },
        private: "must stay private",
      }),
  );
  expect(result.status).toBe(502);
  expect(await result.text()).not.toContain("must stay private");
});

it.each(["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "DELETE"])(
  "refuses %s at the mounted proxy before any token lookup or upstream call",
  async (method) => {
    const token = vi.fn(async () => "synthetic-native");
    const fetcher = vi.fn<typeof fetch>();
    const result = await proxyConversationNativeRead(
      new Request(origin + "/api/conversations/runs/list", { method }),
      runReadOperation("list"),
      config,
      token,
      fetcher,
    );
    expect(result.status).toBe(405);
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each([0, 21, 1.5, -1])(
  "installed request receiver refuses page limit %s",
  async (limit) => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await proxyConversationNativeRead(
      request({}, { ...listRequest, limit }),
      runReadOperation("list"),
      config,
      async () => "synthetic-native",
      fetcher,
    );
    expect(result.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("installed receiver accepts the 1–20 bound and an exact issued cursor without auto-pagination", async () => {
  for (const limit of [1, 20]) {
    const cursor = "synthetic_issued_cursor";
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json(listResponse),
    );
    const result = await proxyConversationNativeRead(
      request({}, { ...listRequest, limit, cursor }),
      runReadOperation("list"),
      config,
      async () => "synthetic-native",
      fetcher,
    );
    expect(result.status).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
    const bytes = fetcher.mock.calls[0]?.[1]?.body as Uint8Array;
    expect(JSON.parse(new TextDecoder().decode(bytes))).toEqual({
      ...listRequest,
      limit,
      cursor,
    });
  }
});

it("installed response receiver refuses a page exceeding the requested bound", async () => {
  const otherId = "40000000-0000-4000-8000-000000000001";
  const second = {
    ...run,
    runId: otherId,
    createdAt: "2026-10-26T12:00:00.000Z",
    references: { ...run.references, runId: otherId },
  };
  const result = await proxyConversationNativeRead(
    request({}, { ...listRequest, limit: 1 }),
    runReadOperation("list"),
    config,
    async () => "synthetic-native",
    async () => Response.json({ ...listResponse, runs: [run, second] }),
  );
  expect(result.status).toBe(502);
  expect(await result.text()).not.toContain(otherId);
});
