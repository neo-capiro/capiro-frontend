"use client";
import { useCapiroQuery } from "@/shared/capiro/queries";
import {
  requireSavedGenerationDiscovery,
  savedGenerationDiscoveryHref,
} from "@/shared/capiro/operations/objective-saved-generation";
import type { Objective } from "../contracts";
import { ObjectivePlannerAutomation } from "../ObjectivePlannerAutomation";
import styles from "./operational.module.css";

export function ObjectiveSavedGenerationCard({
  objective,
}: {
  objective: Objective;
}) {
  const query = {
    clientId: objective.clientId,
    objectiveId: objective.id,
    objectiveVersion: objective.version,
  };
  const read = useCapiroQuery("strategies.objectiveSavedGeneration", { query });
  let saved: ReturnType<typeof requireSavedGenerationDiscovery> | undefined;
  let error = read.error;
  if (!read.loading && !error && read.data) {
    try {
      saved = requireSavedGenerationDiscovery(read.data, query);
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause
          : new Error("Saved Strategy unavailable.");
    }
  }
  return (
    <section className={styles.panel} aria-label="Saved Strategy">
      <header className={styles.panelHead}>
        <h2>Saved Strategy</h2>
      </header>
      {read.loading && <p role="status">Checking saved generation…</p>}
      {error && (
        <p role="status">
          Saved Strategy is unavailable for this Objective version.
        </p>
      )}
      <button className="button" onClick={read.reload} disabled={read.loading}>
        Refresh saved generation
      </button>
      {saved && (
        <>
          <p>
            Your saved generation for Objective v
            {saved.selection.query.objectiveVersion}, saved{" "}
            {new Date(saved.savedAt).toLocaleString()}.
          </p>
          <a className="button" href={savedGenerationDiscoveryHref(saved)}>
            Review exact saved Strategy
          </a>
          <p className={styles.caption}>
            Later Strategy edits are separate. Reviewing this version creates no
            Planner work.
          </p>
          <ObjectivePlannerAutomation
            key={`${saved.selection.ids.generatedJobId}:${saved.selection.ids.strategyVersionId}`}
            selection={saved.selection}
          />
        </>
      )}
    </section>
  );
}
