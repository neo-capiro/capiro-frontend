import type { SavedVersion } from "../../../../shared/capiro/operations/workspace-documents";
import { SectionPreview } from "../rich-document/SectionPreview";
import {
  safeDocumentLines,
  unknownContentExplanations,
} from "./version-history";
import styles from "../workspace.module.css";
import presentation from "../ordinary-presentation.module.css";

export function SavedVersionDetail({ version }: { version: SavedVersion }) {
  const sections = version.snapshot?.config?.sectionContent ?? {};
  const documents = version.snapshot?.documents ?? [];
  const unknown = unknownContentExplanations(version);
  return (
    <section
      className={presentation.versionDetail}
      aria-label="Selected saved version"
    >
      <h3>{version.label ?? "Saved version"}</h3>
      <dl className={styles.versionFacts}>
        <dt>Saved</dt>
        <dd>{new Date(version.createdAt).toLocaleString()}</dd>
        <dt>Author</dt>
        <dd>{version.authorKind}</dd>
      </dl>
      {version.snapshot?.docTitle && <h4>{version.snapshot.docTitle}</h4>}
      {Object.entries(sections).map(([name, content]) => (
        <section key={name} aria-label={name}>
          <h4>{name}</h4>
          <SectionPreview value={content} />
        </section>
      ))}
      {documents.map((document) => {
        const lines = safeDocumentLines(document.body);
        return (
          <article key={document.id}>
            <h4>{document.name ?? "Untitled tab"}</h4>
            {lines ? (
              lines.map((line, index) => <p key={index}>{line}</p>)
            ) : (
              <p className={styles.secondary}>
                Unrecognised saved content is preserved read-only and is not
                rendered.
              </p>
            )}
          </article>
        );
      })}
      {unknown.length > 0 && (
        <details>
          <summary>Unrecognised saved content</summary>
          <ul>
            {unknown.map((item) => (
              <li key={item.label}>
                <strong>{item.label}</strong>: {item.detail}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
