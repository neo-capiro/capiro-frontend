import { beforeEach, expect, it, vi } from "vitest";
import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { OutreachAudience } from "../src/features/modules/engagement/outreach/outreach-audience-model";

const driver = vi.hoisted(() => ({
  values: [] as unknown[],
  index: 0,
  version: 1 as 1 | undefined,
  calls: [] as {
    key: string;
    input: { query: Record<string, unknown> };
    enabled: boolean;
  }[],
  results: {} as Record<
    string,
    { data?: unknown; error?: Error; loading: boolean }
  >,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = driver.index++;
    if (!(index in driver.values)) driver.values[index] = initial;
    return [
      driver.values[index],
      (next: unknown) => {
        driver.values[index] =
          typeof next === "function" ? next(driver.values[index]) : next;
      },
    ];
  },
}));
vi.mock("../src/shared/capiro/capabilities", () => ({
  useCapiroCapabilities: () => ({
    campaignSessions: "enabled",
    outreachAudienceVersion: driver.version,
  }),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (
    key: string,
    input: { query: Record<string, unknown> },
    options: { enabled: boolean },
  ) => {
    driver.calls.push({ key, input, enabled: options.enabled });
    return { loading: false, ...driver.results[key], reload: vi.fn() };
  },
}));
const { OutreachList } =
  await import("../src/features/modules/engagement/outreach/OutreachList");
const { OutreachAudienceFilter } =
  await import("../src/features/modules/engagement/outreach/OutreachAudienceFilter");
const props = {
  clientId: "",
  onCreate: vi.fn(),
  onCampaign: vi.fn(),
  onRecord: vi.fn(),
};
function render(clientId = "", scopeControl?: ReactNode) {
  driver.index = 0;
  driver.calls = [];
  const tree = OutreachList({ ...props, clientId, scopeControl });
  return { tree, markup: renderToStaticMarkup(tree) };
}
function find(
  node: ReactNode,
  predicate: (props: Record<string, unknown>, type: unknown) => boolean,
): Record<string, unknown> {
  if (Array.isArray(node)) {
    for (const child of node) {
      try {
        return find(child, predicate);
      } catch {}
    }
  } else if (isValidElement<Record<string, unknown>>(node)) {
    if (predicate(node.props, node.type)) return node.props;
    if (node.props.children)
      return find(node.props.children as ReactNode, predicate);
  }
  throw new Error("Required control missing");
}
function select(value: OutreachAudience) {
  const control = find(
    render().tree,
    (_props, type) => type === OutreachAudienceFilter,
  );
  (control.onChange as (value: OutreachAudience) => void)(value);
}
beforeEach(() => {
  driver.values = [];
  driver.index = 0;
  driver.version = 1;
  driver.calls = [];
  driver.results = {};
});

it("keeps date and audience filters above categories and creation in the Outreach heading", () => {
  const { tree, markup } = render();
  const filters = find(
    tree,
    (props) => props["aria-label"] === "Outreach filters",
  );
  const controls = filters.children as ReactNode;
  expect(
    find(controls, (props) => props["aria-label"] === "From"),
  ).toBeDefined();
  expect(find(controls, (props) => props["aria-label"] === "To")).toBeDefined();
  expect(
    find(controls, (_props, type) => type === OutreachAudienceFilter),
  ).toBeDefined();
  const create = find(
    tree,
    (candidate) => candidate.onCreate === props.onCreate,
  );
  (create.onCreate as () => void)();
  expect(props.onCreate).toHaveBeenCalled();
  expect(markup.indexOf('aria-label="Outreach filters"')).toBeLessThan(
    markup.indexOf('aria-label="Campaign categories"'),
  );
  expect(markup).toContain('aria-label="Search outreach"');
});

it("keeps the client selector and query contracts in the Figma Outreach toolbar", () => {
  const scope = createElement(
    "select",
    { "aria-label": "Engagement client scope" },
    createElement("option", {}, "Synthetic client"),
  );
  const { markup } = render("synthetic-client", scope);
  expect(markup).toContain("<h1>Outreach</h1>");
  expect(markup.indexOf('aria-label="Outreach filters"')).toBeLessThan(
    markup.indexOf('aria-label="Engagement client scope"'),
  );
  expect(markup.indexOf('aria-label="Engagement client scope"')).toBeLessThan(
    markup.indexOf('aria-label="Campaign categories"'),
  );
  expect(markup).toContain("More filters");
  expect(markup).not.toContain('aria-label="Engagement destinations"');
  expect(driver.calls.map((call) => call.key)).toEqual([
    "engagement.outreach.records",
    "engagement.campaigns",
    "engagement.sessions",
  ]);
});

