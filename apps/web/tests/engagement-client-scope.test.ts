import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EngagementScreen } from "../src/features/modules/engagement/EngagementScreen";

const state = vi.hoisted(() => ({
  params: "",
  clients: [] as { id: string; name: string }[],
  reads: [] as { key: string; input: unknown }[],
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.params),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string, input: unknown) => {
    state.reads.push({ key, input });
    if (key !== "clients.list")
      throw new Error(`Unexpected scope query: ${key}`);
    return {
      data: key === "clients.list" ? state.clients : [],
      loading: false,
      reload: vi.fn(),
    };
  },
}));
vi.mock("../src/features/modules/engagement/OutreachView", () => ({
  // The client-scope select moved into OutreachView's `listHeader`, so the
  // test double has to render that prop or the scope control disappears from
  // the markup this suite asserts on.
  OutreachView: ({ clientId, listHeader }: { clientId: string; listHeader?: unknown }) =>
    createElement("section", { "data-outreach-client": clientId }, listHeader as never),
}));

const clientId = "30000000-0000-4000-8000-000000000001";
const client = { id: clientId, name: "Synthetic selected client" };
const otherClient = {
  id: "30000000-0000-4000-8000-000000000002",
  name: "Synthetic other client",
};
const render = () => renderToStaticMarkup(createElement(EngagementScreen));
const scopeSelect = (html: string) => {
  const select = html.match(
    /<select\b[^>]*aria-label="Engagement client scope"[^>]*>[\s\S]*?<\/select>/,
  )?.[0];
  expect(select).toBeDefined();
  return select!;
};

beforeEach(() => {
  state.params = `view=plan&clientId=${clientId}`;
  state.clients = [];
  state.reads = [];
});

describe("Engagement client scope label", () => {
  it("selects the catalog name for the matching current URL client", () => {
    state.clients = [otherClient, client];
    const html = render();
    const select = scopeSelect(html);
    expect(select).toContain(
      `<option value="${clientId}" selected="">${client.name}</option>`,
    );
    expect(select).not.toContain("Selected client (name unavailable)");
    expect(select.match(/selected=""/g)).toHaveLength(1);
    expect(html).toContain(`data-outreach-client="${clientId}"`);
    expect(state.reads).toEqual([{ key: "clients.list", input: {} }]);
  });

  it("retains the exact URL scope with an honest label when the catalog omits it", () => {
    for (const clients of [[], [otherClient]]) {
      state.clients = clients;
      state.reads = [];
      const html = render();
      const select = scopeSelect(html);
      expect(select).toContain(
        `<option value="${clientId}" selected="">Selected client (name unavailable)</option>`,
      );
      expect(select).toContain(
        '<option value="">All permitted clients</option>',
      );
      expect(select.match(/selected=""/g)).toHaveLength(1);
      expect(html).toContain(`data-outreach-client="${clientId}"`);
      expect(state.reads).toEqual([{ key: "clients.list", input: {} }]);
    }
  });

  it("selects All permitted clients only for the existing empty URL scope", () => {
    state.params = "";
    const html = render();
    const select = scopeSelect(html);
    expect(select).toContain(
      '<option value="" selected="">All permitted clients</option>',
    );
    expect(select).not.toContain("Selected client (name unavailable)");
    expect(select.match(/selected=""/g)).toHaveLength(1);
    expect(html).toContain('data-outreach-client=""');
    expect(state.reads).toEqual([{ key: "clients.list", input: {} }]);
  });
});
