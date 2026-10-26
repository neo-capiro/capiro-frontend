import type {
  ResearchDashboardLayout,
  ResearchDashboardWidget,
  ResearchDashboardWidgetKind,
} from "../../../../shared/capiro/operations/research-share-schemas";

/**
 * Pure layout operations for the client dashboard designer. The Core service
 * re-validates every saved layout with the same rules (12 columns, at most 40
 * widgets, no overlap, phone order covers every widget exactly once).
 */
export const GRID_COLUMNS = 12;
export const MAX_WIDGETS = 40;
export const MAX_ROWS = 200;

export type WidgetSetting = {
  key: string;
  label: string;
  input: "text" | "textarea" | "number";
};
export type WidgetDefinition = {
  kind: ResearchDashboardWidgetKind;
  label: string;
  description: string;
  w: number;
  h: number;
  minW: number;
  minH: number;
  settings: readonly WidgetSetting[];
};

const limitSetting: WidgetSetting = {
  key: "limit",
  label: "Rows to show",
  input: "number",
};
export const WIDGET_CATALOG: readonly WidgetDefinition[] = [
  {
    kind: "header",
    label: "Header",
    description: "Portfolio name, who it was prepared for and the as-of date.",
    w: 12,
    h: 2,
    minW: 6,
    minH: 2,
    settings: [
      {
        key: "title",
        label: "Title (defaults to the portfolio name)",
        input: "text",
      },
      { key: "subtitle", label: "Subtitle", input: "text" },
    ],
  },
  {
    kind: "key_totals",
    label: "Key totals",
    description: "Compatible totals by fiscal year and funding stage.",
    w: 6,
    h: 3,
    minW: 3,
    minH: 2,
    settings: [],
  },
  {
    kind: "funding_table",
    label: "Funding table",
    description: "Each subject's contribution to the totals.",
    w: 12,
    h: 5,
    minW: 6,
    minH: 3,
    settings: [limitSetting],
  },
  {
    kind: "client_fit",
    label: "Client fit",
    description: "The recipient's own fit score for this portfolio.",
    w: 6,
    h: 3,
    minW: 3,
    minH: 2,
    settings: [],
  },
  {
    kind: "changes",
    label: "Recent changes",
    description: "Membership and financial changes up to the snapshot.",
    w: 6,
    h: 4,
    minW: 4,
    minH: 3,
    settings: [limitSetting],
  },
  {
    kind: "subjects",
    label: "Subjects",
    description: "What the portfolio tracks and how each subject is counted.",
    w: 6,
    h: 4,
    minW: 4,
    minH: 3,
    settings: [],
  },
  {
    kind: "sources",
    label: "Sources",
    description: "How many source documents the figures rest on.",
    w: 6,
    h: 3,
    minW: 3,
    minH: 2,
    settings: [],
  },
  {
    kind: "snapshot_comparison",
    label: "Snapshot comparison",
    description: "Totals against the previous snapshot, when one exists.",
    w: 6,
    h: 3,
    minW: 4,
    minH: 2,
    settings: [],
  },
  {
    kind: "commentary",
    label: "Commentary",
    description: "Your own notes for the recipient.",
    w: 6,
    h: 3,
    minW: 3,
    minH: 2,
    settings: [
      { key: "title", label: "Heading", input: "text" },
      { key: "text", label: "Text", input: "textarea" },
    ],
  },
  {
    kind: "image",
    label: "Firm mark",
    description: "Your firm's name, shown when branding is on for the link.",
    w: 3,
    h: 2,
    minW: 2,
    minH: 2,
    settings: [{ key: "caption", label: "Caption", input: "text" }],
  },
];

export function widgetDefinition(
  kind: ResearchDashboardWidgetKind,
): WidgetDefinition {
  const found = WIDGET_CATALOG.find((d) => d.kind === kind);
  if (!found) throw new Error(`Unknown widget kind ${kind}`);
  return found;
}

