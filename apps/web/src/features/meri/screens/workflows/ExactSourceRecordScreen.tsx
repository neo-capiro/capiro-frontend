import { Notice } from "../../ui/Notice";
import { LinkAction } from "../../ui/LinkAction";
import { ToolingPage } from "./ToolingPage";
import styles from "./screens.module.css";

export type ExactSourceRecordView = {
  title: string;
  passage: string;
  /** Applied scope, calendar bounds, fiscal period, revision and freshness. */
  provenance: readonly string[];
  coverageHref?: string | undefined;
  extractionHref?: string | undefined;
};

/** 12.22 Exact source record: the permitted revision and passage behind one claim. */
export function ExactSourceRecordScreen({
  view,
  backHref,
  unavailable,
}: {
  view: ExactSourceRecordView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Source record"
      description="Current permitted source, exact revision and the passage that supports the claim"
      backHref={backHref}
      unavailable={unavailable}
    >
      <article
        className={styles.sourceRecord}
        aria-labelledby="source-record-title"
      >
        <h2 id="source-record-title">{view.title}</h2>
        <blockquote>{view.passage}</blockquote>
        {view.provenance.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </article>
      <Notice title="Only this checked evidence supports the displayed claim">
        Partial bodies, unresolved revisions and unreviewed extraction remain
        visible. Opening a source rechecks the current grant; these
        demonstration records do not open a live source.
      </Notice>
      <div className={styles.stack}>
        <LinkAction
          variant="outline"
          href={view.coverageHref}
          unavailable={unavailable}
        >
          Back to coverage
        </LinkAction>
        <LinkAction
          variant="ghost"
          href={view.extractionHref}
          unavailable={unavailable}
        >
          File extraction details
        </LinkAction>
      </div>
    </ToolingPage>
  );
}
