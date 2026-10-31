"use client";

import { ActionButton, Modal } from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import type { EvidenceRef } from "./EvidenceActions";
import type { useEvidenceSelection } from "./use-evidence-selection";

export function EvidenceBasket({
  refs,
  onRemove,
  onClose,
  onBriefing,
}: {
  refs: readonly EvidenceRef[];
  onRemove: (id: string) => void;
  onClose: () => void;
  onBriefing: () => void;
}) {
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Local source basket"
      footer={
        <ActionButton primary disabled={!refs.length} onClick={onBriefing}>
          Review client briefing
        </ActionButton>
      }
    >
      <p className={styles.description}>
        Selecting evidence does not save a draft or send a briefing. Review the
        exact retained revisions before preparing a draft.
      </p>
      {refs.length ? (
        <div className={styles.list}>
          {refs.map((ref) => (
            <div key={`${ref.kind}:${ref.id}`} className={styles.listItem}>
              <strong>
                {ref.kind} · {ref.id}
              </strong>
              <span className={styles.description}>
                Revision {ref.revision}
              </span>
              <ActionButton onClick={() => onRemove(ref.id)}>
                Remove
              </ActionButton>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.description}>No sources selected.</p>
      )}
    </Modal>
  );
}

export function EvidenceBasketActions({
  selection,
}: {
  selection: ReturnType<typeof useEvidenceSelection>;
}) {
  return (
    <div className={styles.actions}>
      <ActionButton onClick={() => selection.setBasketOpen(true)}>
        Open local source basket ({selection.refs.length})
      </ActionButton>
      <ActionButton
        disabled={!selection.refs.length}
        onClick={() => selection.setBriefingOpen(true)}
      >
        Include in briefing
      </ActionButton>
    </div>
  );
}
