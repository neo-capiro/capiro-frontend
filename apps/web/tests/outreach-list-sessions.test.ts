import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Focused regression for the Outreach list's ancillary "campaign sessions" read.
 *
 * The list merges session-only campaigns into the canonical campaign rows, but sessions are an
 * ancillary read: a 404/loading there must never hide healthy saved records (200) or canonical
 * campaigns (200), and an unavailable sessions read must be stated rather than silently read as a
 * complete zero.
 */

type QueryState = {
  data?: unknown;
  error?: Error;
  loading: boolean;
  reload: () => void;
};

const state = vi.hoisted(() => ({
  byKey: {} as Record<string, QueryState>,
  calls: [] as {
    key: string;
    input: unknown;
    options: { enabled?: boolean };
  }[],
  capability: "unknown" as "enabled" | "disabled" | "unknown",
}));

vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (
    key: string,
    input: unknown,
    options: { enabled?: boolean } = {},
  ) => {
    state.calls.push({ key, input, options });
    return state.byKey[key] ?? { loading: false, reload: () => undefined };
  },
}));

vi.mock("../src/shared/capiro/capabilities", () => ({
  useCapiroCapabilities: () => ({ campaignSessions: state.capability }),
  CapiroCapabilitiesProvider: ({ children }: { children: unknown }) => children,
}));

const { OutreachList } =
  await import("../src/features/modules/engagement/outreach/OutreachList");

const campaign = (over: Record<string, unknown> = {}) => ({
  id: "c-1",
  hasWorkflow: true,
  status: "draft",
  recipientCount: 2,
  recordedSendStatus: null,
  category: "drafts",
  sentAt: null,
  state: {
    title: "Canonical campaign",
    clientId: "cl-1",
    decisions: { goal: "Goal" },
  },
  ...over,
});

const record = (over: Record<string, unknown> = {}) => ({
  id: "r-1",
  title: "Saved outreach record",
  type: "follow_up",
  status: "draft",
  hasWorkflow: false,
  client: { id: "cl-1", name: "Acme" },
  ...over,
});

const session = (over: Record<string, unknown> = {}) => ({
  id: "s-1",
  hasWorkflow: false,
  title: "Session campaign",
  topic: null,
  goal: null,
  status: "draft",
  targetCount: 1,
  recordStatus: null,
  sentAt: null,
  ...over,
});

function render(
  byKey: Record<string, QueryState>,
  props: Record<string, unknown> = {},
  capability: "enabled" | "disabled" | "unknown" = "unknown",
) {
  state.byKey = byKey;
  state.calls = [];
  state.capability = capability;
  return renderToStaticMarkup(
    createElement(OutreachList, {
      clientId: "",
      onCreate: () => undefined,
      onCampaign: () => undefined,
      onRecord: () => undefined,
      ...props,
    }),
  );
}

const sessionsCall = () =>
  state.calls.filter((call) => call.key === "engagement.sessions");

const ok = (data: unknown): QueryState => ({
  data,
  loading: false,
  reload: () => undefined,
});
const failure = (error: Error): QueryState => ({
  error,
  loading: false,
  reload: () => undefined,
});
const pending = (): QueryState => ({ loading: true, reload: () => undefined });
const notFound = () => new Error("Not found");

const occurrences = (markup: string, text: string) =>
  markup.split(text).length - 1;

