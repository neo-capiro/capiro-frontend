"use client";

import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  StatusPanel,
  TextArea,
} from "../../../../../shared/module-ui";
import { SourceLink } from "../components";
import styles from "../legiwatch.module.css";

export type EvidenceKind = "news" | "budget" | "personnel" | "research";
export type EvidenceRef = {
  kind: EvidenceKind;
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
            {onSelect && (
              <ActionButton
                onClick={() =>
                  onSelect({
                    kind,
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
export function TrackEvidence({
  kind,
  id,
  version,
  saved,
  scope,
  onClose,
  onSaved,
}: {
  kind: Exclude<EvidenceKind, "research">;
  id: string;
  version: number;
  saved: boolean;
  scope: EvidenceScope;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState("");
  const mutation = useCapiroMutation("legiwatch.evidence.track");
  const save = async () => {
    if (!scope.folderId) return;
    try {
      await mutation.run({
        body: {
          ...scope,
          folderId: scope.folderId,
          kind,
          sourceId: id,
          expectedVersion: version,
          removed: saved,
          notes,
        },
      });
      onSaved();
      onClose();
    } catch {
      /* Keep the reviewed draft open. */
    }
  };
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !mutation.pending) onClose();
      }}
      title={saved ? "Remove saved evidence" : "Save to permitted folder"}
      footer={
        <ActionButton
          primary
          disabled={!scope.folderId || mutation.pending}
          onClick={() => void save()}
        >
          {mutation.pending
            ? "Saving…"
            : saved
              ? "Remove from folder"
              : "Save evidence"}
        </ActionButton>
      }
    >
      <p className={styles.description}>
        This updates the selected folder only. It does not activate monitoring
        or send a briefing.
      </p>
      <Field label="Notes" htmlFor="evidence-notes">
        <TextArea
          id="evidence-notes"
          value={notes}
          disabled={mutation.pending}
          maxLength={5000}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>
      {mutation.error && (
        <p role="alert" className={styles.error}>
          {mutation.error.message}
        </p>
      )}
    </Modal>
  );
}
