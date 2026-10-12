"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import type { z } from "zod";
import type { draftReceipt } from "../../../../../shared/capiro/operations/legiwatch-briefings";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
  TextInput,
} from "../../../../../shared/module-ui";
import type { EvidenceRef, EvidenceScope } from "../evidence/EvidenceActions";
import styles from "../legiwatch.module.css";
import {
  BriefingCitations,
  type BriefingCitation,
} from "../more/BriefingCitations";
import { ResearchReportReview } from "./ResearchReportReview";

export function ResearchDraft({
  scope,
  refs,
  onClose,
}: {
  scope: EvidenceScope;
  refs: readonly EvidenceRef[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState("Legislative research"),
    [analysis, setAnalysis] = useState(""),
    [citations, setCitations] = useState<BriefingCitation[]>([]);
  const requestKey = useRef(crypto.randomUUID()),
    save = useCapiroMutation("legiwatch.research.draft");
  const ready =
    refs.length > 0 &&
    refs.length <= 10 &&
    refs.every((ref) =>
      citations.some(
        (citation) =>
          citation.id === ref.id && citation.revision === ref.revision,
      ),
    );
  const changed = () => {
    requestKey.current = crypto.randomUUID();
  };
  const submit = async () => {
    try {
      await save.run({
        body: {
          ...scope,
          requestKey: requestKey.current,
          title,
          analysis,
          allowCrossBill: false,
          documents: refs.map((ref) => ({
            id: ref.id,
            revision: ref.revision,
          })),
          citations: citations.map(
            ({ id, revision, locator, quote, start, end }) => ({
              documentId: id,
              revision,
              locator,
              quote,
              start,
              end,
            }),
          ),
        },
      });
    } catch {
      /* Retry keeps the exact reviewed selection and request key. */
    }
  };
  return (
    <Modal
      open
      title="Save cited research"
      onOpenChange={(open) => {
        if (!open && !save.pending) onClose();
      }}
    >
      <div className={styles.form}>
        <fieldset
          className={styles.form}
          disabled={save.pending || Boolean(save.data)}
        >
          <Field label="Draft title" htmlFor="research-draft-title">
            <TextInput
              id="research-draft-title"
              value={title}
              maxLength={200}
              onChange={(event) => {
                changed();
                setTitle(event.target.value);
              }}
            />
          </Field>
          <Field label="Analysis for review" htmlFor="research-draft-analysis">
            <TextArea
              id="research-draft-analysis"
              value={analysis}
              maxLength={30000}
              onChange={(event) => {
                changed();
                setAnalysis(event.target.value);
              }}
            />
          </Field>
        </fieldset>
        <BriefingCitations
          refs={refs}
          scope={scope}
          citations={citations}
          disabled={save.pending || Boolean(save.data)}
          onAdd={(citation) => {
            changed();
            setCitations((current) => [
              ...current.filter(
                (item) =>
                  item.id !== citation.id ||
                  item.locator !== citation.locator ||
                  item.start !== citation.start ||
                  item.end !== citation.end,
              ),
              citation,
            ]);
          }}
        />
        <ActionButton
          primary
          disabled={
            !ready || !title.trim() || save.pending || Boolean(save.data)
          }
          onClick={() => void submit()}
        >
          {save.pending ? "Saving…" : "Save cited Workspace draft"}
        </ActionButton>
        {save.error && <p role="alert">{save.error.message}</p>}
        {save.data && <ResearchDraftReceipt receipt={save.data} />}
      </div>
    </Modal>
  );
}
export function ResearchDraftReceipt({
  receipt,
}: {
  receipt: z.infer<typeof draftReceipt>;
}) {
  return (
    <div className={styles.form}>
      <p role="status">
        Evidence selection saved.{" "}
        {receipt.draft
          ? "A cited Workspace draft is ready for review."
          : "Workspace is not configured; the evidence selection remains saved."}
      </p>
      {receipt.draft && (
        <>
          <Link
            className={styles.link}
            href={`/modules/workspace?draftId=${encodeURIComponent(receipt.draft.draftId)}`}
          >
            Open Workspace draft
          </Link>
          <ResearchReportReview selectionId={receipt.selectionId} />
        </>
      )}
    </div>
  );
}
