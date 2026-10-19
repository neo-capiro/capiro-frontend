"use client";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { WatchlistTopics } from "./WatchlistTopics";
import { WatchlistNotice } from "./WatchlistNotice";
import type { Watchlist, WatchlistDraft } from "./watchlist-contracts";
import styles from "./watchlist.module.css";

/** The existing targeting fields, with no transport or persistence lifecycle. */
export function WatchlistForm({
  record,
  draft,
  issueAreas,
  jurisdictions,
  editable,
  backend,
  pending,
  changed,
  unconfirmed,
  rejections,
  error,
  onChange,
  onSave,
  onReload,
}: {
  record: Watchlist;
  draft: WatchlistDraft;
  issueAreas: string[];
  jurisdictions: string[];
  editable: boolean;
  backend: TrackerBackend;
  pending?: "save" | "reload";
  changed: boolean;
  unconfirmed: boolean;
  rejections: string[];
  error?: Error;
  onChange: (update: (draft: WatchlistDraft) => WatchlistDraft) => void;
  onSave: () => void;
  onReload: () => void;
}) {
  const disabled = !editable || Boolean(pending) || unconfirmed;
  function toggle(
    field: "issueAreas" | "jurisdictions",
    value: string,
    checked: boolean,
  ) {
    onChange((current) => ({
      ...current,
      [field]: checked
        ? [...current[field], value]
        : current[field].filter((entry) => entry !== value),
    }));
  }
  return (
    <form
      className={`stack ${styles.form}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (editable && !pending && !changed && !unconfirmed) onSave();
      }}
    >
      {!editable && (
        <p role="status">
          An administrator can change shared targeting. You can review the
          current watchlist.
        </p>
      )}
      <fieldset className={`row ${styles.choices}`} disabled={disabled}>
        <legend>Issue areas</legend>
        {[...new Set([...issueAreas, ...draft.issueAreas])].map((area) => (
          <label className="row" key={area}>
            <input
              type="checkbox"
              checked={draft.issueAreas.includes(area)}
              onChange={(event) =>
                toggle("issueAreas", area, event.target.checked)
              }
            />
            {area}
          </label>
        ))}
      </fieldset>
      {backend === "intelligence" && (
        <fieldset className={`row ${styles.choices}`} disabled={disabled}>
          <legend>State coverage</legend>
          {[
            ...new Set([
              ...jurisdictions.filter((key) => key !== "US"),
              ...draft.jurisdictions,
            ]),
          ].map((key) => (
            <label className="row" key={key}>
              <input
                type="checkbox"
                checked={draft.jurisdictions.includes(key)}
                onChange={(event) =>
                  toggle("jurisdictions", key, event.target.checked)
                }
              />
              {key}
            </label>
          ))}
          <small>
            Federal coverage is retained. Add states to extend matching.
          </small>
        </fieldset>
      )}
      {Boolean(
        record.suggestedIssueAreas?.length ||
        record.suggestedJurisdictions?.length,
      ) && (
        <div className="row">
          <p className="muted">
            Profile suggestions:{" "}
            {[
              ...(record.suggestedIssueAreas ?? []),
              ...(record.suggestedJurisdictions ?? []),
            ].join(", ")}
          </p>
          <button
            className="button"
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange((current) => ({
                ...current,
                issueAreas: [
                  ...new Set([
                    ...current.issueAreas,
                    ...(record.suggestedIssueAreas ?? []),
                  ]),
                ],
                jurisdictions: [
                  ...new Set([
                    ...current.jurisdictions,
                    ...(record.suggestedJurisdictions ?? []),
                  ]),
                ],
              }))
            }
          >
            Use suggestions
          </button>
        </div>
      )}
      <WatchlistTopics
        topics={draft.topics}
        issueAreas={issueAreas}
        backend={backend}
        disabled={disabled}
        onChange={(topics) => onChange((current) => ({ ...current, topics }))}
      />
      {rejections.length > 0 && (
        <div role="alert">
          <p>
            Some entries were rejected. Other changes were saved. Review the
            retained edits before saving again.
          </p>
          <ul>
            {rejections.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {unconfirmed ? (
        <WatchlistNotice
          kind="unconfirmed"
          disabled={Boolean(pending)}
          onAction={onReload}
        />
      ) : (
        <QueryState error={error} />
      )}
      {changed && !unconfirmed && (
        <p role="status">
          Saved targeting changed. Reload saved values before saving your
          retained edits.
        </p>
      )}
      <div className={`formActions ${styles.actions}`}>
        {!unconfirmed && (
          <button
            className="button"
            type="button"
            disabled={Boolean(pending)}
            onClick={onReload}
          >
            Reload saved values
          </button>
        )}
        {editable && (
          <button
            className="button primary"
            disabled={Boolean(pending) || changed || unconfirmed}
          >
            {pending === "save" ? "Saving…" : "Save targeting"}
          </button>
        )}
      </div>
    </form>
  );
}
