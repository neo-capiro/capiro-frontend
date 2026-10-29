"use client";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { federalTimelineQuery } from "../../../../shared/capiro/operations/federal-evidence";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import { useResearchLocation } from "../research/ResearchNavigation";
import { FederalEvidenceRevision } from "../research/FederalEvidenceRevision";
import styles from "../intelligence.module.css";

export function FederalEvidenceTimeline({ peCode }: { peCode: string }) {
  const { params, update } = useResearchLocation();
  const request = {
    peCode,
    limit: 25,
    cursor: params.get("changesEvidenceCursor") || undefined,
    knownAt: params.get("changesEvidenceKnownAt") || undefined,
  };
  const valid = federalTimelineQuery.safeParse(request).success;
  const query = useCapiroQuery(
    "defenseResearch.federalTimeline",
    { query: request },
    { enabled: valid },
  );
  return (
    <Panel
      title="Federal evidence revisions"
      description={`Recorded lifecycle events for ${peCode}. Before and after refer to each event's own revisions, independently qualified.`}
    >
      <form
        className={styles.toolbar}
        key={request.knownAt || "current"}
        onSubmit={(event) => {
          event.preventDefault();
          update({
            changesEvidenceKnownAt:
              String(
                new FormData(event.currentTarget).get("knownAt") || "",
              ).trim() || null,
            changesEvidenceCursor: null,
          });
        }}
      >
        <Field
          label="Known at (optional ISO date and time)"
          htmlFor="federal-evidence-known-at"
        >
          <TextInput
            id="federal-evidence-known-at"
            name="knownAt"
            defaultValue={request.knownAt || ""}
            placeholder="2026-10-27T12:00:00Z"
          />
        </Field>
        <ActionButton type="submit">Apply evidence time</ActionButton>
        <ActionButton
          type="button"
          onClick={() =>
            update({
              changesEvidenceKnownAt: null,
              changesEvidenceCursor: null,
            })
          }
        >
          Latest events
        </ActionButton>
        <ActionButton type="button" disabled={!valid} onClick={query.reload}>
          Refresh evidence
        </ActionButton>
      </form>
      <StatusPanel
        loading={query.loading}
        error={
          valid
            ? query.error
            : "Use a valid ISO date and time with a timezone, or leave Known at empty."
        }
        onRetry={query.reload}
      >
        {query.data && (
          <div className={styles.content}>
            <p>
              Up to 25 events per page. This is historical evidence, not a
              complete corpus or a reconstruction of downstream impact.
            </p>
            {!query.data.items.length && (
              <p>
                No recorded evidence events are available for this selection.
              </p>
            )}
            {query.data.items.map((event) => (
              <details key={event.id}>
                <summary>
                  {event.eventType} · {event.createdAt} ·{" "}
                  {event.billId || "Bill not supplied"}
                </summary>
                <p>
                  Event {event.id} ·{" "}
                  {event.canonicalPeCode || "PE not supplied"}
                  {event.historical ? " · Historical import" : ""}
                </p>
                <FederalEvidenceRevision
                  label="Before"
                  expectedRevision={event.previousRevisionId}
                  side={event.beforeEvidence}
                />
                <FederalEvidenceRevision
                  label="After"
                  expectedRevision={event.currentRevisionId}
                  side={event.afterEvidence}
                />
              </details>
            ))}
            <ActionButton
              disabled={!request.cursor}
              onClick={() => update({ changesEvidenceCursor: null })}
            >
              First evidence page
            </ActionButton>
            <ActionButton
              disabled={!query.data.hasMore || !query.data.nextCursor}
              onClick={() =>
                update({
                  changesEvidenceCursor: query.data?.nextCursor || null,
                })
              }
            >
              Older evidence events
            </ActionButton>
          </div>
        )}
      </StatusPanel>
    </Panel>
  );
}
