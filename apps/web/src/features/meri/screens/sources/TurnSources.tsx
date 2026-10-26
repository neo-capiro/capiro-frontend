import type { SourceEvidence } from "@capiro/meri-contracts";
import { Sources, SourcesContent, SourcesTrigger } from "@capiro/ui/sources";
import { SourceCard } from "../../ui/SourceCard";
import styles from "../../cited-answer.module.css";

const observedDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
  timeZoneName: "short",
});

/** Saved provenance only. SourceEvidence does not provide current access or source contents. */
export function TurnSources({
  sources,
  historyIncomplete,
}: {
  sources: readonly SourceEvidence[];
  historyIncomplete: boolean;
}) {
  if (sources.length === 0)
    return (
      <p className={styles.sourceAvailability}>
        {historyIncomplete
          ? "No source references in the loaded updates."
          : "No source references were provided."}
      </p>
    );

  return (
    <Sources className={styles.savedSources}>
      <SourcesTrigger
        count={sources.length}
        className={styles.savedSourcesTrigger}
      >
        <span>Saved references · {sources.length}</span>
        <span className={styles.savedSourcesChevron} aria-hidden />
      </SourcesTrigger>
      <p className={styles.savedSourcesCaption}>Source preview unavailable</p>
      <p>
        Saved references do not confirm current access. No live links or
        excerpts are available.
      </p>
      <SourcesContent className={styles.sourceDetails}>
        <ol aria-label="Saved source references">
          {sources.map((source, index) => (
            <li key={index}>
              <SourceCard
                source={{
                  id: source.sourceId,
                  title: `Saved reference ${index + 1}`,
                  meta: `Observed ${observedDate.format(new Date(source.observedAt))}`,
                  summary:
                    "A saved source reference was attached to this answer. Its title and content are not available here.",
                }}
                action={null}
              />
            </li>
          ))}
        </ol>
      </SourcesContent>
      {historyIncomplete && (
        <p>
          Some saved reference details are unavailable. This does not mean the
          answer had no sources.
        </p>
      )}
    </Sources>
  );
}