describe("Outreach list sessions isolation", () => {
  it("keeps healthy records and campaigns visible when sessions return 404", () => {
    const markup = render({
      "engagement.outreach.records": ok({ items: [record()] }),
      "engagement.campaigns": ok({ items: [campaign()] }),
      "engagement.sessions": failure(notFound()),
    });
    expect(markup).toContain("Canonical campaign");
    expect(markup).toContain("Saved outreach record");
    expect(markup).toContain("Campaign sessions are unavailable");
    expect(markup).toContain("Counts and results are partial");
    expect(markup).toContain("Retry campaign sessions");
    // The sessions 404 must not be promoted to the fatal list state.
    expect(markup).not.toContain("This view is unavailable");
    expect(markup).not.toContain("Not found");
  });

  it("states a pending sessions read and still renders canonical rows", () => {
    const markup = render({
      "engagement.outreach.records": ok({ items: [record()] }),
      "engagement.campaigns": ok({ items: [campaign()] }),
      "engagement.sessions": pending(),
    });
    expect(markup).toContain("Canonical campaign");
    expect(markup).toContain("Saved outreach record");
    expect(markup).toContain("Campaign sessions are loading");
    expect(markup).toContain("Counts and results are partial");
    // No fatal "Loading…" panel: only the auxiliary notice reports loading.
    expect(markup).not.toContain(">Loading…<");
  });

  it("does not claim a complete empty campaign list while sessions are unavailable", () => {
    const markup = render({
      "engagement.outreach.records": ok({ items: [] }),
      "engagement.campaigns": ok({ items: [] }),
      "engagement.sessions": failure(notFound()),
    });
    expect(markup).toContain("Campaign sessions are unavailable");
    expect(markup).not.toContain("No campaign drafts yet");
  });

  it("keeps the empty campaign state when sessions did load successfully", () => {
    const markup = render({
      "engagement.outreach.records": ok({ items: [] }),
      "engagement.campaigns": ok({ items: [] }),
      "engagement.sessions": ok([]),
    });
    expect(markup).toContain("No campaign drafts yet");
    expect(markup).not.toContain("Campaign sessions are unavailable");
  });

  it("reconciles a successful sessions retry without duplicating rows", () => {
    // Retry succeeds and returns a session whose id already exists canonically plus one new one.
    const markup = render({
      "engagement.outreach.records": ok({ items: [] }),
      "engagement.campaigns": ok({ items: [campaign()] }),
      "engagement.sessions": ok([
        session({ id: "c-1", title: "Canonical campaign" }),
        session({ id: "s-2", title: "Fresh session campaign" }),
        session({ id: "s-2", title: "Fresh session campaign" }),
      ]),
    });
    expect(occurrences(markup, "Canonical campaign")).toBe(1);
    expect(occurrences(markup, "Fresh session campaign")).toBe(1);
    expect(markup).not.toContain("Campaign sessions are unavailable");
  });

  it("never renders disabled global sessions in a scoped-client list", () => {
    const markup = render(
      {
        "engagement.outreach.records": ok({ items: [record()] }),
        "engagement.campaigns": ok({ items: [campaign()] }),
        // Stale global session data must not leak into a client-scoped result.
        "engagement.sessions": ok([session({ title: "Global session leak" })]),
      },
      { clientId: "cl-1" },
    );
    const sessionsCall = state.calls.find(
      (call) => call.key === "engagement.sessions",
    );
    expect(sessionsCall?.options.enabled).toBe(false);
    expect(markup).not.toContain("Global session leak");
    expect(markup).toContain("Saved outreach record");
  });

  it("keeps the client-response mismatch refusal", () => {
    const markup = render(
      {
        "engagement.outreach.records": ok({
          items: [record({ client: { id: "other-client", name: "Other" } })],
        }),
        "engagement.campaigns": ok({ items: [] }),
        "engagement.sessions": ok([]),
      },
      { clientId: "cl-1" },
    );
    expect(markup).toContain("does not match this client scope");
    expect(markup).not.toContain("Saved outreach record");
  });

  it("retains canonical pagination controls", () => {
    const markup = render({
      "engagement.outreach.records": ok({ items: [] }),
      "engagement.campaigns": ok({ items: [campaign()], nextCursor: "next-c" }),
      "engagement.sessions": ok(
        Array.from({ length: 100 }, (_, index) =>
          session({ id: `s-${index}`, title: `Session ${index}` }),
        ),
      ),
    });
    expect(markup).toContain("Next campaigns");
    expect(markup).toContain("Next campaign sessions");
  });

  it("still surfaces real canonical read failures fatally", () => {
    const markup = render({
      "engagement.outreach.records": failure(new Error("Records read failed")),
      "engagement.campaigns": ok({ items: [campaign()] }),
      "engagement.sessions": ok([]),
    });
    expect(markup).toContain("Records read failed");
    expect(markup).not.toContain("Canonical campaign");
  });
});

