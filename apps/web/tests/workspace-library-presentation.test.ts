import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { DocumentsLibrary } from "../src/features/modules/workspace/WorkspaceLibrary";

type Select = {
  "aria-label": string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
};
const h = vi.hoisted(() => ({
  states: [] as unknown[],
  index: 0,
  selects: [] as Select[],
  buttons: [] as { children: ReactNode; onClick?: () => void }[],
  queries: [] as { query: Record<string, unknown> }[],
  nextCursor: "opaque+/continuation==" as string | null,
  rowStatus: "draft",
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = h.index++;
    if (index === h.states.length) h.states.push(initial);
    return [
      h.states[index],
      (next: unknown) => {
        h.states[index] =
          typeof next === "function" ? next(h.states[index]) : next;
      },
    ];
  },
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (
    _operation: string,
    input: { query: Record<string, unknown> },
  ) => {
    h.queries.push(input);
    return {
      data: {
        items: [
          {
            id: "synthetic-newsletter",
            kind: "draft",
            name: "Synthetic newsletter",
            blueprint: "Newsletter",
            status: h.rowStatus,
            owner: { name: "Synthetic owner", initials: "SO" },
            updatedAt: "2026-10-27T00:00:00Z",
          },
        ],
        nextCursor: h.nextCursor,
      },
      loading: false,
      reload: vi.fn(),
    };
  },
}));
vi.mock("../src/features/modules/workspace/LibraryClientFilter", () => ({
  LibraryClientFilter: () => null,
}));
vi.mock("../src/shared/module-ui", () => ({
  SelectInput: (props: Select) => {
    h.selects.push(props);
    return createElement(
      "select",
      { "aria-label": props["aria-label"] },
      props.options.map((option) =>
        createElement(
          "option",
          { key: option.value, value: option.value },
          option.label,
        ),
      ),
    );
  },
  ActionButton: (props: { children: ReactNode; onClick?: () => void }) => {
    h.buttons.push(props);
    return createElement("button", null, props.children);
  },
  Badge: ({ children, tone }: { children: ReactNode; tone: string }) =>
    createElement("span", { "data-tone": tone }, children),
  DataTable: ({
    rows,
    columns,
  }: {
    rows: { id: string }[];
    columns: { key: string; render: (row: { id: string }) => ReactNode }[];
  }) =>
    createElement(
      "table",
      null,
      createElement(
        "tbody",
        null,
        rows.map((row) =>
          createElement(
            "tr",
            { key: row.id },
            columns.map((column) =>
              createElement("td", { key: column.key }, column.render(row)),
            ),
          ),
        ),
      ),
    ),
  StatusPanel: ({ children }: { children: ReactNode }) => children,
  TextInput: () => null,
}));
const render = () => {
  h.index = 0;
  h.selects = [];
  h.buttons = [];
  return renderToStaticMarkup(
    createElement(DocumentsLibrary, { onOpen: vi.fn() }),
  );
};
beforeEach(() => {
  h.states = [];
  h.index = 0;
  h.selects = [];
  h.buttons = [];
  h.queries = [];
  h.nextCursor = "opaque+/continuation==";
  h.rowStatus = "draft";
});

it("presents document types and selects the canonical draft kind for newsletters", () => {
  const html = render();
  expect(html).toContain('aria-label="Filter documents by type"');
  const types = h.selects.find(
    (select) => select["aria-label"] === "Filter documents by type",
  )!;
  expect(types.options).toEqual([
    { value: "all", label: "Type · All" },
    { value: "hillday", label: "Hill Day" },
    { value: "draft", label: "Documents (includes newsletters)" },
  ]);
  types.onValueChange("draft");
  const selected = render();
  expect(h.queries.at(-1)?.query.kind).toBe("draft");
  expect(selected).toContain("Synthetic newsletter");
  expect(selected).toContain("Newsletter");
  expect(h.queries.some((input) => input.query.kind === "newsletter")).toBe(
    false,
  );
});

it("uses display labels without changing status filters, badge tones or unknown statuses", () => {
  const statuses = [
    ["draft", "Draft", "warning"],
    ["generating", "Generating", "neutral"],
    ["generated", "Generated", "success"],
    ["partial", "Partial", "warning"],
    ["delivered", "Delivered", "success"],
    ["complete", "Complete", "success"],
    ["future-status", "future-status", "neutral"],
    ["toString", "toString", "neutral"],
  ] as const;
  for (const [wire, label, tone] of statuses) {
    h.rowStatus = wire;
    expect(render()).toContain(`<span data-tone="${tone}">${label}</span>`);
  }
  const status = h.selects.find(
    (select) => select["aria-label"] === "Filter documents by status",
  )!;
  expect(status.options).toEqual([
    { value: "", label: "Status · Any" },
    ...statuses.slice(0, 6).map(([value, label]) => ({ value, label })),
  ]);
  status.onValueChange("generating");
  render();
  expect(h.queries.at(-1)?.query.status).toBe("generating");
});

it("keeps continuation opaque and resets it when the document type changes", () => {
  render();
  h.buttons.find((button) => button.children === "Load older")!.onClick!();
  render();
  expect(h.queries.at(-1)?.query.cursor).toBe("opaque+/continuation==");
  expect(
    h.buttons.some((button) => button.children === "Newest documents"),
  ).toBe(true);
  h.selects
    .find((select) => select["aria-label"] === "Filter documents by type")!
    .onValueChange("hillday");
  render();
  expect(h.queries.at(-1)?.query).toMatchObject({
    kind: "hillday",
    cursor: undefined,
  });
  expect(
    h.buttons.some((button) => button.children === "Newest documents"),
  ).toBe(false);
  h.nextCursor = null;
  render();
  expect(h.buttons.some((button) => button.children === "Load older")).toBe(
    false,
  );
});
