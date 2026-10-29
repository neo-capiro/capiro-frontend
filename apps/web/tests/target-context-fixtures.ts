import type { TargetContextPage } from "../src/shared/capiro/operations/target-context";
export const contextIds = {
  clientId: "10000000-0000-4000-8000-000000000001",
  targetId: "20000000-0000-4000-8000-000000000001",
  otherTargetId: "20000000-0000-4000-8000-000000000002",
  strategyId: "30000000-0000-4000-8000-000000000001",
};
export const contextItemId = (index: number) =>
  `40000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
export function contextPage(
  section: "objectives" | "steps",
  count = 1,
  start = 1,
): TargetContextPage {
  const envelope = {
    schemaVersion: 1 as const,
    clientId: contextIds.clientId,
    targetId: contextIds.targetId,
    nextCursor: count === 25 ? contextItemId(start + 24) : null,
  };
  const ids = Array.from({ length: count }, (_, i) => contextItemId(i + start));
  return section === "objectives"
    ? {
        ...envelope,
        section,
        items: ids.map((id) => ({
          id,
          outcome: `Saved outcome ${id}`,
          status: "ready",
          version: 3,
          askType: "funding",
          minimumWin: "Saved minimum win",
        })),
      }
    : {
        ...envelope,
        section,
        items: ids.map((id) => ({
          id,
          strategyId: contextIds.strategyId,
          strategyTitle: "Saved strategy",
          title: `Saved step ${id}`,
          kind: "action",
          subject: "ask",
          status: "in_progress",
          startsOn: "2026-10-29",
          endsOn: null,
          openEnded: true,
        })),
      };
}