describe("Outreach list campaign-session capability admission", () => {
  const healthy = () => ({
    "engagement.outreach.records": ok({ items: [record()] }),
    "engagement.campaigns": ok({ items: [campaign()] }),
  });

  it("issues no sessions query and states the surface is not available when disabled", () => {
    // Stale session data is present on purpose: a disabled cohort must not render it either.
    const markup = render(
      {
        ...healthy(),
        "engagement.sessions": ok([session({ title: "Stale session row" })]),
      },
      {},
      "disabled",
    );
    const calls = sessionsCall();
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((call) => call.options.enabled === false)).toBe(true);
    expect(markup).toContain("Campaign sessions are not available");
    expect(markup).toContain("Saved outreach record");
    expect(markup).toContain("Canonical campaign");
    // No retry control exists in this state, so no interaction can dispatch the request.
    expect(markup).not.toContain("Retry campaign sessions");
    expect(markup).not.toContain("Campaign sessions are unavailable");
    expect(markup).not.toContain("Stale session row");
  });

  it("keeps the request disabled across rerenders in the disabled cohort", () => {
    render({ ...healthy(), "engagement.sessions": ok([]) }, {}, "disabled");
    expect(sessionsCall().every((call) => call.options.enabled === false)).toBe(
      true,
    );
    // A rerender with different props (different client scope) must not flip it on.
    render(
      { ...healthy(), "engagement.sessions": ok([]) },
      { clientId: "cl-1" },
      "disabled",
    );
    expect(sessionsCall().every((call) => call.options.enabled === false)).toBe(
      true,
    );
  });

  it("issues the intended query and renders session rows when enabled", () => {
    const markup = render(
      {
        ...healthy(),
        "engagement.sessions": ok([
          session({ id: "s-2", title: "Enabled session campaign" }),
          session({ id: "s-2", title: "Enabled session campaign" }),
        ]),
      },
      {},
      "enabled",
    );
    expect(sessionsCall().every((call) => call.options.enabled === true)).toBe(
      true,
    );
    expect(occurrences(markup, "Enabled session campaign")).toBe(1);
    expect(markup).not.toContain("Campaign sessions are not available");
    expect(markup).not.toContain("Campaign sessions are unavailable");
  });

  it("keeps enabled-service failure honest and retryable", () => {
    const markup = render(
      {
        ...healthy(),
        "engagement.sessions": failure(new Error("upstream unavailable")),
      },
      {},
      "enabled",
    );
    expect(sessionsCall().every((call) => call.options.enabled === true)).toBe(
      true,
    );
    expect(markup).toContain("Campaign sessions are unavailable");
    expect(markup).toContain("Counts and results are partial");
    expect(markup).toContain("Retry campaign sessions");
    expect(markup).toContain("Canonical campaign");
    // The ancillary failure stays non-fatal.
    expect(markup).not.toContain("This view is unavailable");
  });

  it("keeps the documented unknown fallback (request issued, honest partial state)", () => {
    const markup = render(
      {
        ...healthy(),
        "engagement.sessions": failure(new Error("Not found")),
      },
      {},
      "unknown",
    );
    expect(sessionsCall().every((call) => call.options.enabled === true)).toBe(
      true,
    );
    expect(markup).toContain("Campaign sessions are unavailable");
    expect(markup).toContain("Retry campaign sessions");
    expect(markup).toContain("Canonical campaign");
  });

  it("keeps the selected-client gate even when the cohort is enabled", () => {
    render(
      { ...healthy(), "engagement.sessions": ok([session()]) },
      { clientId: "cl-1" },
      "enabled",
    );
    expect(sessionsCall().every((call) => call.options.enabled === false)).toBe(
      true,
    );
  });
});

