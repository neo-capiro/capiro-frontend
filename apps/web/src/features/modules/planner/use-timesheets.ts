"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { PlannerPerson } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { weekStart } from "./task-presentation";
import { type Timesheet } from "./TimesheetTables";
type Action = Timesheet["actions"][number];
export function useTimesheets({ me }: { me: PlannerPerson }) {
  const api = useCapiro();
  const [week, setWeek] = useState(() =>
      weekStart(new Date().toLocaleDateString("en-CA")),
    ),
    [userId, setUserId] = useState(me.id),
    [tab, setTab] = useState("timesheet"),
    [dialog, setDialog] = useState<
      "time" | "preferences" | "settings" | "reject" | "work" | "export" | null
    >(null),
    [notes, setNotes] = useState(""),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const query = useCapiroQuery(
      "planner.timesheet",
      { query: { week, userId } },
      { enabled: tab === "timesheet" },
    ),
    review = useCapiroQuery(
      "planner.timesheet.review",
      { query: { week } },
      { enabled: tab === "review" },
    );
  const sheet = query.data;
  const changeStatus = async (action: Action) => {
    if (!sheet) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.timesheet.status", {
        body: {
          week: sheet.weekOn,
          userId: sheet.userId,
          version: sheet.version,
          revision: sheet.revision,
          action,
          notes,
        },
      });
      setDialog(null);
      query.reload();
      review.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update timesheet.",
      );
    } finally {
      setBusy(false);
    }
  };
  const removeWork = async (work: {
    taskId: string | null;
    projectId: string | null;
  }) => {
    if (!sheet) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.timesheet.work", {
        body: {
          week: sheet.weekOn,
          userId: sheet.userId,
          version: sheet.version,
          revision: sheet.revision,
          action: "remove",
          work,
        },
      });
      query.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to remove work.",
      );
    } finally {
      setBusy(false);
    }
  };
  return {
    week,
    setWeek,
    userId,
    setUserId,
    tab,
    setTab,
    dialog,
    setDialog,
    notes,
    setNotes,
    error,
    busy,
    query,
    review,
    sheet,
    changeStatus,
    removeWork,
  };
}
