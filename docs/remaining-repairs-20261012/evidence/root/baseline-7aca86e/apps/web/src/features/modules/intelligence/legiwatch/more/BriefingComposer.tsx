"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import type { EvidenceRef, EvidenceScope } from "../evidence/EvidenceActions";
import styles from "../legiwatch.module.css";
import { BriefingCitations, type BriefingCitation } from "./BriefingCitations";
import { BriefingReview } from "./BriefingReview";

type Template =
  | "research_update"
  | "daily_legislative_brief"
  | "morning_news_brief";
export function BriefingComposer({
  evidenceRefs,
  folderId,
  clientId,
  sessionKey,
  onClose,
}: {
  evidenceRefs: readonly EvidenceRef[];
  onClose: () => void;
} & EvidenceScope) {
  const [template, setTemplate] = useState<Template>("research_update"),
    [title, setTitle] = useState("Research Update"),
    [analysis, setAnalysis] = useState(""),
    [cutoff, setCutoff] = useState(() => new Date().toISOString()),
    [timezone, setTimezone] = useState("America/New_York"),
    [citations, setCitations] = useState<BriefingCitation[]>([]);
  const key = useRef(crypto.randomUUID()),
    save = useCapiroMutation("legiwatch.briefing.save");
  const scope = { folderId, clientId, sessionKey },
    frozen = Boolean(save.data),
    ready =
      evidenceRefs.length > 0 &&
      evidenceRefs.every((ref) =>
        citations.some(
          (citation) =>
            citation.kind === ref.kind &&
            citation.id === ref.id &&
            citation.revision === ref.revision,
        ),
      );
  const change = () => {
    key.current = crypto.randomUUID();
  };
  const submit = async () => {
    try {
      await save.run({
        body: {
          ...scope,
          requestKey: key.current,
          template,
          title,
          analysis,
          cutoff,
          timezone,
          sources: [...evidenceRefs],
          citations,
          generationMode: analysis.trim() ? "authored_analysis" : "source_list",
        },
      });
    } catch {
      /* Reuse the exact request key on a safe retry. */
    }
  };
  return (
    <Modal
      open
      title="Client briefing"
      description="Prepare a cited draft from exact retained revisions. Saving and distribution approval are separate actions."
      onOpenChange={(open) => {
        if (!open && !save.pending) onClose();
      }}
    >
      <div className={styles.form}>
        <fieldset disabled={save.pending || frozen} className={styles.form}>
          <SelectField
            id="briefing-template"
            label="Template"
            value={template}
            onChange={(value) => {
              if (
                value === "research_update" ||
                value === "daily_legislative_brief" ||
                value === "morning_news_brief"
              ) {
                change();
                setTemplate(value);
              }
            }}
          >
            <option value="research_update">Research Update</option>
            <option value="daily_legislative_brief">
              Daily Legislative Brief
            </option>
            <option value="morning_news_brief">Morning News Brief</option>
          </SelectField>
          <Field label="Title" htmlFor="briefing-title">
            <TextInput
              id="briefing-title"
              value={title}
              maxLength={200}
              onChange={(event) => {
                change();
                setTitle(event.target.value);
              }}
            />
          </Field>
          <Field label="Knowledge cutoff (UTC)" htmlFor="briefing-cutoff">
            <TextInput
              id="briefing-cutoff"
              value={cutoff}
              onChange={(event) => {
                change();
                setCutoff(event.target.value);
              }}
            />
          </Field>
          <Field label="Timezone" htmlFor="briefing-timezone">
            <TextInput
              id="briefing-timezone"
              value={timezone}
              onChange={(event) => {
                change();
                setTimezone(event.target.value);
              }}
            />
          </Field>
          <Field label="Analysis" htmlFor="briefing-analysis">
            <TextArea
              id="briefing-analysis"
              value={analysis}
              maxLength={30000}
              onChange={(event) => {
                change();
                setAnalysis(event.target.value);
              }}
            />
          </Field>
        </fieldset>
        <BriefingCitations
          refs={evidenceRefs}
          scope={scope}
          citations={citations}
          disabled={save.pending || frozen}
          onAdd={(citation) => {
            change();
            setCitations((current) => [
              ...current.filter(
                (item) =>
                  item.kind !== citation.kind ||
                  item.id !== citation.id ||
                  item.locator !== citation.locator ||
                  item.revision !== citation.revision ||
                  item.start !== citation.start ||
                  item.end !== citation.end,
              ),
              citation,
            ]);
          }}
        />
        <ActionButton
          primary
          disabled={!ready || !title.trim() || save.pending || frozen}
          onClick={() => void submit()}
        >
          {save.pending
            ? "Saving cited draft…"
            : "Save cited draft to Workspace"}
        </ActionButton>
        {save.error && (
          <p role="alert" className={styles.error}>
            {save.error.message}
          </p>
        )}
        {save.data && (
          <>
            <p className={styles.success} role="status">
              Evidence selection saved.{" "}
              {save.data.draft
                ? "Workspace draft prepared."
                : "Workspace is not configured; the selection remains saved."}
            </p>
            {save.data.draft && (
              <Link
                className={styles.link}
                href={`/modules/workspace?draftId=${encodeURIComponent(save.data.draft.draftId)}`}
              >
                Open and edit the Workspace draft
              </Link>
            )}
            <BriefingReview
              selectionId={save.data.selectionId}
              folderId={folderId}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
