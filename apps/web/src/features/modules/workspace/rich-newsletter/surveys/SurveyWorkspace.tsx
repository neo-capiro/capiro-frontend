import { useState } from "react";
import { ActionButton, Modal } from "@/shared/module-ui";
import type { SurveyDraftState } from "./use-survey-drafts";
import { SurveyForm } from "./SurveyForm";
import { SurveyText } from "./SurveyFields";
import ui from "../library/sections.module.css";
import styles from "./surveys.module.css";

export function SurveyWorkspace({ survey }: { survey: SurveyDraftState }) {
  const [search, setSearch] = useState("");
  const form = survey.form,
    editing = !!form?.saved;
  const invalid =
    !form?.name.trim() ||
    form.definition.questions.some(
      (question) =>
        (question.type === "range" &&
          question.range.min >= question.range.max) ||
        ((question.type === "radio" || question.type === "checkbox") &&
          (question.options.some((option) => !option.trim()) ||
            new Set(question.options.map((option) => option.trim())).size !==
              question.options.length)),
    );
  return (
    <Modal
      open={survey.open}
      onOpenChange={(open) => {
        if (!open) survey.close();
      }}
      title={
        survey.unknown
          ? "Survey save not confirmed"
          : form
            ? editing
              ? "Edit survey draft"
              : "Create survey draft"
            : "Saved survey drafts"
      }
      description={`${editing ? `Saved draft · Revision ${form.saved!.revision}. ` : ""}Saved drafts cannot yet collect responses.`}
      className={`${ui.dialog} ${styles.dialog}`}
      closeDisabled={survey.pending}
      footer={
        <div className={ui.actions}>
          <ActionButton
            className={ui.button}
            disabled={survey.pending}
            onClick={survey.close}
          >
            {survey.unknown ? "Close" : "Cancel"}
          </ActionButton>
          {form && !survey.unknown && (
            <ActionButton
              className={ui.button}
              primary
              disabled={survey.pending || invalid}
              onClick={() => void survey.save()}
            >
              {survey.pending ? "Saving…" : "Save survey draft"}
            </ActionButton>
          )}
          {survey.unknown && (
            <ActionButton className={ui.button} onClick={survey.reload}>
              Read current saved drafts
            </ActionButton>
          )}
        </div>
      }
    >
      {survey.loading && <p role="status">Loading saved survey drafts…</p>}
      {survey.error && (
        <p role="alert">
          Saved drafts are unavailable. A new read checks current access.
        </p>
      )}
      {survey.notice && (
        <p className={ui.notice} role="status">
          {survey.notice}
        </p>
      )}
      {survey.unknown && (
        <p className={ui.notice} role="status">
          Save was not confirmed. It may have completed. Your local form is
          retained in this mounted view; a current list or a newer revision
          cannot confirm this request. This view will not repeat the save.
        </p>
      )}
      {form && !survey.unknown ? (
        <SurveyForm key={form.saved?.id ?? "new"} survey={survey} />
      ) : (
        !survey.loading && (
          <>
            <p>
              These are your accessible saved drafts, not a document-only list.
              Filters apply to the loaded items, up to 500. Reading does not
              publish, insert or save a newsletter.
            </p>
            <div className={ui.actions}>
              <ActionButton
                className={ui.button}
                disabled={!survey.items || survey.pending || survey.unknown}
                onClick={survey.create}
              >
                Create survey draft
              </ActionButton>
              <ActionButton
                className={ui.button}
                disabled={survey.pending}
                onClick={survey.reload}
              >
                Refresh saved drafts
              </ActionButton>
            </div>
            {survey.items && (
              <>
                <SurveyText
                  label="Search saved drafts"
                  value={search}
                  max={200}
                  change={setSearch}
                />
                {survey.items
                  .filter((item) =>
                    item.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((item) => (
                    <section className={ui.details} key={item.id}>
                      <h3>{item.name}</h3>
                      <p>Draft · Revision {item.revision}</p>
                      <ActionButton
                        className={ui.button}
                        disabled={survey.pending || survey.unknown}
                        onClick={() => survey.select(item)}
                      >
                        Edit {item.name}
                      </ActionButton>
                    </section>
                  ))}
                {!survey.items.length && <p>No saved survey drafts yet.</p>}
              </>
            )}
          </>
        )
      )}
    </Modal>
  );
}
