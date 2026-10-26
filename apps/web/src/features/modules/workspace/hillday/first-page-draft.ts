import {
  firstPage,
  type HillDayDocument,
} from "../../../../shared/capiro/operations/workspace-schemas";

type FirstPage = NonNullable<HillDayDocument["firstPage"]>;
export type SummaryColumn = HillDayDocument["summaryColumns"][number];
export const summaryColumns =
  firstPage.shape.hiddenColumns.unwrap().element.options;
export const summaryCellLimits = firstPage.shape.rows.unwrap().element.shape;
type EditableDocument = Pick<
  HillDayDocument,
  "id" | "updatedAt" | "cover" | "firstPage" | "summary"
>;
export type FirstPageDraft = ReturnType<typeof captureFirstPage>;

/** Capture the displayed revision once; later reads must not silently adopt it. */
export function captureFirstPage(document: EditableDocument) {
  const captured = structuredClone({
    id: document.id,
    updatedAt: document.updatedAt,
    cover: document.cover,
    firstPage: document.firstPage,
    summary: document.summary,
  });
  return {
    captured,
    title: captured.cover.title,
    dateline: captured.cover.dateline,
    rows: structuredClone(captured.summary),
    hiddenColumns: [...(captured.firstPage?.hiddenColumns ?? [])],
  };
}

export function editSummaryCell(
  draft: FirstPageDraft,
  meetingId: string,
  column: SummaryColumn,
  value: string,
): FirstPageDraft {
  if (!draft.captured.summary.some((row) => row.meetingId === meetingId))
    throw new Error("This meeting is not in the displayed document.");
  return {
    ...draft,
    rows: draft.rows.map((row) =>
      row.meetingId === meetingId ? { ...row, [column]: value } : row,
    ),
  };
}

export function visibleSummaryColumns(draft: FirstPageDraft) {
  return summaryColumns.filter(
    (column) => !draft.hiddenColumns.includes(column),
  );
}

export function toggleSummaryColumn(
  draft: FirstPageDraft,
  column: SummaryColumn,
): FirstPageDraft {
  const hidden = new Set(draft.hiddenColumns);
  if (hidden.has(column)) hidden.delete(column);
  else if (hidden.size < summaryColumns.length - 1) hidden.add(column);
  else return draft;
  return {
    ...draft,
    hiddenColumns: summaryColumns.filter((key) => hidden.has(key)),
  };
}

/** Full replacement payload, with only deliberately changed values added. */
export function firstPageChanges(draft: FirstPageDraft): FirstPage | null {
  const original = draft.captured;
  const result: FirstPage = structuredClone(original.firstPage ?? {});
  let changed = false;
  for (const key of ["title", "dateline"] as const) {
    if (draft[key] !== original.cover[key]) {
      result[key] = draft[key];
      changed = true;
    }
  }
  for (const row of draft.rows) {
    const before = original.summary.find(
      (item) => item.meetingId === row.meetingId,
    );
    if (!before)
      throw new Error("This meeting is not in the displayed document.");
    for (const column of summaryColumns) {
      if (row[column] === before[column]) continue;
      const rows = (result.rows ??= []);
      let override = rows.find((item) => item.meetingId === row.meetingId);
      if (!override) rows.push((override = { meetingId: row.meetingId }));
      override[column] = row[column];
      changed = true;
    }
  }
  const wasHidden = original.firstPage?.hiddenColumns ?? [];
  if (
    summaryColumns.some(
      (key) => wasHidden.includes(key) !== draft.hiddenColumns.includes(key),
    )
  ) {
    result.hiddenColumns = [...draft.hiddenColumns];
    changed = true;
  }
  return changed ? result : null;
}
