import type { SourceEvidence } from "@capiro/meri-contracts";
import { Sources, SourcesContent, SourcesTrigger } from "@capiro/ui/sources";
import { ChevronDownIcon } from "lucide-react";
import styles from "../../cited-answer.module.css";

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
    <Sources className={styles.sourcePanel} defaultOpen>
      <SourcesTrigger count={sources.length} className={styles.citation}>
        <span>
          {sources.length === 1
            ? "1 saved source reference"
            : `${sources.length} saved source references`}
        </span>
        <ChevronDownIcon size={16} aria-hidden />
      </SourcesTrigger>
      <SourcesContent className={styles.sourceDetails}>
        <p>
          Source preview unavailable. Saved references do not confirm current
          access; source links and excerpts are not available here.
        </p>
        {historyIncomplete && (
          <p>More source references may exist in unloaded updates.</p>
        )}
        <ol aria-label="Saved source references">
          {sources.map((source, index) => (
            <li key={index}>
              <span>Reference {index + 1}</span>
              <dl>
                <div>
                  <dt>Source</dt>
                  <dd>{source.sourceId}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{source.sourceVersionId}</dd>
                </div>
                <div>
                  <dt>Observed</dt>
                  <dd>
                    <time dateTime={source.observedAt}>
                      {source.observedAt}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt>Source updated</dt>
                  <dd>
                    {source.sourceUpdatedAt ? (
                      <time dateTime={source.sourceUpdatedAt}>
                        {source.sourceUpdatedAt}
                      </time>
                    ) : (
                      "Not provided"
                    )}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </SourcesContent>
    </Sources>
  );
}
