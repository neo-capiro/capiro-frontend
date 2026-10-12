"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import {
  objectiveDestinationQuery,
  requireObjectiveDestination,
} from "../../../shared/capiro/operations/engagement-objective-destination";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { ActionButton, Panel, StatusPanel } from "../../../shared/module-ui";
import styles from "./engagement.module.css";
export function ObjectiveOutreachDestination() {
  const params = useSearchParams();
  const version = params.get("objectiveVersion") ?? "";
  const selected = objectiveDestinationQuery.safeParse({
    clientId: params.get("clientId"),
    objectiveId: params.get("objectiveId"),
    objectiveVersion: /^[1-9]\d*$/.test(version) ? Number(version) : 0,
  });
  const session = z.uuid().safeParse(params.get("session"));
  const enabled = selected.success && session.success;
  const query = useCapiroQuery(
    "engagement.objectiveDestination",
    {
      params: { sessionId: session.success ? session.data : "" },
      query: selected.success
        ? selected.data
        : { clientId: "", objectiveId: "", objectiveVersion: 0 },
    },
    { enabled },
  );
  let error = query.error;
  let current = undefined;
  if (enabled && query.data) {
    try {
      current = requireObjectiveDestination(
        query.data,
        session.data,
        selected.data,
      );
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause
          : new Error("Objective destination unavailable.");
    }
  }
  if (!enabled)
    return (
      <section role="alert">
        <h1>Objective destination unavailable</h1>
        <p>
          An exact client, Objective version and existing Outreach session are
          required.
        </p>
      </section>
    );
  return (
    <section className={styles.stack}>
      <h1>Objective Outreach destination</h1>
      <Link
        href={`/portfolio/${selected.data.clientId}/objectives?objective=${selected.data.objectiveId}`}
      >
        Back to current Objective
      </Link>
      <p>
        This is a fresh read-only observation, not a saved association or
        permission for a later action.
      </p>
      <StatusPanel loading={query.loading} error={error} onRetry={query.reload}>
        {current && (
          <Panel title={current.session.title ?? "Existing Outreach session"}>
            <p>
              Objective version {current.destination.objectiveVersion} ·
              immutable revision {current.destination.objectiveRevisionId}
            </p>
            <p>
              Session {current.destination.resourceId} · state version{" "}
              {current.destination.destinationStateVersion}
            </p>
            <p>Client sponsor: {current.destination.clientId}</p>
            <h2>{current.spec.goal.topic ?? "Topic not set"}</h2>
            <p>{current.spec.goal.goal ?? "Campaign goal not set"}</p>
            <p>
              {current.spec.goal.objective ?? "Campaign objective text not set"}
            </p>
            <p>
              Readiness:{" "}
              {current.readiness.blockers.join(", ") || "No reported blockers"}
            </p>
          </Panel>
        )}
      </StatusPanel>
      <ActionButton onClick={query.reload} disabled={query.loading}>
        Recheck current Objective destination
      </ActionButton>
      <p>
        Objective-bound creation, durable associations, Strategy, Planner and
        Workspace destinations remain unavailable.
      </p>
    </section>
  );
}
