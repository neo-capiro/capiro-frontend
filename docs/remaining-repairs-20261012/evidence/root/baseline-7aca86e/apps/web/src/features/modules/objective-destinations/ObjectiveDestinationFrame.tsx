"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ObjectiveDestinationQuery } from "../../../shared/capiro/operations/objective-destination-binding";
import {
  ActionButton,
  PageHeader,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./objective-destinations.module.css";
export function ObjectiveDestinationFrame({
  title,
  selected,
  loading,
  error,
  reload,
  children,
}: {
  title: string;
  selected: ObjectiveDestinationQuery;
  loading: boolean;
  error?: Error;
  reload: () => void;
  children: ReactNode;
}) {
  return (
    <section className={styles.screen}>
      <Link
        href={`/portfolio/${selected.clientId}/objectives?objective=${selected.objectiveId}`}
      >
        Back to current Objective
      </Link>
      <PageHeader
        title={title}
        description="View an existing resource for this saved Objective. Creating resources or saving associations is not available here."
      />
      <StatusPanel loading={loading} error={error} onRetry={reload}>
        {children}
      </StatusPanel>
      <ActionButton onClick={reload} disabled={loading}>
        Recheck current Objective destination
      </ActionButton>
    </section>
  );
}
export function ObjectiveObservation({
  destination,
}: {
  destination: ObjectiveDestinationQuery & {
    resourceId: string;
    objectiveRevisionId: string;
  };
}) {
  return (
    <details className={styles.provenance}>
      <summary>Objective and resource details</summary>
      <p>
        Objective version {destination.objectiveVersion} · immutable revision{" "}
        {destination.objectiveRevisionId}
      </p>
      <p>Resource {destination.resourceId}</p>
      <p>Client {destination.clientId}</p>
      <p>Access is checked again whenever this destination is opened.</p>
    </details>
  );
}
export function ObjectiveDestinationUnavailable() {
  return (
    <section role="alert">
      <h1>Objective destination unavailable</h1>
      <p>
        An exact client, saved Objective version and existing resource are
        required.
      </p>
    </section>
  );
}
