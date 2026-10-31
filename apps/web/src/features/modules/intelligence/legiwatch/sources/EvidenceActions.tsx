"use client";

import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Modal,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { SourceLink } from "../components";
import styles from "../legiwatch.module.css";

export type EvidenceKind = "news" | "budget" | "personnel" | "research";
export type EvidenceRef = {
  kind: "research";
  id: string;
  revision: string;
  locator: string;
};
export type EvidenceScope = {
  folderId?: string;
  clientId?: string;
  sessionKey?: string;
};
export function ExactEvidence({
  kind,
  id,
  scope,
  onClose,
  onSelect,
}: {
  kind: EvidenceKind;
  id: string;
  scope: EvidenceScope;
  onClose: () => void;
  onSelect?: (ref: EvidenceRef) => void;
}) {
  const source = useCapiroQuery("legiwatch.evidence.source", {
    params: { kind, id },
    query: scope,
  });
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Exact source"
      side="right"
    >
      <StatusPanel
        loading={source.loading}
        error={source.error}
        onRetry={source.reload}
      >
        {source.data && (
          <div className={styles.form}>
            <h2>{source.data.title}</h2>
            <div className={styles.meta}>
              <Badge>{source.data.authority}</Badge>
              <Badge>
                {source.data.complete
                  ? "Complete retained text"
                  : "Partial retained text"}
              </Badge>
            </div>
            <p className={styles.description}>
              Observed {source.data.observedAt} · Rights: {source.data.rights} ·
              Revision {source.data.revision}
            </p>
            <SourceLink href={source.data.sourceUrl}>
              Open attributed source
            </SourceLink>
            <p className={styles.briefText}>
              {source.data.text || "No retained source text is available."}
            </p>
            {onSelect && kind === "research" && (
              <ActionButton
                onClick={() =>
                  onSelect({
                    kind: "research",
                    id: source.data!.id,
                    revision: source.data!.revision,
                    locator: "retained-source",
                  })
                }
              >
                Include in local source basket
              </ActionButton>
            )}
          </div>
        )}
      </StatusPanel>
    </Modal>
  );
}
