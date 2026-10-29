import type { BriefVersion } from "./contracts";
import { BriefSectionsView } from "./BriefSectionsView";
import styles from "./brief.module.css";
import { BriefDate } from "./BriefDate";

export function BriefDocument({
  title,
  version,
  onSource,
}: {
  title: string;
  version: BriefVersion;
  onSource: (index: number) => void;
}) {
  return (
    <article
      className={styles.document}
      aria-label={`Saved brief version ${version.versionNumber}`}
    >
      <p className={styles.notice}>
        A starting point for discussion. Review the saved evidence and
        information gaps before acting.
      </p>
      <p className="eyebrow">
        Federal strategy brief · Version {version.versionNumber} ·{" "}
        <BriefDate value={version.createdAt} />
      </p>
      <h2>{title}</h2>
      <BriefSectionsView sections={version.sections} onSource={onSource} />
      {!version.citations.length && (
        <p className="muted">
          No citations were saved with this version. This does not establish an
          absence of relevant evidence.
        </p>
      )}
    </article>
  );
}
