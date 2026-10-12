"use client";

import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
} from "../../../shared/module-ui";
import styles from "./strategies.module.css";

export function LinkWork({
  strategyId,
  nodeId,
  onClose,
  onSaved,
}: {
  strategyId: string;
  nodeId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const documents = useCapiroQuery("workspace.documents", {});
  const [documentId, setDocumentId] = useState("");
  const link = useCapiroMutation("strategies.step.link");
  async function save() {
    try {
      await link.run({
        params: { id: strategyId, nodeId },
        body: { artifactType: "workspace_draft", artifactRef: documentId },
      });
      onSaved();
      onClose();
    } catch {
      /* Keep errors and selection visible. */
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !link.pending) onClose();
      }}
      title="Link existing work"
      description="Attach a Workspace draft to this strategy step."
      footer={
        <>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton
            primary
            disabled={!documentId || link.pending}
            onClick={save}
          >
            Link draft
          </ActionButton>
        </>
      }
    >
      <Field label="Workspace draft" htmlFor="strategy-link-draft">
        <SelectInput
          id="strategy-link-draft"
          value={documentId}
          onValueChange={setDocumentId}
          options={[
            { value: "", label: "Choose a draft" },
            ...(documents.data?.items ?? [])
              .filter((document) => document.kind === "draft")
              .map((document) => ({
                value: document.id,
                label: `${document.name}${document.client ? ` · ${document.client}` : ""}`,
              })),
          ]}
        />
      </Field>
      {(documents.error || link.error) && (
        <p role="alert" className={styles.error}>
          {(documents.error ?? link.error)?.message}
        </p>
      )}
    </Modal>
  );
}
