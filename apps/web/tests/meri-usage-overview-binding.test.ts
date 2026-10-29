import { expect, it, vi } from "vitest";
import {
  USAGE_OVERVIEW_SCHEMA_V2,
  usageOverviewMetadataV2,
  receiveUsageOverviewRequestV2,
  receiveUsageOverviewResponseV2,
} from "@capiro/meri-contracts/conversation-usage";
import { usageOverviewOperation } from "../src/shared/meri-usage/operations";
import { createUsageOverviewClient } from "../src/shared/meri-usage/client";
import { proxyConversationNativeRead } from "../src/shared/meri-conversations/history-proxy";
import {
  usageOverviewFixture,
  usageOverviewFixtureWithoutSuccessfulJobs,
} from "./meri-usage-overview-fixtures";

const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const input = { schemaVersion: USAGE_OVERVIEW_SCHEMA_V2 };
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
const admitted = () => receiveUsageOverviewRequestV2(bytes(input));

it("the operation is the published /2 read, not a local path or version", async () => {
  expect(usageOverviewOperation.path).toBe(usageOverviewMetadataV2.path);
  expect(usageOverviewOperation.requestBytes).toBe(
    usageOverviewMetadataV2.requestBytes,
  );
  expect(usageOverviewOperation.responseBytes).toBe(
    usageOverviewMetadataV2.responseBytes,
  );
  expect(input.schemaVersion).toBe("meri.usage-overview/2");
  const admit = await usageOverviewOperation.admit(bytes(input));
  expect(await admit(200, bytes(usageOverviewFixture()))).toEqual(
    usageOverviewFixture(),
  );
  expect(() =>
    usageOverviewOperation.admit(
      bytes({ schemaVersion: "meri.usage-overview/1" }),
    ),
  ).toThrow();
});

it("receives whole-job economics through the real /2 receiver and keeps the raw canonical coverage exact", () => {
  const receivedView = receiveUsageOverviewResponseV2(
    200,
    bytes(usageOverviewFixture()),
    admitted(),
  );
  if ("error" in receivedView)
    throw new Error("the receiver refused the fixture");
  const view = receivedView;
  expect(view).toEqual(usageOverviewFixture());
  expect(
    receiveUsageOverviewResponseV2(
      200,
      bytes(usageOverviewFixtureWithoutSuccessfulJobs()),
      admitted(),
    ),
  ).toEqual(usageOverviewFixtureWithoutSuccessfulJobs());
  // The canonical coverage literals cross the boundary unchanged; the display layer translates them.
  expect(view.wholeJobs.basis).toContain("canonical ROOT Work/Delegate");
  expect(view.wholeJobs.window).toBe(
    "root revision created within the admitted month window",
  );
  expect(view.wholeJobs.coverage.chargeAttribution).toBe(
    "whole-job-lineage-at-root-revision-window",
  );
  expect(view.wholeJobs.coverage.windowEdge).toContain("excluded and counted");
  expect(view.jobIdentity.states).toEqual([
    "successful",
    "partial",
    "failed",
    "cancelled",
    "unclosed",
  ]);
  expect(view.categories).toEqual(usageOverviewFixture().categories);
  expect(view.denominators).toEqual(usageOverviewFixture().denominators);
  for (const field of [
    "tenantId",
    "actorId",
    "clientId",
    "conversationId",
    "session",
  ]) {
    expect(() =>
      receiveUsageOverviewRequestV2(bytes({ ...input, [field]: "forged" })),
    ).toThrow();
  }
});

it("refuses malformed, semantically inconsistent and invented whole-job bodies", () => {
  const inconsistent = usageOverviewFixture();
  inconsistent.wholeJobs.revisions = inconsistent.wholeJobs.attempts + 1;
  expect(() =>
    receiveUsageOverviewResponseV2(200, bytes(inconsistent), admitted()),
  ).toThrow();

  // A missing per-job denominator is null, never an invented zero cost.
  const invented = usageOverviewFixtureWithoutSuccessfulJobs();
  invented.wholeJobs.microUsdPerSuccessfulJob = 0;
  expect(() =>
    receiveUsageOverviewResponseV2(200, bytes(invented), admitted()),
  ).toThrow();

  const boundary = usageOverviewFixture();
  boundary.periods[1].endExclusive = boundary.observedAt;
  expect(() =>
    receiveUsageOverviewResponseV2(200, bytes(boundary), admitted()),
  ).toThrow();

  expect(() =>
    receiveUsageOverviewResponseV2(
      200,
      bytes({ ...usageOverviewFixture(), privateRows: [] }),
      admitted(),
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

it("refuses wrong route, authority, cross-origin, superseded version and non-read methods before dispatch", async () => {
  const fetcher = vi.fn<typeof fetch>();
  for (const invalid of [
    request(input, { Authorization: "Bearer browser" }),
    request(input, { Origin: "https://foreign.example.test" }),
    request(input, {}, "/api/conversations/usage-overview?tenantId=forged"),
    request({ ...input, tenantId: "forged" }),
    request({ schemaVersion: "meri.usage-overview/1" }),
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

it('an account switch while a response is "pending" cannot release former tenant totals', async () => {
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
