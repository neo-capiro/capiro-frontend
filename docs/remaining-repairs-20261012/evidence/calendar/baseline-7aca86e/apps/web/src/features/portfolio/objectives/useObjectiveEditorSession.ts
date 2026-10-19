"use client";
import { useState } from "react";
import { useSaveObjective } from "./mutations";
import {
  emptyFields,
  objectiveFieldsSchema,
  objectiveReadiness,
  type Objective,
  type ObjectiveFields,
} from "./contracts";
import type { ObjectiveAction } from "./writer";

export function useObjectiveEditorSession({
  clientId,
  objective,
  open = true,
  onSaved,
}: {
  clientId: string;
  objective?: Objective;
  open?: boolean;
  onSaved: () => void;
}) {
  const [record, setRecord] = useState(objective);
  const [fields, setFields] = useState<ObjectiveFields>(
    objective ?? emptyFields,
  );
  const [requestId] = useState(() => crypto.randomUUID());
  const [validation, setValidation] = useState("");
  const [confirming, setConfirming] = useState(false);
  const mutation = useSaveObjective(
    clientId,
    { fields, record, requestId },
    setRecord,
    onSaved,
    open,
  );
  const unsaved = (Object.keys(emptyFields) as (keyof ObjectiveFields)[]).some(
    (key) => fields[key] !== record?.[key],
  );

  function submit(action: ObjectiveAction) {
    if (mutation.isPending || !mutation.canWrite) return;
    const parsed = objectiveFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      setValidation(
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
      return;
    }
    if (action !== "save" && !objectiveReadiness(fields).isReady) {
      setValidation(
        "Complete outcome, government problem, ask type and minimum win.",
      );
      return;
    }
    setValidation("");
    if (action === "confirm_ready") setConfirming(true);
    else mutation.mutate(action);
  }

  return {
    fields,
    setFields,
    record,
    validation,
    confirming,
    setConfirming,
    mutation,
    submit,
    draftStatus: !record
      ? "Draft not saved yet"
      : unsaved
        ? "Unsaved changes"
        : "Draft saved",
  };
}

export type ObjectiveEditorSession = ReturnType<
  typeof useObjectiveEditorSession
>;
