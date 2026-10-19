import { describe, expect, it } from "vitest";
import type { PlannerTask } from "../../../shared/capiro/operations/planner-schemas";
import {
  dayLabel,
  filterTasks,
  minutesLabel,
  shiftDate,
  weekStart,
} from "./task-presentation";
function work(
  status: PlannerTask["status"],
  assigneeId: string | null,
  priority: PlannerTask["priority"],
) {
  return { status, assigneeId, priority } as PlannerTask;
}
describe("Planner view semantics", () => {
  it("keeps blocked tasks open and excludes completed tasks", () => {
    const blocked = work("blocked", null, "high"),
      completed = work("done", null, "high");
    expect(filterTasks([blocked, completed], "open", "all", "all")).toEqual([
      blocked,
    ]);
  });
  it("combines scope hints without treating an unassigned task as an arbitrary team member", () => {
    const assigned = work("todo", "user_one", "medium"),
      unassigned = work("todo", null, "medium");
    expect(
      filterTasks([assigned, unassigned], "open", "medium", "unassigned"),
    ).toEqual([unassigned]);
    expect(
      filterTasks([assigned, unassigned], "all", "all", "user_two"),
    ).toEqual([]);
  });
  it("keeps calendar arithmetic stable over daylight saving changes", () => {
    expect(shiftDate("2026-11-01", 1)).toBe("2026-11-02");
    expect(weekStart("2026-11-01")).toBe("2026-10-26");
    expect(dayLabel("2026-11-01")).toBe("Nov 1");
  });
  it("formats time as hours and minutes without rounding away work", () => {
    expect(minutesLabel(125)).toBe("2:05");
    expect(minutesLabel(0)).toBe("0:00");
  });
});