/**
 * Campaigns created before campaign workflows existed come back from the campaigns read with
 * `hasWorkflow: false`. Campaign, record and session pages are independent: the hint must explain
 * which rows feed the tabs without promising that a legacy campaign appears in the records page
 * or excluding a matching session from the existing category counts.
 */
describe("Outreach list legacy campaign counts", () => {
  it("explains a zero category when campaigns predate campaign workflows", () => {
    const markup = render({
      "engagement.outreach.records": ok({ items: [record()] }),
      "engagement.campaigns": ok({
        items: [campaign({ id: "c-legacy", hasWorkflow: false })],
      }),
      "engagement.sessions": ok([]),
    });
    expect(markup).toContain("Saved outreach record");
    // This workflow-less campaign has no corresponding loaded session.
    expect(markup).toContain("Campaign drafts · 0");
    expect(markup).toContain(
      "1 campaign on the loaded campaigns page has no workflow",
    );
    expect(markup).toContain(
      "Campaign categories count loaded workflow campaigns",
    );
    expect(markup).toContain("eligible campaign sessions");
    expect(markup).toContain("Saved outreach records loads separately");
    expect(markup).not.toContain("listed under Saved outreach records");
  });

  it("pluralises the explanation for several legacy campaigns", () => {
    const markup = render({
      "engagement.outreach.records": ok({ items: [] }),
      "engagement.campaigns": ok({
        items: [
          campaign({ id: "c-legacy-1", hasWorkflow: false }),
          campaign({ id: "c-legacy-2", hasWorkflow: false }),
        ],
      }),
      "engagement.sessions": ok([]),
    });
    expect(markup).toContain(
      "2 campaigns on the loaded campaigns page have no workflow",
    );
    expect(markup).toContain("No outreach records yet");
    expect(markup).not.toContain("they are listed");
    expect(markup).not.toContain("not counted in the campaign categories");
  });

  it("keeps the plain hint when every campaign has a workflow", () => {
    const markup = render({
      "engagement.outreach.records": ok({ items: [] }),
      "engagement.campaigns": ok({ items: [campaign()] }),
      "engagement.sessions": ok([]),
    });
    expect(markup).toContain("Campaign drafts · 1");
    expect(markup).not.toContain("on the loaded campaigns page");
  });

  it("does not promise a legacy campaign on a separately paginated records page", () => {
    const markup = render({
      "engagement.outreach.records": ok({
        items: [record({ id: "other-record" })],
        nextCursor: "next-records",
      }),
      "engagement.campaigns": ok({
        items: [campaign({ id: "legacy", hasWorkflow: false })],
        nextCursor: "next-campaigns",
      }),
      "engagement.sessions": ok([]),
    });
    expect(markup).toContain("Campaign drafts · 0+");
    expect(markup).toContain("Next outreach records");
    expect(markup).toContain("Next campaigns");
    expect(markup).toContain("Saved outreach records loads separately");
    expect(markup).not.toContain("listed under Saved outreach records");
  });

  it("keeps a matching session counted without claiming its ID is excluded", () => {
    const markup = render(
      {
        "engagement.outreach.records": ok({ items: [] }),
        "engagement.campaigns": ok({
          items: [campaign({ id: "legacy", hasWorkflow: false })],
        }),
        "engagement.sessions": ok([session({ id: "legacy" })]),
      },
      {},
      "enabled",
    );
    expect(markup).toContain("Campaign drafts · 1");
    expect(markup).toContain("Session campaign");
    expect(markup).toContain("eligible campaign sessions");
    expect(markup).toContain("No outreach records yet");
    expect(markup).not.toContain("not counted in the campaign categories");
  });
});
