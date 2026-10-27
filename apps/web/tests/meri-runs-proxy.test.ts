import { expect, it, vi } from "vitest";
import { proxyConversationNativeRead } from "../src/shared/meri-conversations/history-proxy";
import { runReadOperation } from "../src/shared/meri-runs/operations";
import { listRequest, listResponse } from "./meri-runs-fixtures";
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
