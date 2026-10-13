/** Local typed-JSON editor state; request admission belongs to the shared receiver. */
export type WorkbookDraft = Readonly<{ title: string; sheets: string }>;

export const workbookExample = `[
  {
    "name": "Summary",
    "rows": [
      [{"value":"Item"}, {"value":"Amount"}],
      [{"value":"Example"}, {"value":25}],
      [{"value":"Total"}, {"formula":"=SUM(B2:B2)"}]
    ]
  }
]`;

export const emptyWorkbookDraft = (): WorkbookDraft => ({
  title: "",
  sheets: workbookExample,
});

export function workbookProblem(draft: WorkbookDraft): string | null {
  if (!draft.title.trim()) return "Enter a workbook title.";
  if (draft.title.length > 200)
    return "Use a title of 200 characters or fewer.";
  try {
    const parsed: unknown = JSON.parse(draft.sheets);
    if (!Array.isArray(parsed)) return "Enter a JSON array of sheets.";
  } catch {
    return "Enter valid JSON for the complete sheet array.";
  }
  return null;
}

/** JSON syntax is local guidance, not validation of the published content schema. */
export function workbookContent(draft: WorkbookDraft): unknown {
  const problem = workbookProblem(draft);
  if (problem) throw new Error(problem);
  return {
    operation: "create_excel",
    format: "xlsx",
    title: draft.title,
    content: { sheets: JSON.parse(draft.sheets) as unknown },
  };
}
