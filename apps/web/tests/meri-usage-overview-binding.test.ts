import { expect, it, vi } from "vitest";
import {
  USAGE_OVERVIEW_SCHEMA,
  receiveUsageOverviewRequest,
  receiveUsageOverviewResponse,
} from "@capiro/meri-contracts/conversation-usage";
import { usageOverviewOperation } from "../src/shared/meri-usage/operations";
import { createUsageOverviewClient } from "../src/shared/meri-usage/client";
import { proxyConversationNativeRead } from "../src/shared/meri-conversations/history-proxy";
import { usageOverviewFixture } from "./meri-usage-overview-fixtures";

const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const input = { schemaVersion: USAGE_OVERVIEW_SCHEMA };
const origin = "https://frontend.example.test";
const config = {
  enabled: true,
  baseUrl: "https://meri.example.test",
  frontendOrigin: origin,
};
const request = (
  body: unknown = input,
  headers = {},
  path = usageOverviewOperation.path,
) =>
  new Request(origin + path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

it("receives the physical .25 tenant overview with actual calendar boundaries and honest unknowns", () => {
  const admitted = receiveUsageOverviewRequest(bytes(input));
  expect(
    receiveUsageOverviewResponse(200, bytes(usageOverviewFixture()), admitted),
  ).toEqual(usageOverviewFixture());
  for (const field of [
    "tenantId",
    "actorId",
    "clientId",
    "conversationId",
    "session",
  ]) {
    expect(() =>
      receiveUsageOverviewRequest(bytes({ ...input, [field]: "forged" })),
    ).toThrow();
  }
  const invalid = usageOverviewFixture();
  invalid.periods[1].endExclusive = invalid.observedAt;
  expect(() =>
    receiveUsageOverviewResponse(200, bytes(invalid), admitted),
  ).toThrow();
  expect(() =>
    receiveUsageOverviewResponse(
      200,
      bytes({ ...usageOverviewFixture(), privateRows: [] }),
      admitted,
    ),
  ).toThrow();
});

it("forwards only the exact aggregate read with native credentials and no session bootstrap", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(usageOverviewFixture()),
  );
  const result = await proxyConversationNativeRead(
    request(),
    usageOverviewOperation,
    config,
    async () => "synthetic-native",
    fetcher,
  );
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual(usageOverviewFixture());
  expect(fetcher).toHaveBeenCalledOnce();
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    config.baseUrl + usageOverviewOperation.path,
  );
  expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
    Authorization: "Bearer synthetic-native",
    Origin: origin,
  });
  expect(
    JSON.parse(
      new TextDecoder().decode(fetcher.mock.calls[0]?.[1]?.body as Uint8Array),
    ),
  ).toEqual(input);
});

it("refuses wrong route, authority, cross-origin and non-read methods before dispatch", async () => {
  const fetcher = vi.fn<typeof fetch>();
  for (const invalid of [
    request(input, { Authorization: "Bearer browser" }),
    request(input, { Origin: "https://foreign.example.test" }),
    request(input, {}, "/api/conversations/usage-overview?tenantId=forged"),
    request({ ...input, tenantId: "forged" }),
    new Request(origin + usageOverviewOperation.path, { method: "GET" }),
  ]) {
    const result = await proxyConversationNativeRead(
      invalid,
      usageOverviewOperation,
      config,
      async () => "synthetic-native",
      fetcher,
    );
    expect([400, 405]).toContain(result.status);
  }
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    (
      await proxyConversationNativeRead(
        request(),
        usageOverviewOperation,
        config,
        async () => null,
        fetcher,
      )
    ).status,
  ).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});

it("withholds malformed accounting and forwards the actual refusal without exposing private content", async () => {
  const result = await proxyConversationNativeRead(
    request(),
    usageOverviewOperation,
    config,
    async () => "synthetic-native",
    async () =>
      Response.json({ ...usageOverviewFixture(), private: "withhold me" }),
  );
  expect(result.status).toBe(502);
  expect(await result.text()).not.toContain("withhold me");
  const refused = await proxyConversationNativeRead(
    request(),
    usageOverviewOperation,
    config,
    async () => "synthetic-native",
    async () =>
      Response.json({ error: { code: "ACCESS_DENIED" } }, { status: 403 }),
  );
  expect(refused.status).toBe(403);
});

it("the browser performs one read and retires membership-denied results", async () => {
  let current = true;
  const lost = vi.fn(() => {
    current = false;
  });
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ error: { code: "ACCESS_DENIED" } }, { status: 403 }),
  );
  const client = createUsageOverviewClient(() => current, lost, fetcher);
  await expect(client.read(new AbortController().signal)).rejects.toThrow();
  expect(lost).toHaveBeenCalledOnce();
  await expect(client.read(new AbortController().signal)).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledOnce();
});

it("an account switch while a response is pending cannot release former tenant totals", async () => {
  let current = true;
  let release!: (response: Response) => void;
  const fetcher = vi.fn<typeof fetch>(
    () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
  );
  const client = createUsageOverviewClient(() => current, vi.fn(), fetcher);
  const result = client.read(new AbortController().signal);
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  current = false;
  release(Response.json(usageOverviewFixture()));
  await expect(result).rejects.toThrow();
});
