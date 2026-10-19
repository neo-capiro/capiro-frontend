import {
  Artifact,
  ArtifactActions,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@capiro/ui/artifact";
import { FileText } from "lucide-react";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import type { ArtifactFile } from "./types";
import styles from "./artifacts.module.css";

/** Adopted Artifact element: file identity with Open and exact-version Download. */
export function ArtifactCard({
  file,
  unavailable,
}: {
  file: ArtifactFile;
  unavailable: string;
}) {
  return (
    <Artifact className={styles.card} role="group" aria-label={file.name}>
      <ArtifactHeader className={styles.cardHeader}>
        <FileText aria-hidden />
        <div className={styles.cardMeta}>
          <ArtifactTitle className={styles.cardName}>{file.name}</ArtifactTitle>
          <ArtifactDescription className={styles.caption}>
            {file.detail}
          </ArtifactDescription>
        </div>
      </ArtifactHeader>
      <ArtifactActions className={ui.row}>
        <LinkAction
          variant="outline"
          href={file.openHref}
          unavailable={unavailable}
        >
          Open
        </LinkAction>
        <button type="button" className={ui.ghost} disabled title={unavailable}>
          Download
        </button>
      </ArtifactActions>
    </Artifact>
  );
}
