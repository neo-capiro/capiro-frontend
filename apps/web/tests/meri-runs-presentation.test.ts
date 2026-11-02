import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { RunPage } from "../src/features/meri/runs/RunsWorkspace";
import {
  RunRecordDetails,
  usageSummary,
  runRecordHref,
} from "../src/features/meri/runs/RunRecord";
import { MeriRunsHost } from "../src/features/meri/runs/MeriRunsHost";
import { listResponse, detailResponse, run } from "./meri-runs-fixtures";
import type { RunsClient } from "../src/shared/meri-runs/client";

const context = vi.hoisted(() => ({
  enabled: true,
  identity: {
    isFetching: false,
    error: null as unknown,
    data: {
      tenant: { id: "synthetic-tenant" },
      user: { id: "synthetic-user" },
    },
  },
  selected: { state: "no-selection" } as {
    state: string;
    requestedId?: string;
  },
}));
vi.mock("../src/shared/meri-runs/client", () => ({
  createRunsClient: vi.fn(),
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => context.identity,
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => context.selected,
}));
vi.mock("../src/shared/meri-resources/CapabilityContext", () => ({
  useMeriCapabilities: () => ({
    runs: { status: context.enabled ? "on" : "off" },
  }),
}));
const client = {
  list: vi.fn(),
  detail: vi.fn(),
  usage: vi.fn(),
} satisfies RunsClient;

it("shows recorded zero, missing usage and partial estimates as different outcomes", () => {
  expect(usageSummary(run.usage)).toBe("$0.00 USD");
  expect(
    usageSummary({
      ...run.usage,
      recording: "not-recorded",
      sdkEstimateUsd: null,
    }),
  ).toBe("Not recorded");
  expect(
    usageSummary({
      ...run.usage,
      recording: "unavailable",
      sdkEstimateUsd: null,
    }),
  ).toBe("Unavailable");
  expect(
    usageSummary({
      ...run.usage,
      recording: "unavailable",
      sdkEstimateUsd: 0.5,
    }),
  ).toBe("$0.50 USD (partial)");
});

it("rounds already-USD amounts only for display and never rounds tiny positive usage to zero", () => {
  for (const [amount, display] of [
    [0.26785095, "$0.27 USD"],
    [0.01, "$0.01 USD"],
    [0.0000001, "< $0.01 USD"],
    [1.23456, "$1.23 USD"],
  ] as const) {
    const usage = { ...run.usage, sdkEstimateUsd: amount };
    expect(usageSummary(usage)).toBe(display);
    expect(usage.sdkEstimateUsd).toBe(amount);
  }
  const html = renderToStaticMarkup(
    createElement(RunRecordDetails, {
      value: {
        ...detailResponse,
        run: { ...run, usage: { ...run.usage, sdkEstimateUsd: 0.26785095 } },
      },
      client,
      clientId: null,
    }),
  );
  expect(html).toContain("<summary>Exact estimate</summary>");
  expect(html).toContain("Recorded SDK estimate: 0.26785095 USD");
  expect(html).toContain("$0.27 USD");
  expect(html).toContain("not a provider-billed charge");
});

it("presents observed timestamps, exact run links and scoped empty-page limits", () => {
  const html = renderToStaticMarkup(
    createElement(RunPage, { value: listResponse, clientId: null }),
  );
  expect(html).toContain("Recorded status");
  expect(html).toContain("UTC");
  expect(html).toContain("$0.00 USD");
  expect(html).toContain(runRecordHref(run, null).replaceAll("&", "&amp;"));
  expect(html).toContain("No further page in this observation");
  const empty = renderToStaticMarkup(
    createElement(RunPage, {
      value: { ...listResponse, runs: [] },
      clientId: null,
    }),
  );
  expect(empty).toContain(
    "No permitted runs matched this scope and status at this observation",
  );
  expect(empty).not.toContain("No runs exist");
});

it("keeps failed/cancelled records visible without claiming physical stop or making a new run", () => {
  for (const state of ["failed", "cancelled"] as const) {
    const html = renderToStaticMarkup(
      createElement(RunRecordDetails, {
        value: { ...detailResponse, run: { ...run, state } },
        client,
        clientId: null,
      }),
    );
    expect(html).toContain(state[0]!.toUpperCase() + state.slice(1));
    expect(html).toContain("not confirmation that work has stopped");
    expect(html).toContain(`conversationId=${run.conversationId}`);
    expect(html).toContain("scope=general");
    expect(html).not.toContain("Run again");
  }
  expect(client.list).not.toHaveBeenCalled();
  expect(client.detail).not.toHaveBeenCalled();
});

it("contains prior content while account or selected-client access is being checked or denied", () => {
  context.identity.isFetching = true;
  expect(
    renderToStaticMarkup(createElement(MeriRunsHost, { enabled: true })),
  ).toContain("Verifying current account");
  context.identity.isFetching = false;
  context.selected = { state: "unavailable", requestedId: "synthetic-denied" };
  expect(
    renderToStaticMarkup(createElement(MeriRunsHost, { enabled: true })),
  ).toContain("could not be verified");
  context.selected = { state: "no-selection" };
  context.enabled = false;
  expect(
    renderToStaticMarkup(createElement(MeriRunsHost, { enabled: true })),
  ).toContain("not enabled");
  context.enabled = true;
});
