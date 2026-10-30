import { Temporal } from "temporal-polyfill";
import { instantDay } from "@/shared/portfolio/date/civil";
import type { Activity } from "./contracts";

export function activityDayLabel(day: string, today: string) {
  if (day === today) return "Today";
  if (day === Temporal.PlainDate.from(today).subtract({ days: 1 }).toString())
    return "Yesterday";
  return Temporal.PlainDate.from(day).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Keep the feed's native order, including any pinned entries. Consecutive
// local-day groups never silently reorder a server-provided record.
export function groupActivityDays(items: Activity[], zone: string) {
  const groups: { day: string; items: Activity[] }[] = [];
  for (const item of items) {
    const day = instantDay(item.occurredAt, zone);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

export function activityKindPresentation(kind: string) {
  const known: Record<string, { glyph: string; icon?: string }> = {
    email: { glyph: "✉", icon: "mail" },
    note: { glyph: "✎", icon: "sticky-note" },
    meeting: { glyph: "▦", icon: "users" },
    call: { glyph: "◔", icon: "phone" },
    outreach: { glyph: "➤" },
    commitment: { glyph: "⚑" },
    document: { glyph: "▤", icon: "file-text" },
    insight: { glyph: "✓" },
  };
  return (
    (Object.hasOwn(known, kind) ? known[kind] : undefined) ?? { glyph: "·" }
  );
}

// Title Case: capitalize first letter of each word
export function activityKindDisplay(kind: string) {
  return kind
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
