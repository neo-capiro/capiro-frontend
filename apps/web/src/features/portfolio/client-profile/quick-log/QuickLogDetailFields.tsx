"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { scopedObjectivesSchema } from "@/features/portfolio/objectives/public";
import type { QuickLogInput } from "./contracts";
import styles from "./quick-log-dialog.module.css";

function localDateTime(instant: string) {
  const date = new Date(instant);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
type DetailDraft = {
  scope: string;
  when: string;
  dueDate: string;
  direction: string;
  selectedObjectiveId: string;
};
const blankDraft = (scope: string): DetailDraft => ({
  scope,
  when: "",
  dueDate: "",
  direction: "",
  selectedObjectiveId: "",
});

export function useQuickLogDetailFields(
  clientId: string,
  open: boolean,
  pending?: QuickLogInput,
) {
  const api = useApi();
  const identity = useIdentity();
  const scope = JSON.stringify([
    identity.data?.tenant?.id,
    identity.data?.user.id,
    clientId,
  ]);
  const [stored, setStored] = useState(() => blankDraft(scope));
  const draft = stored.scope === scope ? stored : blankDraft(scope);
  const update = (change: Partial<DetailDraft>) =>
    setStored((previous) => ({
      ...(previous.scope === scope ? previous : blankDraft(scope)),
      ...change,
    }));
  const objectives = useQuery({
    queryKey: [
      "quick-log-objectives",
      identity.data?.tenant?.id,
      identity.data?.user.id,
      clientId,
    ],
    enabled:
      open && Boolean(identity.data?.tenant?.id && identity.data.user.id),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `clients/${encodeURIComponent(clientId)}/objectives`,
        scopedObjectivesSchema(clientId),
        { signal },
      ),
  });

  function read(form: FormData) {
    const whenValue = String(form.get("occurredAt") ?? "");
    const dueValue = String(form.get("dueDate") ?? "");
    const requestedObjectiveId = String(form.get("objectiveId") ?? "");
    const selectedObjective = objectives.data?.find(
      (objective) => objective.id === requestedObjectiveId,
    );
    if (requestedObjectiveId && !selectedObjective)
      throw new Error(
        "The selected Objective is no longer available for this client. Refresh the list before saving.",
      );
    const occurredAt = whenValue ? new Date(whenValue) : null;
    const dueAt = dueValue ? new Date(`${dueValue}T23:59:59`) : null;
    if (
      (occurredAt && !Number.isFinite(occurredAt.getTime())) ||
      (dueAt && !Number.isFinite(dueAt.getTime()))
    )
      throw new Error("Enter a valid activity date and due date.");
    const counterparty = String(form.get("counterparty") ?? "").trim();
    return {
      ...(occurredAt ? { occurredAt: occurredAt.toISOString() } : {}),
      ...(dueAt ? { dueAt: dueAt.toISOString() } : {}),
      ...(draft.direction ? { direction: draft.direction } : {}),
      ...(counterparty ? { counterparty } : {}),
      ...(selectedObjective
        ? {
            objectiveId: selectedObjective.id,
            objectiveVersion: selectedObjective.version,
          }
        : {}),
    };
  }

  function fields(kind: string, disabled: boolean) {
    const currentDirection = pending?.direction ?? draft.direction;
    const currentObjectiveId =
      pending?.objectiveId ?? draft.selectedObjectiveId;
    const currentWhen = pending?.occurredAt
      ? localDateTime(pending.occurredAt)
      : draft.when;
    const currentDue = pending?.dueAt
      ? localDateTime(pending.dueAt).slice(0, 10)
      : draft.dueDate;
    return (
      <>
        {(kind === "commitment" || kind === "request") && (
          <div className={styles.obligationFields}>
            <label>
              Who owes it (optional)
              <select
                name="direction"
                aria-label="Who owes it"
                value={currentDirection}
                disabled={disabled}
                onChange={(event) => update({ direction: event.target.value })}
              >
                <option value="">Not specified</option>
                <option value="we_owe">We owe</option>
                <option value="they_owe">They owe</option>
              </select>
            </label>
            <label>
              Counterparty (optional)
              <input
                name="counterparty"
                aria-label="Counterparty"
                maxLength={300}
                disabled={disabled}
                defaultValue={pending?.counterparty ?? ""}
                placeholder="Name or team"
              />
            </label>
            <label>
              Due (optional)
              <input
                type="date"
                name="dueDate"
                aria-label="Due date"
                value={currentDue}
                disabled={disabled}
                onChange={(event) => update({ dueDate: event.target.value })}
              />
              <small>
                {pending?.dueAt
                  ? `Saved due time: ${new Date(pending.dueAt).toLocaleString()}`
                  : "Due at 11:59 p.m. in your local time."}
              </small>
            </label>
          </div>
        )}
        <div className={styles.timeObjectiveFields}>
          <label>
            When
            <input
              type="datetime-local"
              name="occurredAt"
              aria-label="When"
              value={currentWhen}
              disabled={disabled}
              onChange={(event) => update({ when: event.target.value })}
            />
            {!currentWhen && (
              <small>Leave blank to record the time when saved.</small>
            )}
          </label>
          <label>
            Objective (optional)
            <select
              name="objectiveId"
              aria-label="Objective"
              value={currentObjectiveId}
              disabled={disabled || objectives.isPending || objectives.isError}
              onChange={(event) =>
                update({ selectedObjectiveId: event.target.value })
              }
            >
              <option value="">No objective</option>
              {objectives.data?.map((objective) => (
                <option key={objective.id} value={objective.id}>
                  {objective.outcome || "Untitled objective"}
                </option>
              ))}
              {currentObjectiveId &&
                !objectives.data?.some(
                  (objective) => objective.id === currentObjectiveId,
                ) && (
                  <option value={currentObjectiveId}>
                    Previously selected Objective
                  </option>
                )}
            </select>
            {objectives.isError && (
              <small>
                Objective choices are unavailable. You can save without a link.
              </small>
            )}
          </label>
        </div>
      </>
    );
  }

  return {
    scope,
    fields,
    read,
    onKindChange: (nextKind: string) => {
      if (nextKind !== "commitment" && nextKind !== "request") {
        update({ dueDate: "", direction: "" });
      }
    },
    reset: () => setStored(blankDraft(scope)),
  };
}
