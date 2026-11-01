"use client";
import { useEffect, useState } from "react";
import { emptyStrategyIntake } from "@capiro/shared/strategy-intake";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { useSaveObjective } from "./mutations";
import {
  emptyFields,
  objectiveFieldsSchema,
  objectiveReadiness,
  sameObjectiveFields,
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
  onSaved: (record: Objective) => void;
}) {
  const identity = useIdentity();
  const [record, setRecord] = useState(objective);
  const [fields, setFields] = useState<ObjectiveFields>(
    objective ?? {
      ...emptyFields,
      strategyIntake: emptyStrategyIntake(
        identity.data?.user.clerkUserId ?? null,
      ),
    },
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
  const unsaved = !record || !sameObjectiveFields(fields, record);
  useEffect(() => {
    if (objective || record || !identity.data?.user.clerkUserId) return;
    const owner = identity.data.user.clerkUserId;
    setFields((current) =>
      current.strategyIntake && !current.strategyIntake.ownerUserId
        ? {
            ...current,
            strategyIntake: { ...current.strategyIntake, ownerUserId: owner },
          }
        : current,
    );
  }, [identity.data?.user.clerkUserId, objective, record]);

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
        fields.strategyIntake
          ? "Complete objective type, goal statement and owner."
          : "Complete outcome, government problem, ask type and minimum win.",
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