it("retains the unsupported audience notice once outside its compact group with accessible linkage", () => {
  driver.version = undefined;
  const { markup } = render();
  expect(markup).toContain('aria-describedby="outreach-audience-availability"');
  expect(markup).toContain('id="outreach-audience-availability"');
  expect(markup.match(/awaiting the Core update/g)).toHaveLength(1);
  expect(markup.match(/disabled=""/g)).toHaveLength(2);
  expect(markup).toContain('aria-label="Search outreach"');
  expect(markup).toContain('aria-label="Campaign categories"');
});

it("All preserves existing sources and omits the selector; Client and External send both canonical selectors", () => {
  render();
  expect(driver.calls.every((call) => !("direction" in call.input.query))).toBe(
    true,
  );
  expect(
    driver.calls.find((call) => call.key === "engagement.sessions")?.enabled,
  ).toBe(true);
  for (const direction of ["to-clients", "on-behalf"] as const) {
    select(direction);
    const result = render();
    for (const call of driver.calls.filter(
      (call) => call.key !== "engagement.sessions",
    )) {
      expect(call.input.query.direction).toBe(direction);
      expect(call.enabled).toBe(true);
    }
    expect(
      driver.calls.find((call) => call.key === "engagement.sessions"),
    ).toMatchObject({ enabled: false });
    expect(
      driver.calls.find((call) => call.key === "engagement.sessions")?.input
        .query,
    ).not.toHaveProperty("direction");
    expect(result.markup).toContain(
      "Campaign sessions are outside this audience filter",
    );
    expect(result.markup).toContain("not population totals");
  }
});
it("changing audience resets both cursors and session offset, including returning to All", () => {
  render();
  driver.values[5] = "campaign-page";
  driver.values[6] = "record-page";
  driver.values[7] = 100;
  select("to-clients");
  render();
  expect(driver.calls.every((call) => !call.input.query.cursor)).toBe(true);
  expect(
    driver.calls.find((call) => call.key === "engagement.sessions")?.input.query
      .offset,
  ).toBe(0);
  driver.values[5] = "filtered-page";
  select("all");
  render();
  expect(
    driver.calls.every(
      (call) => !call.input.query.cursor && !call.input.query.direction,
    ),
  ).toBe(true);
});
it("capability removal never downgrades a selected audience into an unlabeled All read", () => {
  select("to-clients");
  driver.version = undefined;
  const result = render();
  expect(
    driver.calls.every((call) => !call.enabled && !call.input.query.direction),
  ).toBe(true);
  expect(result.markup).toContain("Select All audiences");
  select("all");
  render();
  expect(driver.calls[0]?.enabled).toBe(true);
});
it("does not filter loaded records by guessed type/client and does not expose wrong-client results", () => {
  select("to-clients");
  driver.results["engagement.outreach.records"] = {
    loading: false,
    data: {
      items: [
        {
          id: "r1",
          title: "Producer-selected record",
          type: "campaign",
          status: "draft",
          hasWorkflow: false,
          client: null,
        },
      ],
      nextCursor: "continue",
    },
  };
  const result = render();
  expect(result.markup).toContain("Producer-selected record");
  expect(result.markup).toContain("Next outreach records");
  const changed = render("11111111-1111-4111-8111-111111111111");
  expect(changed.markup).not.toContain("Producer-selected record");
  expect(changed.markup).toContain("does not match this client scope");
});
it("retains empty continuation pages and canonical errors without falling back to sessions", () => {
  select("on-behalf");
  driver.results["engagement.campaigns"] = {
    loading: false,
    data: { items: [], nextCursor: "more" },
  };
  expect(render().markup).toContain("Next campaigns");
  driver.results["engagement.campaigns"] = {
    loading: false,
    error: new Error("Read denied"),
  };
  expect(render().markup).toContain("Read denied");
  expect(
    driver.calls.find((call) => call.key === "engagement.sessions")?.enabled,
  ).toBe(false);
});
it("displays disabled Client/External controls while keeping All usable", () => {
  const markup = renderToStaticMarkup(
    createElement(OutreachAudienceFilter, {
      value: "all",
      supported: false,
      onChange: vi.fn(),
    }),
  );
  expect(markup.match(/disabled=""/g)).toHaveLength(2);
  expect(markup).toContain("awaiting the Core update");
});
