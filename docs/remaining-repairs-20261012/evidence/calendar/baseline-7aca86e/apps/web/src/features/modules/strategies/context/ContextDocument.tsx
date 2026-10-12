"use client";

import { useState } from "react";
import type { StrategyContextDocument } from "../../../../shared/capiro/operations/strategies-context";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  SelectInput,
} from "../../../../shared/module-ui";
import styles from "../strategies.module.css";

export function ContextDocument({
  document,
  onClose,
  onSaved,
}: {
  document: StrategyContextDocument;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [action, setAction] = useState<"archive" | "approve" | "reassign">();
  const [strategyId, setStrategyId] = useState("");
  const strategies = useCapiroQuery(
    "strategies.list",
    {},
    { enabled: action === "reassign" },
  );
  const archive = useCapiroMutation("strategies.context.archive");
  const approve = useCapiroMutation("strategies.context.approve");
  const reassign = useCapiroMutation("strategies.context.reassign");
  const pending = archive.pending || approve.pending || reassign.pending;
  async function apply() {
    try {
      if (action === "archive")
        await archive.run({ params: { id: document.id } });
      else if (action === "approve")
        await approve.run({
          params: { id: document.id },
          body: { expectedChecksum: document.checksum },
        });
      else if (action === "reassign")
        await reassign.run({
          params: { id: document.id },
          body: { expectedChecksum: document.checksum, strategyId },
        });
      onSaved();
      onClose();
    } catch {
      /* Preserve the displayed source checksum on failed review. */
    }
  }
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !pending) onClose();
        }}
        title={document.title}
        description={`${document.scope} context · ${document.templateKey}`}
        footer={
          <>
            <ActionButton onClick={onClose}>Close</ActionButton>
            <ActionButton
              disabled={document.state !== "active"}
              onClick={() => setAction("approve")}
            >
              Mark as reviewed source
            </ActionButton>
            {document.scope === "strategy" && (
              <ActionButton onClick={() => setAction("reassign")}>
                Change strategy association
              </ActionButton>
            )}
            <ActionButton
              disabled={
                document.state === "archived" || document.state === "superseded"
              }
              onClick={() => setAction("archive")}
            >
              Archive document
            </ActionButton>
          </>
        }
      >
        <div className={styles.form}>
          <Badge tone={document.stale ? "warning" : "neutral"}>
            {document.state}
            {document.stale ? " · Stale" : ""}
          </Badge>
          <p className={styles.muted}>
            Checksum {document.checksum.slice(0, 12)} · Updated{" "}
            {new Date(document.updatedAt).toLocaleString()}
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              fontSize: 13,
              lineHeight: 1.65,
            }}
          >
            {document.content}
          </pre>
        </div>
      </Modal>
      <Modal
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open && !pending) setAction(undefined);
        }}
        title={
          action === "approve"
            ? "Mark as reviewed source?"
            : action === "archive"
              ? "Archive context document?"
              : "Change strategy association"
        }
        description={
          action === "approve"
            ? "An authorized reviewer creates a new revision with this source checksum."
            : action === "archive"
              ? "Archived context leaves active grounding but remains in history."
              : "Reassignment creates a new revision scoped to the chosen strategy."
        }
        footer={
          <>
            <ActionButton
              disabled={pending}
              onClick={() => setAction(undefined)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              primary
              disabled={pending || (action === "reassign" && !strategyId)}
              onClick={apply}
            >
              {pending ? "Saving…" : "Confirm"}
            </ActionButton>
          </>
        }
      >
        <div className={styles.form}>
          <p>{document.title}</p>
          {action === "reassign" && (
            <Field label="Strategy" htmlFor="context-reassign-strategy">
              <SelectInput
                id="context-reassign-strategy"
                value={strategyId}
                onValueChange={setStrategyId}
                options={[
                  { value: "", label: "Choose strategy" },
                  ...(strategies.data ?? [])
                    .filter(
                      (strategy) =>
                        strategy.clientId === document.clientId &&
                        strategy.id !== document.scopeRef,
                    )
                    .map((strategy) => ({
                      value: strategy.id,
                      label: strategy.title,
                    })),
                ]}
              />
            </Field>
          )}
          {(archive.error || approve.error || reassign.error) && (
            <p role="alert" className={styles.error}>
              {(archive.error ?? approve.error ?? reassign.error)?.message}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
