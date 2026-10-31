"use client";
import { useRef, useState } from "react";
import type { z } from "zod";
import type { legalDeadlineRow } from "../../../../../shared/capiro/operations/legiwatch-research-schemas";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
} from "../../../../../shared/module-ui";
import type { EvidenceScope } from "../sources/EvidenceActions";
import styles from "../legiwatch.module.css";
import { ResearchDraftReceipt } from "./ResearchDraft";
export function DeadlineDraft({
  deadline,
  scope,
  onClose,
}: {
  deadline: z.infer<typeof legalDeadlineRow>;
  scope: EvidenceScope & { folderId: string };
  onClose: () => void;
}) {
  const [analysis, setAnalysis] = useState("");
  const requestKey = useRef(crypto.randomUUID()),
    save = useCapiroMutation("legiwatch.research.deadline.draft");
  const submit = async () => {
    try {
      await save.run({
        body: {
          ...scope,
          deadlineId: deadline.id,
          noticeRevision: deadline.notice_revision_id,
          analysis,
          requestKey: requestKey.current,
        },
      });
    } catch {
      /* Keep exact notice revision for review. */
    }
  };
  return (
    <Modal
      open
      title="Create deadline follow-up draft"
      onOpenChange={(open) => {
        if (!open && !save.pending) onClose();
      }}
    >
      <div className={styles.form}>
        <blockquote>{deadline.raw_wording}</blockquote>
        <p className={styles.banner}>
          This creates a cited draft. It does not calculate a legal deadline or
          schedule a hearing capture.
        </p>
        <Field label="Analysis for review" htmlFor="deadline-analysis">
          <TextArea
            id="deadline-analysis"
            disabled={save.pending || Boolean(save.data)}
            value={analysis}
            maxLength={30000}
            onChange={(event) => {
              requestKey.current = crypto.randomUUID();
              setAnalysis(event.target.value);
            }}
          />
        </Field>
        <ActionButton
          primary
          disabled={save.pending || Boolean(save.data)}
          onClick={() => void submit()}
        >
          Save source-dated draft
        </ActionButton>
        {save.error && <p role="alert">{save.error.message}</p>}
        {save.data && <ResearchDraftReceipt receipt={save.data} />}
      </div>
    </Modal>
  );
}
