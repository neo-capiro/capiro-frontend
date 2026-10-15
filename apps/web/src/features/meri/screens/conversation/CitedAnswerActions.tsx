import { Button } from "@capiro/ui/button";
import styles from "../../cited-answer.module.css";

export type CopyStatus = "idle" | "copied" | "unavailable";
type SampleSource = { id: string; label: string; detail: string };

/** Answer actions (Copy, Sources; unavailable Retry/Fork/Helpful) and the sample sources disclosure. */
export function CitedAnswerActions({
  copyStatus,
  onCopy,
  sources,
  sourcesOpen,
  selectedSource,
  onToggleSources,
}: {
  copyStatus: CopyStatus;
  onCopy: () => void;
  sources: readonly SampleSource[];
  sourcesOpen: boolean;
  selectedSource: string | null;
  onToggleSources: () => void;
}) {
  return (
    <>
      <div className={styles.messageActions} aria-label="Answer actions">
        <Button type="button" variant="ghost" onClick={onCopy}>
          {copyStatus === "copied" ? "Copied" : "Copy"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onToggleSources}
          aria-expanded={sourcesOpen}
          aria-controls="sample-sources"
        >
          Sources
        </Button>
        {["Retry", "Fork", "Helpful"].map((label) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            disabled
            title={`${label} requires a connected, authorized conversation`}
            className={styles.unavailable}
          >
            {label}
          </Button>
        ))}
        <span className="sr-only" role="status">
          {copyStatus === "unavailable"
            ? "Copy unavailable in this browser"
            : ""}
        </span>
      </div>
      {sourcesOpen && (
        <section
          id="sample-sources"
          className={styles.sourcePanel}
          aria-label="Sample source references"
        >
          <h3>Sample sources</h3>
          <p>
            These references are design fixtures. No linked source record or
            current authorization is available.
          </p>
          <ul>
            {sources.map((source) => (
              <li
                key={source.id}
                className={
                  selectedSource === source.id
                    ? styles.selectedSource
                    : undefined
                }
              >
                <strong>{source.label}</strong>
                <span>{source.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
