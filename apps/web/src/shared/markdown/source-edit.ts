export type MarkdownAction =
  | "bold"
  | "italic"
  | "heading"
  | "list"
  | "checklist";
export type SourceEdit = {
  from: number;
  to: number;
  insert: string;
  start: number;
  end: number;
};
export function formatMarkdownRange(
  value: string,
  from: number,
  to: number,
  action: MarkdownAction,
): SourceEdit {
  if (action === "bold" || action === "italic") {
    const mark = action === "bold" ? "**" : "*";
    const selected = value.slice(from, to) || "text";
    return {
      from,
      to,
      insert: mark + selected + mark,
      start: from + mark.length,
      end: from + mark.length + selected.length,
    };
  }
  const start = from === 0 ? 0 : value.lastIndexOf("\n", from - 1) + 1;
  const stop = value.indexOf("\n", Math.max(from, to - 1));
  const end = stop < 0 ? value.length : stop;
  const prefix = { heading: "### ", list: "- ", checklist: "- [ ] " }[action];
  const insert = value
    .slice(start, end)
    .split("\n")
    .map((line) => prefix + line)
    .join("\n");
  return {
    from: start,
    to: end,
    insert,
    start: start + prefix.length,
    end: start + insert.length,
  };
}
export function linkMarkdownRange(
  value: string,
  from: number,
  to: number,
  target: string,
): SourceEdit {
  const label = (value.slice(from, to) || "Link text").replace(
    /([\\\[\]])/g,
    "\\$1",
  );
  const url = target.replace(/[()]/g, (character) =>
    character === "(" ? "%28" : "%29",
  );
  return {
    from,
    to,
    insert: `[${label}](${url})`,
    start: from + 1,
    end: from + 1 + label.length,
  };
}
export function editedMarkdown(
  value: string,
  edit: SourceEdit,
  maximum: number,
): string | null {
  const next = value.slice(0, edit.from) + edit.insert + value.slice(edit.to);
  return next.length <= maximum ? next : null;
}
