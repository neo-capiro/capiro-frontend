import { ActionRow } from "./ActionRow";
import { ScopeTags } from "./ScopeTags";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec } from "./types";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

export type CodeAnalysisView = {
  description: string;
  conversation: {
    request: string;
    answer: string;
    sources: string;
    actions: readonly ActionSpec[];
  };
  artifact: {
    status: string;
    actions: readonly ActionSpec[];
    fileName: string;
    code: string;
    output: string;
    outputNote: string;
    files: readonly string[];
    filesAction: ActionSpec;
  };
};

/** 12.06 Code & reproducible analysis: read-only source, authorized output and reproducible files. */
export function CodeAnalysisScreen({
  view,
  backHref,
  unavailable,
}: {
  view: CodeAnalysisView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  const { conversation, artifact } = view;
  return (
    <ToolingPage
      title="Commitment analysis"
      description={view.description}
      backHref={backHref}
      unavailable={unavailable}
    >
      <div className={styles.split}>
        <section
          className={`${tooling.box} ${styles.conversation}`}
          data-tone="muted"
          aria-label="Associated conversation"
        >
          <h2 className={tooling.boxTitle}>Your request</h2>
          <p className={styles.body}>{conversation.request}</p>
          <h2 className={tooling.boxTitle}>Meri</h2>
          <p className={styles.body}>{conversation.answer}</p>
          <ScopeTags label="Answer sources" tags={[conversation.sources]} />
          <div className={styles.stack}>
            <ActionRow
              label="Conversation actions"
              actions={conversation.actions}
              unavailable={unavailable}
            />
          </div>
        </section>
        <section className={styles.codeArtifact} aria-label="Code artifact">
          <div className={styles.inline}>
            <ScopeTags label="Version status" tags={[artifact.status]} />
            <ActionRow
              label="Exact-version controls"
              actions={artifact.actions}
              unavailable={unavailable}
            />
          </div>
          <figure className={styles.code}>
            <figcaption>{artifact.fileName}</figcaption>
            <pre aria-label={`${artifact.fileName}, read only`}>
              {artifact.code}
            </pre>
          </figure>
          <section className={tooling.box} aria-labelledby="execution-result">
            <h2 id="execution-result" className={tooling.boxTitle}>
              Execution result
            </h2>
            <pre className={styles.output}>{artifact.output}</pre>
            <p className={tooling.caption}>{artifact.outputNote}</p>
          </section>
          <ul className={styles.files} aria-label="Reproducible outputs">
            {artifact.files.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
          <ActionRow
            label="Analysis files"
            actions={[artifact.filesAction]}
            unavailable={unavailable}
          />
        </section>
      </div>
    </ToolingPage>
  );
}