export function emptyLayout(): ResearchDashboardLayout {
  return { columns: GRID_COLUMNS, widgets: [], phoneOrder: [] };
}

/** A sensible starting point: header, totals and fit, the funding table, then changes and subjects. */
export function defaultLayout(): ResearchDashboardLayout {
  const widgets: ResearchDashboardWidget[] = [
    { id: "header", kind: "header", x: 0, y: 0, w: 12, h: 2, settings: {} },
    { id: "totals", kind: "key_totals", x: 0, y: 2, w: 6, h: 3, settings: {} },
    { id: "fit", kind: "client_fit", x: 6, y: 2, w: 6, h: 3, settings: {} },
    {
      id: "funding",
      kind: "funding_table",
      x: 0,
      y: 5,
      w: 12,
      h: 5,
      settings: {},
    },
    { id: "changes", kind: "changes", x: 0, y: 10, w: 6, h: 4, settings: {} },
    { id: "subjects", kind: "subjects", x: 6, y: 10, w: 6, h: 4, settings: {} },
  ];
  return {
    columns: GRID_COLUMNS,
    widgets,
    phoneOrder: widgets.map((w) => w.id),
  };
}

export function overlaps(
  a: Pick<ResearchDashboardWidget, "x" | "y" | "w" | "h">,
  b: Pick<ResearchDashboardWidget, "x" | "y" | "w" | "h">,
): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  );
}

export function bottomOf(widgets: readonly ResearchDashboardWidget[]): number {
  return widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
}

function fits(
  widgets: readonly ResearchDashboardWidget[],
  candidate: ResearchDashboardWidget,
): boolean {
  if (candidate.x < 0 || candidate.y < 0 || candidate.w < 1 || candidate.h < 1)
    return false;
  if (candidate.x + candidate.w > GRID_COLUMNS) return false;
  if (candidate.y + candidate.h > MAX_ROWS) return false;
  return widgets.every((w) => w.id === candidate.id || !overlaps(w, candidate));
}

function replace(
  layout: ResearchDashboardLayout,
  next: ResearchDashboardWidget,
): ResearchDashboardLayout {
  return {
    ...layout,
    widgets: layout.widgets.map((w) => (w.id === next.id ? next : w)),
  };
}

