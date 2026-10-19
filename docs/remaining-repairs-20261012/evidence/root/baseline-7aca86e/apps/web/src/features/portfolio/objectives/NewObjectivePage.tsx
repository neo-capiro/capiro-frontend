"use client";
import { useId } from "react";
import { ApiError } from "@/shared/portfolio/api/http";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  initials,
  useClient,
  type Client,
} from "@/features/portfolio/index/public";
import { ObjectiveFields } from "./ObjectiveFields";
import { ObjectiveReadiness } from "./ObjectiveReadiness";
import {
  ObjectiveEditorActions,
  ObjectiveEditorFeedback,
  ObjectiveReadyConfirmation,
} from "./ObjectiveEditorControls";
import { useObjectiveEditorSession } from "./useObjectiveEditorSession";
import styles from "./objective-intake.module.css";
import readinessStyles from "./objectives.module.css";

type Props = { clientId: string; onClose: () => void };

export function NewObjectivePage({ clientId, onClose }: Props) {
  const query = useClient(clientId);
  if (
    query.isPending ||
    query.error ||
    !query.data ||
    query.data.id !== clientId
  ) {
    const error =
      query.error ??
      (!query.isPending && query.data?.id !== clientId
        ? new ApiError(502, "The service did not confirm the selected client.")
        : null);
    return (
      <div className="page">
        <QueryState
          pending={query.isPending}
          error={error}
          retry={() => void query.refetch()}
        />
      </div>
    );
  }
  return (
    <ObjectiveIntake key={clientId} client={query.data} onClose={onClose} />
  );
}

function ObjectiveIntake({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const heading = useId();
  const cardHeading = useId();
  const session = useObjectiveEditorSession({
    clientId: client.id,
    onSaved: onClose,
  });
  return (
    <section className={`page ${styles.page}`} aria-labelledby={heading}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          session.submit("save");
        }}
      >
        <button
          className={styles.back}
          type="button"
          disabled={session.mutation.isPending}
          onClick={onClose}
        >
          ← Objectives
        </button>
        <header className={styles.heading}>
          <div className={styles.title}>
            <h1 id={heading}>New objective</h1>
            <span className={readinessStyles.readinessInfo} aria-hidden="true">
              i
            </span>
          </div>
          <button
            className={`button ${styles.headerSave}`}
            disabled={session.mutation.isPending || !session.mutation.canWrite}
          >
            Save draft
          </button>
        </header>
        <div className={styles.grid}>
          <section className={styles.card} aria-labelledby={cardHeading}>
            <header className={styles.cardHeader}>
              <h2 id={cardHeading}>Objective</h2>
              <span
                className={readinessStyles.readinessInfo}
                aria-hidden="true"
              >
                i
              </span>
            </header>
            <div className={styles.body}>
              <div className={styles.client}>
                <p className={styles.eyebrow}>Client</p>
                <div className={styles.clientChip}>
                  <span className={styles.avatar} aria-hidden="true">
                    {initials(client.name)}
                  </span>
                  <span className={styles.clientName}>{client.name}</span>
                  <small>Set from this profile</small>
                </div>
              </div>
              <ObjectiveFields
                fields={session.fields}
                onChange={session.setFields}
                disabled={session.mutation.isPending}
                presentation="page"
              />
              <ObjectiveEditorFeedback session={session} />
            </div>
            <footer className={styles.footer}>
              <p className={styles.draftStatus}>{session.draftStatus}</p>
              <ObjectiveEditorActions session={session} />
            </footer>
          </section>
          <aside className={styles.rail} aria-label="Objective readiness">
            <ObjectiveReadiness fields={session.fields} />
          </aside>
        </div>
      </form>
      <ObjectiveReadyConfirmation session={session} />
    </section>
  );
}
