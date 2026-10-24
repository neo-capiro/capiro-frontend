"use client";
import { useState } from "react";
import { useCapiroQuery } from "@/shared/capiro/queries";
import {
  requireObjectiveAssociationPage,
  type ObjectiveAssociationPage,
  type ObjectiveAssociationItem,
} from "@/shared/capiro/operations/objective-associations";
import type { Objective } from "../contracts";
import { associationLabels, type AssociationKind } from "./association-command";
import styles from "./association.module.css";

function useAssociationInventory(objective: Objective, enabled: boolean) {
  const [prior, setPrior] = useState<ObjectiveAssociationPage>();
  const cursor = prior?.nextCursor ?? undefined;
  const read = useCapiroQuery(
    "objectives.operational.associations",
    {
      params: { clientId: objective.clientId },
      query: {
        schemaVersion: 1,
        objectiveId: objective.id,
        limit: 25,
        ...(cursor ? { cursor } : {}),
      },
    },
    { enabled },
  );
  let value: ObjectiveAssociationPage | undefined,
    error = read.error;
  if (!read.loading && !error && read.data) {
    try {
      value = requireObjectiveAssociationPage(
        read.data,
        objective,
        { limit: 25, cursor },
        prior,
      );
    } catch {
      error = new Error("The linked work changed. Refresh this list.");
    }
  }
  return {
    value,
    error,
    loading: read.loading,
    next: () => {
      if (value?.nextCursor && !read.loading) setPrior(value);
    },
    refresh: () => {
      setPrior(undefined);
      read.reload();
    },
  };
}

function AssociationRows({
  items,
  disabled,
  onUnlink,
}: {
  items: ObjectiveAssociationItem[];
  disabled: boolean;
  onUnlink: (item: ObjectiveAssociationItem) => void;
}) {
  return (
    <ul className={styles.links}>
      {items.map((item) => (
        <li key={item.associationId}>
          <div>
            <strong>{item.resource.title || "Title unavailable"}</strong>
            <small>
              {
                associationLabels[
                  item.resource.selection.kind as AssociationKind
                ]
              }{" "}
              · Human link · Objective v{item.linkedRevision.version}
            </small>
            {item.cycles.length > 0 && (
              <small>
                {item.cycles
                  .map(
                    (cycle) =>
                      `FY${cycle.fiscalYear}${cycle.authorityTrack ? ` · ${cycle.authorityTrack}` : ""}`,
                  )
                  .join("; ")}
              </small>
            )}
          </div>
          <button
            type="button"
            className="button"
            disabled={disabled}
            onClick={() => onUnlink(item)}
            aria-label={`Unlink ${item.resource.title || "work"}`}
          >
            Unlink
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AssociationInventory({
  objective,
  enabled,
  disabled,
  onUnlink,
}: {
  objective: Objective;
  enabled: boolean;
  disabled: boolean;
  onUnlink: (item: ObjectiveAssociationItem) => void;
}) {
  const query = useAssociationInventory(objective, enabled);
  const page = query.value;
  return (
    <section className={styles.inventory} aria-label="Manually linked work">
      <div className={styles.sectionHead}>
        <h3>Manually linked work</h3>
        <button
          type="button"
          className="button"
          disabled={!enabled || disabled || query.loading}
          onClick={query.refresh}
        >
          Refresh list
        </button>
      </div>
      {query.loading && <p role="status">Loading linked work…</p>}
      {query.error && <p role="alert">{query.error.message}</p>}
      {page?.pageCoverage === "partial" && (
        <p className={styles.caption}>
          Some links on this page could not be verified. Only currently readable
          work is shown.
        </p>
      )}
      {page?.items.length === 0 && (
        <p>
          {page.pageCoverage === "complete"
            ? "No manually linked work on this page."
            : "No readable links on this page."}
        </p>
      )}
      {page && (
        <AssociationRows
          items={page.items}
          disabled={disabled}
          onUnlink={onUnlink}
        />
      )}
      {page?.nextCursor && (
        <button
          type="button"
          className="button"
          disabled={disabled || query.loading}
          onClick={query.next}
        >
          Next linked work
        </button>
      )}
    </section>
  );
}
