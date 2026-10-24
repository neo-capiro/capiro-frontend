import {
  associationLabels,
  type RetainedAssociation,
} from "./association-command";
import styles from "./association.module.css";

type ReviewProps = {
  value: RetainedAssociation;
  pending: boolean;
  busy: boolean;
  submit: () => void;
  discard: () => void;
  recover: () => void;
  acknowledge: () => void;
};

function SavedAssociationResult({
  value,
  busy,
  recover,
  acknowledge,
}: Pick<ReviewProps, "value" | "busy" | "recover" | "acknowledge">) {
  return (
    <section className={styles.review} aria-label="Saved association result">
      {value.receipt ? (
        <>
          <h3>Change confirmed</h3>
          <p role="status">
            {value.receipt.outcome === "unchanged"
              ? "The saved link already matched this request."
              : value.receipt.outcome === "linked"
                ? "Work linked to this Objective."
                : "Work unlinked from this Objective."}
          </p>
          <p className={styles.caption}>
            Confirmed {new Date(value.receipt.committedAt).toLocaleString()}.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={acknowledge}
          >
            Refresh and finish
          </button>
        </>
      ) : value.refusal ? (
        <>
          <h3>Change was not applied</h3>
          <p role="status">
            The server rejected this request. Refresh the current Objective
            before making another review.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={acknowledge}
          >
            Refresh and review again
          </button>
        </>
      ) : (
        <>
          <h3>Result not confirmed</h3>
          <p role="status">
            This request is saved. Check its result before making another
            change.
          </p>
          <button className="button" disabled={busy} onClick={recover}>
            Check saved result
          </button>
        </>
      )}
    </section>
  );
}

export function AssociationReview({
  value,
  pending,
  busy,
  submit,
  discard,
  recover,
  acknowledge,
}: ReviewProps) {
  const linking = value.command.action === "link";
  if (pending)
    return (
      <SavedAssociationResult
        value={value}
        busy={busy}
        recover={recover}
        acknowledge={acknowledge}
      />
    );
  return (
    <section
      className={styles.review}
      aria-label={linking ? "Review link" : "Review unlink"}
    >
      <h3>
        {linking ? "Link to this Objective" : "Unlink from this Objective"}
      </h3>
      {value.source && <strong>{value.source.title || "Untitled work"}</strong>}
      {!linking && (
        <p>
          {value.unlinkSummary
            ? associationLabels[value.unlinkSummary.kind]
            : "Selected linked work"}
          {" · "}
          <strong>
            {value.unlinkSummary?.title?.trim() || "Title unavailable"}
          </strong>
        </p>
      )}
      <p>
        {linking
          ? "This adds a durable link to the current Objective."
          : "This removes the selected relationship to this Objective. The work itself is retained."}
      </p>
      {value.command.action === "link" && value.command.cycles.length > 0 && (
        <ul>
          {value.command.cycles.map((cycle) => (
            <li key={JSON.stringify(cycle)}>
              FY{cycle.fiscalYear}
              {cycle.authorityTrack ? ` · ${cycle.authorityTrack}` : ""} · Human
              annotation
            </li>
          ))}
        </ul>
      )}
      <div className={styles.actions}>
        <button className="button" disabled={busy} onClick={discard}>
          Back to selection
        </button>
        <button className="button primary" disabled={busy} onClick={submit}>
          {busy
            ? "Saving…"
            : linking
              ? "Link to this Objective"
              : "Confirm unlink"}
        </button>
      </div>
    </section>
  );
}
