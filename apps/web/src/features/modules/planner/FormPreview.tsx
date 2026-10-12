"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { PlannerResource } from "../../../shared/capiro/operations/planner-schemas";
import { ActionButton, Modal } from "../../../shared/module-ui";
import { formQuestions, visibleFormQuestions } from "./form-model";
import { FormAnswers } from "./FormAnswers";
import { FormSharing } from "./FormSharing";
import styles from "./planner.module.css";
export function FormPreview({
  resource,
  onClose,
}: {
  resource: Extract<PlannerResource, { kind: "form" }>;
  onClose: () => void;
}) {
  const api = useCapiro();
  const [answers, setAnswers] = useState<
      Record<string, string | number | string[]>
    >({}),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false),
    [files, setFiles] = useState<Record<string, File[]>>({}),
    [submitted, setSubmitted] = useState(false);
  const fields = visibleFormQuestions(
    formQuestions(resource.data.fields),
    answers,
  );
  const update = (id: string, value: string | number | string[]) =>
    setAnswers((old) => ({ ...old, [id]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const body = Object.fromEntries(
        fields
          .filter((field) => answers[field.id] !== undefined)
          .map((field) => [field.id, answers[field.id]!]),
      );
      const uploads = fields.flatMap((field) =>
        (files[field.id] ?? []).map((file) => ({ field: field.id, file })),
      );
      if (uploads.length)
        await api.upload(
          "planner.form.upload",
          { params: { id: resource.id }, body: { answers: body } },
          uploads,
        );
      else
        await api.request("planner.form.submit", {
          params: { id: resource.id },
          body,
        });
      setSubmitted(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to submit form.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={resource.name}
      description={String(resource.data.description ?? "")}
    >
      {submitted ? (
        <div className={styles.emptyLayout}>
          <h2>
            {String(
              resource.data.confirmationMessage ??
                "Your request has been submitted.",
            )}
          </h2>
          {Boolean(resource.data.allowAnotherSubmission) && (
            <ActionButton
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
                setFiles({});
              }}
            >
              Submit another
            </ActionButton>
          )}
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className={styles.stack}>
          <FormAnswers
            fields={fields}
            answers={answers}
            onAnswer={update}
            onFiles={setFiles}
          />
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <ActionButton
            primary
            type="submit"
            disabled={busy || !resource.data.enabled}
          >
            {busy ? "Submitting…" : "Submit request"}
          </ActionButton>
        </form>
      )}
      {["admin", "editor"].includes(resource.access) && (
        <FormSharing resource={resource} />
      )}
    </Modal>
  );
}