function newId(kind: ResearchDashboardWidgetKind): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${kind}-${random}`;
}

/** Appends a widget of this kind on the first free row, full default size. */
export function addWidget(
  layout: ResearchDashboardLayout,
  kind: ResearchDashboardWidgetKind,
  id = newId(kind),
): ResearchDashboardLayout {
  if (layout.widgets.length >= MAX_WIDGETS) return layout;
  if (layout.widgets.some((w) => w.id === id)) return layout;
  const definition = widgetDefinition(kind);
  const widget: ResearchDashboardWidget = {
    id,
    kind,
    x: 0,
    y: bottomOf(layout.widgets),
    w: definition.w,
    h: definition.h,
    settings: {},
  };
  return {
    ...layout,
    widgets: [...layout.widgets, widget],
    phoneOrder: [...layout.phoneOrder, id],
  };
}

/**
 * Moves a widget to the requested column and row. The column is clamped to the
 * grid; when the spot is taken, the widget settles on the first free row at or
 * below the requested one, so a drop never overlaps another widget.
 */
export function moveWidget(
  layout: ResearchDashboardLayout,
  id: string,
  x: number,
  y: number,
): ResearchDashboardLayout {
  const widget = layout.widgets.find((w) => w.id === id);
  if (!widget) return layout;
  const column = Math.min(Math.max(0, Math.round(x)), GRID_COLUMNS - widget.w);
  const row = Math.max(0, Math.round(y));
  for (let candidateY = row; candidateY < MAX_ROWS; candidateY += 1) {
    const candidate = { ...widget, x: column, y: candidateY };
    if (fits(layout.widgets, candidate)) return replace(layout, candidate);
  }
  return layout;
}

/** Resizes within the widget's minimums and the grid; a size that would overlap is refused. */
export function resizeWidget(
  layout: ResearchDashboardLayout,
  id: string,
  w: number,
  h: number,
): ResearchDashboardLayout {
  const widget = layout.widgets.find((x) => x.id === id);
  if (!widget) return layout;
  const definition = widgetDefinition(widget.kind);
  const candidate = {
    ...widget,
    w: Math.min(
      Math.max(definition.minW, Math.round(w)),
      GRID_COLUMNS - widget.x,
    ),
    h: Math.min(Math.max(definition.minH, Math.round(h)), MAX_ROWS - widget.y),
  };
  return fits(layout.widgets, candidate) ? replace(layout, candidate) : layout;
}

export function removeWidget(
  layout: ResearchDashboardLayout,
  id: string,
): ResearchDashboardLayout {
  return {
    ...layout,
    widgets: layout.widgets.filter((w) => w.id !== id),
    phoneOrder: layout.phoneOrder.filter((x) => x !== id),
  };
}

export function setWidgetSettings(
  layout: ResearchDashboardLayout,
  id: string,
  settings: Record<string, unknown>,
): ResearchDashboardLayout {
  const widget = layout.widgets.find((w) => w.id === id);
  return widget ? replace(layout, { ...widget, settings }) : layout;
}

/** Moves a widget one step earlier (-1) or later (+1) in the phone reading order. */
export function movePhoneOrder(
  layout: ResearchDashboardLayout,
  id: string,
  delta: -1 | 1,
): ResearchDashboardLayout {
  const order = normalizePhoneOrder(layout).phoneOrder.slice();
  const index = order.indexOf(id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= order.length) return layout;
  [order[index], order[target]] = [order[target]!, order[index]!];
  return { ...layout, phoneOrder: order };
}

/** Known ids keep their order; widgets missing from it follow in reading order (row, then column). */
export function normalizePhoneOrder(
  layout: ResearchDashboardLayout,
): ResearchDashboardLayout {
  const ids = new Set(layout.widgets.map((w) => w.id));
  const kept = layout.phoneOrder.filter(
    (id, index, all) => ids.has(id) && all.indexOf(id) === index,
  );
  const missing = layout.widgets
    .filter((w) => !kept.includes(w.id))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((w) => w.id);
  return { ...layout, phoneOrder: [...kept, ...missing] };
}

/** Widgets in phone reading order. */
export function widgetsForPhone(
  layout: ResearchDashboardLayout,
): ResearchDashboardWidget[] {
  const byId = new Map(layout.widgets.map((w) => [w.id, w] as const));
  return normalizePhoneOrder(layout)
    .phoneOrder.map((id) => byId.get(id))
    .filter((w): w is ResearchDashboardWidget => Boolean(w));
}

/** Mirrors the Core service's refusals so the designer can block an unsaveable layout up front. */
export function layoutProblems(layout: ResearchDashboardLayout): string[] {
  const problems: string[] = [];
  if (layout.columns !== GRID_COLUMNS)
    problems.push("The grid must have 12 columns.");
  if (!layout.widgets.length) problems.push("Add at least one widget.");
  if (layout.widgets.length > MAX_WIDGETS)
    problems.push(`At most ${MAX_WIDGETS} widgets are allowed.`);
  const ids = new Set<string>();
  for (const widget of layout.widgets) {
    if (ids.has(widget.id))
      problems.push(`Widget id ${widget.id} is used twice.`);
    ids.add(widget.id);
    if (!fits(layout.widgets, widget))
      problems.push(
        `${widgetDefinition(widget.kind).label} overlaps another widget or leaves the grid.`,
      );
  }
  const order = layout.phoneOrder;
  if (
    order.length !== layout.widgets.length ||
    new Set(order).size !== order.length ||
    order.some((id) => !ids.has(id))
  )
    problems.push("The phone order must list every widget exactly once.");
  return Array.from(new Set(problems));
}
