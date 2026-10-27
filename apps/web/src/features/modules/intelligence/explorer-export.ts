import type { ExplorerRecord } from "../../../shared/capiro/operations/intelligence-explorer";

export const explorerExportLimit = 10_000;

/** Export only a complete bounded result. Never label a partial page set "all". */
export async function collectExplorerExport(
  total: number,
  read: (page: number) => Promise<{ total: number; rows: ExplorerRecord[] }>,
) {
  if (!Number.isSafeInteger(total) || total < 0 || total > explorerExportLimit)
    throw new Error(
      `Narrow the filters to ${explorerExportLimit.toLocaleString()} records or fewer before exporting all matches.`,
    );
  const rows: ExplorerRecord[] = [];
  const ids = new Set<string>();
  for (let page = 1; rows.length < total; page += 1) {
    const result = await read(page);
    if (result.total !== total || result.rows.length === 0)
      throw new Error(
        "The results changed during export. Refresh and try again.",
      );
    for (const row of result.rows) {
      if (ids.has(row.id) || rows.length === total)
        throw new Error(
          "The results changed during export. Refresh and try again.",
        );
      ids.add(row.id);
      rows.push(row);
    }
  }
  return rows;
}

export function explorerCsv(rows: ExplorerRecord[]) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  const cell = (value: unknown) => {
    let text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    columns.map(cell).join(","),
    ...rows.map((row) =>
      columns
        .map((column) => cell(row[column as keyof ExplorerRecord]))
        .join(","),
    ),
  ].join("\r\n");
}
