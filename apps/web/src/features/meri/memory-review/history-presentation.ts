import type { HistoryPage } from "./owner-history";

/** Historical headings describe this version, never borrow the current record's label. */
export function historyVersionTitle(entry: HistoryPage["entries"][number]) {
  const title = entry.title.trim();
  const machine =
    /^(?:user|meri|system|agent|learning-signal):/i.test(title) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      title,
    );
  return title && !machine
    ? title
    : entry.status === "current"
      ? "Current version"
      : "Superseded version";
}

/** Display only; canonical ISO6 timestamps and revision strings remain untouched. */
export function historyTime(value: string) {
  return (
    new Date(value).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }) + " UTC"
  );
}
