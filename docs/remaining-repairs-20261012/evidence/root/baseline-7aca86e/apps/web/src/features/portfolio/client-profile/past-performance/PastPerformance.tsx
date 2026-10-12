"use client";
import { Button } from "@capiro/ui/button";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { profileActorKey, useProfileActor } from "../profile-access";
import { useSubmissionView } from "./submission-view";
import { useSubmissionRemoval } from "./useSubmissionRemoval";
import { RemoveSubmission } from "./RemoveSubmission";
import styles from "./past-performance.module.css";

export function PastPerformance({
  clientId,
}: {
  clientId: string;
  /** Compatibility only; confirmation names come from the current native client read. */
  clientName?: string;
}) {
  const identity = useIdentity();
  const actor = useProfileActor();
  return (
    <History
      key={`${clientId}:${profileActorKey(actor)}`}
      clientId={clientId}
      identityPending={identity.isPending || identity.isFetching}
      identityError={identity.error}
    />
  );
}

function History({
  clientId,
  identityPending,
  identityError,
}: {
  clientId: string;
  identityPending: boolean;
  identityError: Error | null;
}) {
  const current = useSubmissionView(clientId);
  const removal = useSubmissionRemoval(clientId, current.view);
  const pending = identityPending || current.pending;
  const error = identityError ?? current.error;
  const rows = current.view?.rows;
  return (
    <section className={styles.section} aria-label="Past performance">
      <header className={styles.header}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Past performance</p>
          <h2>Saved submissions</h2>
          <p className={styles.description}>
            Saved capability submissions and their recorded outcomes.
          </p>
        </div>
        <Button
          variant="outline"
          className={styles.action}
          disabled={pending || !current.actor}
          onClick={() => void current.refresh()}
        >
          Refresh history
        </Button>
      </header>
      <div className={styles.history}>
        <QueryState
          pending={pending}
          error={error}
          retry={current.actor ? () => void current.refresh() : undefined}
        />
        {!current.actor && !pending && (
          <p className={styles.description}>
            A current authorized session is required to inspect saved submission
            history.
          </p>
        )}
        {current.actor && !pending && !error && !rows && (
          <p className={styles.description}>
            Refresh the current client and saved history to continue. Archived
            or unavailable profiles cannot supply this history.
          </p>
        )}
        {rows && (
          <>
            <p className={styles.count}>
              {rows.length} saved{" "}
              {rows.length === 1 ? "submission" : "submissions"} shown
              {rows.length === 200 ? " · feed limit reached" : ""}.
            </p>
            {rows.length === 0 && (
              <p className={styles.description}>
                No saved submissions in this history feed.
              </p>
            )}
            <ul className={styles.list}>
              {rows.map((item) => (
                <li key={item.id}>
                  <div className={styles.record}>
                    <p className={styles.count}>
                      {item.fiscalYear} · {item.outcomeType}
                    </p>
                    <h3>{item.title}</h3>
                    {item.meta && (
                      <p className={styles.description}>{item.meta}</p>
                    )}
                    {item.outcome && (
                      <p className={styles.outcome}>{item.outcome}</p>
                    )}
                    {item.notes && (
                      <details className={styles.description}>
                        <summary>Saved notes</summary>
                        <p>{item.notes}</p>
                      </details>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    className={styles.action}
                    aria-label={`Remove submission: ${item.title}`}
                    onClick={() => removal.select(item.id)}
                  >
                    Remove…
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
        {removal.receipt && <p role="status">{removal.receipt}</p>}
      </div>
      <p className={styles.scope}>
        Removing a saved submission keeps its capability and documents.
      </p>
      <RemoveSubmission
        item={removal.item}
        clientName={removal.clientName}
        pending={removal.pending}
        error={removal.error}
        frozen={removal.frozen}
        onClose={removal.close}
        onConfirm={removal.confirm}
      />
    </section>
  );
}
