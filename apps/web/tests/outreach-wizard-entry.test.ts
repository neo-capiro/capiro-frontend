import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";

// A synchronous hook harness exercises the real entry callbacks and URL writes.
// It is source interaction evidence, not a DOM/browser or API acceptance test.
const harness = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  row: undefined as unknown,
  loading: false,
  error: undefined as string | undefined,
  queries: [] as { key: string; enabled: boolean }[],
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState(initial: unknown) {
    const index = harness.cursor++;
    if (!(index in harness.values))
      harness.values[index] =
        typeof initial === "function" ? initial() : initial;
    return [
      harness.values[index],
      (value: unknown) => {
        harness.values[index] = value;
      },
    ];
  },
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery(key: string, _input: unknown, options: { enabled: boolean }) {
    harness.queries.push({ key, enabled: options.enabled });
    return {
      data: harness.row,
      loading: harness.loading,
      error: harness.error,
      reload: vi.fn(),
    };
  },
}));
vi.mock("../src/features/modules/engagement/NewsletterDestination", () => ({
  NewsletterDestination: () => null,
}));
vi.mock("../src/features/modules/engagement/outreach/OutreachWorkflow", () => ({
  OutreachWorkflow: () => null,
}));
vi.mock("../src/features/modules/engagement/outreach/OutreachList", () => ({
  OutreachList: () => null,
}));
vi.mock("../src/features/modules/engagement/outreach/OutreachDraft", () => ({
  OutreachDraft: () => null,
}));
vi.mock("../src/features/modules/engagement/outreach/CampaignOverview", () => ({
  CampaignOverview: () => null,
}));

import { OutreachView } from "../src/features/modules/engagement/OutreachView";
import { OutreachList } from "../src/features/modules/engagement/outreach/OutreachList";
import { OutreachWorkflow } from "../src/features/modules/engagement/outreach/OutreachWorkflow";
import { OutreachDraft } from "../src/features/modules/engagement/outreach/OutreachDraft";
import { CampaignOverview } from "../src/features/modules/engagement/outreach/CampaignOverview";
import { NewsletterDestination } from "../src/features/modules/engagement/NewsletterDestination";

function find(
  node: ReactNode,
  type: unknown,
): ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node))
    return node.map((child) => find(child, type)).find(Boolean);
  if (!isValidElement<Record<string, unknown>>(node)) return undefined;
  if (node.type === type) return node;
  return find(node.props.children as ReactNode, type);
}
function render(props: Partial<Parameters<typeof OutreachView>[0]> = {}) {
  harness.cursor = 0;
  return OutreachView({ clientId: "", ...props });
}
function invoke(
  node: ReactNode,
  type: unknown,
  callback: string,
  ...args: unknown[]
) {
  const action = find(node, type)?.props[callback];
  if (typeof action !== "function") throw new Error(`Missing ${callback}`);
  action(...args);
}
const id = "10000000-0000-4000-8000-000000000001";
const clientId = "20000000-0000-4000-8000-000000000002";
let location: { href: string };
beforeEach(() => {
  harness.values = [];
  harness.cursor = 0;
  harness.queries = [];
  harness.row = undefined;
  harness.loading = false;
  harness.error = undefined;
  location = {
    href:
      "https://synthetic.example.test/modules/engagement?view=outreach&clientId=" +
      clientId,
  };
  vi.stubGlobal("window", {
    location,
    history: {
      state: { retained: true },
      replaceState: vi.fn((_state, _unused, url) => {
        location.href = String(url);
      }),
    },
  });
});

describe("New Outreach enters the existing campaign owner", () => {
  it("opens the wizard with client scope and a reloadable campaign URL, without selecting a draft read", () => {
    invoke(render({ clientId }), OutreachList, "onCreate");
    const view = render({ clientId });
    expect(find(view, OutreachWorkflow)?.props).toMatchObject({
      id: undefined,
      clientId,
    });
    expect(find(view, OutreachDraft)).toBeUndefined();
    const url = new URL(location.href);
    expect(url.searchParams.get("create")).toBe("campaign");
    expect(url.searchParams.get("clientId")).toBe(clientId);
    expect(url.searchParams.has("detail")).toBe(false);
    expect(harness.queries.every((query) => !query.enabled)).toBe(true);
    harness.values = [];
    expect(
      find(
        render({ clientId, initialCreate: true, campaignCreate: true }),
        OutreachWorkflow,
      ),
    ).toBeDefined();
  });
  it("returns from the new wizard to the list without creating a record", () => {
    invoke(render(), OutreachList, "onCreate");
    invoke(render(), OutreachWorkflow, "onExit");
    expect(find(render(), OutreachList)).toBeDefined();
    expect(new URL(location.href).searchParams.has("create")).toBe(false);
    expect(harness.queries.every((query) => !query.enabled)).toBe(true);
  });
  it("preserves explicit create=draft links for the Classic simple editor", () => {
    expect(find(render({ initialCreate: true }), OutreachDraft)).toBeDefined();
  });
  it("keeps ordinary saved drafts reachable from the list and after reload", () => {
    harness.row = {
      id,
      type: "follow_up",
      status: "draft",
      metadata: null,
      client: { id: clientId },
    };
    invoke(render({ clientId }), OutreachList, "onRecord", harness.row);
    expect(find(render({ clientId }), OutreachDraft)?.props.record).toBe(
      harness.row,
    );
    expect(new URL(location.href).searchParams.get("draft")).toBe(id);
    expect(new URL(location.href).searchParams.get("detail")).toBe("overview");
    harness.values = [];
    expect(
      find(
        render({ clientId, initialDraft: id, overview: true }),
        OutreachDraft,
      ),
    ).toBeDefined();
  });
  it("preserves campaign overview/history and its selected category on return", () => {
    invoke(render(), OutreachList, "onCampaign", id);
    expect(find(render(), CampaignOverview)?.props.id).toBe(id);
    invoke(render(), CampaignOverview, "onExit", "sent");
    expect(find(render(), OutreachList)?.props.initialCategory).toBe("sent");
  });
  it.each(["candidate", "invalid"])(
    "retains %s Newsletter dispatch before ordinary editing",
    (kind) => {
      harness.row = {
        id,
        type: "outbound_campaign",
        metadata: { newsletterStageId: kind === "candidate" ? id : "invalid" },
      };
      const view = render({ initialDraft: id, overview: true });
      expect(find(view, NewsletterDestination)?.props.destination).toEqual(
        kind === "candidate" ? { kind: "record", id } : { kind: "invalid" },
      );
      expect(find(view, OutreachDraft)).toBeUndefined();
      expect(find(view, OutreachWorkflow)).toBeUndefined();
    },
  );
  it.each(["loading", "error", "wrong-client", "wrong-id"])(
    "keeps the existing %s read fence before dispatch",
    (condition) => {
      harness.row = {
        id,
        type: "follow_up",
        metadata: null,
        client: { id: clientId },
      };
      if (condition === "loading") harness.loading = true;
      if (condition === "error") harness.error = "Unavailable";
      if (condition === "wrong-client")
        harness.row = { ...(harness.row as object), client: { id } };
      if (condition === "wrong-id")
        harness.row = { ...(harness.row as object), id: clientId };
      const view = render({ clientId, initialDraft: id, overview: true });
      expect(find(view, OutreachDraft)).toBeUndefined();
      expect(find(view, OutreachWorkflow)).toBeUndefined();
      expect(find(view, NewsletterDestination)).toBeUndefined();
    },
  );
});
