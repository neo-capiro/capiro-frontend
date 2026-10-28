import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import {
  receiveUsageOverviewRequestV2,
  receiveUsageOverviewResponseV2,
} from "@capiro/meri-contracts/conversation-usage";
import { usageOverviewOperation } from "../src/shared/meri-usage/operations";
import { createUsageOverviewClient } from "../src/shared/meri-usage/client";
import {
  projectUsageOverview,
  usageSnapshotNotice,
} from "../src/features/meri/usage-overview/projection";
import { UsageLimitsScreen } from "../src/features/meri/screens/settings/UsageLimitsScreen";
import {
  usageOverviewFixture,
  usageOverviewFixtureWithoutSuccessfulJobs,
} from "./meri-usage-overview-fixtures";

// Client-read chain only. No React mount, effect or host lifetime is exercised in this file: a
// synthetic local test server answers the bytes the read chain sends by running the published /2
// request receiver over those bytes and the published /2 response receiver over its own body, so the
// client is exercised against contract code and not against a hand-rolled stub, and the received
// body is then rendered statically through the real projection into the real screen markup with
// react-dom/server. The effect-driven mounted host is covered by
// test/usage-overview-host/usage-overview-host.spec.ts.
const localServer = (body: unknown, status = 200) => {
  const seen: { path: string; schemaVersion: unknown }[] = [];
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const sent = new Uint8Array(init?.body as Uint8Array);
    const admitted = receiveUsageOverviewRequestV2(sent);
    seen.push({
      path: String(input).split("?")[0]!,
      schemaVersion: (
        JSON.parse(new TextDecoder().decode(sent)) as {
          schemaVersion: unknown;
        }
      ).schemaVersion,
    });
    const payload = JSON.stringify(body);
    if (status === 200)
      receiveUsageOverviewResponseV2(
        status,
        new TextEncoder().encode(payload),
        admitted,
      );
    return new Response(payload, {
      status,
      headers: { "content-type": "application/json" },
    });
  });
  return { fetcher, seen };
};

const readOnce = async (body: unknown, status = 200) => {
  const server = localServer(body, status);
  const client = createUsageOverviewClient(() => true, vi.fn(), server.fetcher);
  return { server, received: await client.read(new AbortController().signal) };
};

const chrome = {
  nav: [],
  unavailable: "Runs access is unavailable",
  localDrafts: false,
  headerOverlays: false,
};

const renderScreen = (value: ReturnType<typeof usageOverviewFixture>) =>
  renderToStaticMarkup(
    createElement(UsageLimitsScreen, {
      chrome: {
        ...chrome,
        notice: usageSnapshotNotice(value, Date.parse(value.observedAt)),
      },
      view: projectUsageOverview(value),
    }),
  );

it("the real client reads the /2 aggregate through the contract server", async () => {
  const { server, received } = await readOnce(usageOverviewFixture());
  expect(received).toEqual(usageOverviewFixture());
  expect(server.seen).toEqual([
    {
      path: "/api/conversations/usage-overview",
      schemaVersion: "meri.usage-overview/2",
    },
  ]);
  expect(server.seen[0]!.path).toBe(usageOverviewOperation.path);
  expect(server.fetcher).toHaveBeenCalledOnce();
});

it("renders the received body as distinct successful, partial, failed and unclosed facts", async () => {
  const { received } = await readOnce(usageOverviewFixture());
  const html = renderScreen(received);
  expect(html).toContain("Whole jobs · This month · UTC");
  expect(html).toContain("Cost per successful job");
  expect(html).toContain("$0.15");
  expect(html).toContain("3 jobs · 5 attempts · $0.45 known SDK estimate");
  expect(html).toContain("1 jobs · 2 attempts · $0.12 known SDK estimate");
  expect(html).toContain("0 jobs · 0 attempts · $0.00 known SDK estimate");
  expect(html).toContain("1 jobs · 1 attempts · $0.03 known SDK estimate");
  expect(html).toContain("5 recorded · 1 without usable accounting");
  // period, policy and queue facts still come from the same received body
  expect(html).toContain("Today · UTC");
  expect(html).toContain("This week · Monday UTC");
  expect(html).toContain("Maximum SDK budget per attempt");
  expect(html).toContain("$1.50 known recorded this month");
  expect(html).not.toContain("whole-job-lineage-at-root-revision-window");
  expect(html).not.toContain("sdk_usage.parentRunId");
});

it("renders the zero-denominator read as an unavailable per-job cost, never an invented zero", async () => {
  const { received } = await readOnce(
    usageOverviewFixtureWithoutSuccessfulJobs(),
  );
  const html = renderScreen(received);
  expect(html).toContain("Cost per successful job");
  expect(html).toContain(">Unavailable<");
  expect(html).not.toContain("$0.15");
  expect(html).toContain("0 jobs · 0 attempts · $0.00 known SDK estimate");
  expect(html).toContain("0 recorded · 0 without usable accounting");
});

it("retires access on denial after one read and releases no totals", async () => {
  const server = localServer({ error: { code: "ACCESS_DENIED" } }, 403);
  let current = true;
  const lost = vi.fn(() => {
    current = false;
  });
  const client = createUsageOverviewClient(() => current, lost, server.fetcher);
  await expect(client.read(new AbortController().signal)).rejects.toThrow();
  expect(lost).toHaveBeenCalledOnce();
  await expect(client.read(new AbortController().signal)).rejects.toThrow();
  expect(server.fetcher).toHaveBeenCalledOnce();
  expect(server.seen).toHaveLength(1);
});

it("a late valid answer after an account change cannot release former tenant totals", async () => {
  const body = JSON.stringify(usageOverviewFixture());
  let release!: () => void;
  let admitted = false;
  const fetcher = vi.fn<typeof fetch>(
    (_input, init) =>
      new Promise<Response>((resolve) => {
        // The answer really is contract-valid: admit it with the published receiver first, so a
        // rejection below can only be the access retirement and never a bad payload.
        receiveUsageOverviewRequestV2(new Uint8Array(init?.body as Uint8Array));
        admitted = true;
        release = () =>
          resolve(
            new Response(body, {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
          );
      }),
  );
  let current = true;
  const client = createUsageOverviewClient(() => current, vi.fn(), fetcher);
  const result = client.read(new AbortController().signal);
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  current = false;
  expect(admitted).toBe(true);
  release();
  await expect(result).rejects.toThrow();
  expect(current).toBe(false);
});
