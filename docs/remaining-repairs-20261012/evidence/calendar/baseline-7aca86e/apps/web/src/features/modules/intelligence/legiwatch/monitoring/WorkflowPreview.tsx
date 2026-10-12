"use client";
import { useRef, useState } from "react";
import type { z } from "zod";
import {
  workflowTemplates,
  type workflow,
  type workflowPreviewInput,
} from "../../../../../shared/capiro/operations/legiwatch-workflows";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";

export function WorkflowPreview({
  scope,
  onClose,
  onCreated,
}: {
  scope: z.infer<typeof workflow>["config"];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [input, setInput] = useState<z.infer<typeof workflowPreviewInput>>({
    ...scope,
    template: "hearing_preparation",
  });
  const preview = useCapiroMutation("legiwatch.workflow.preview"),
    enqueue = useCapiroMutation("legiwatch.workflow.enqueue");
  const [reviewedInput, setReviewedInput] = useState(""),
    key = useRef<string | undefined>(undefined);
  const pending = preview.pending || enqueue.pending,
    unchanged = JSON.stringify(input) === reviewedInput;
  const inspect = async () => {
    try {
      await preview.run({ body: input });
      setReviewedInput(JSON.stringify(input));
      key.current = crypto.randomUUID();
    } catch {
      setReviewedInput("");
    }
  };
  const create = async () => {
    if (!preview.data || !unchanged || !key.current) return;
    try {
      const result = await enqueue.run({
        body: {
          input,
          inputHash: preview.data.inputHash,
          requestKey: key.current,
        },
      });
      onCreated(result.id);
    } catch {
      /* Reuse the reviewed request key after uncertain outcomes. */
    }
  };
  const reference =
    input.template === "added_bill_review"
      ? "billId"
      : input.template === "report_review"
        ? "reportId"
        : input.template.startsWith("legal_")
          ? "selectionId"
          : "eventId";
  return (
    <Modal
      open
      title="Preview internal follow-up"
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <div className={styles.form}>
        <fieldset disabled={pending} className={styles.form}>
          <p>
            {scope.jurisdiction} · {scope.sessionKey} · {scope.folderIds.length}{" "}
            selected folder
          </p>
          <SelectField
            id="workflow-preview-template"
            label="Follow-up type"
            value={input.template}
            onChange={(value) => {
              const template = [
                ...workflowTemplates,
                "legal_research",
                "legal_deadline",
              ].find((item) => item === value) as
                | typeof input.template
                | undefined;
              if (template) {
                setInput({
                  folderIds: scope.folderIds,
                  jurisdiction: scope.jurisdiction,
                  sessionKey: scope.sessionKey,
                  template,
                });
                preview.reset();
              }
            }}
          >
            {[...workflowTemplates, "legal_research", "legal_deadline"].map(
              (item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ),
            )}
          </SelectField>
          <Field
            label={
              reference === "billId"
                ? "Tracked bill reference"
                : reference === "reportId"
                  ? "Saved report reference"
                  : reference === "selectionId"
                    ? "Saved research selection reference"
                    : "Hearing reference"
            }
            htmlFor="workflow-reference"
          >
            <TextInput
              id="workflow-reference"
              value={input[reference] ?? ""}
              maxLength={180}
              onChange={(event) => {
                setInput((current) => ({
                  ...current,
                  [reference]: event.target.value,
                }));
                preview.reset();
              }}
            />
          </Field>
          <p className={styles.description}>
            Use the reference from the saved source. The service verifies
            current source revisions, folder membership and ownership before
            showing effects.
          </p>
          <ActionButton
            disabled={!input[reference]}
            onClick={() => void inspect()}
          >
            Preview effects
          </ActionButton>
          {unchanged && preview.data && (
            <section className={styles.card}>
              <h3>Reviewed effects</h3>
              {preview.data.effects.map((effect, index) => (
                <p key={index}>
                  {effect.kind.replaceAll("_", " ")} · Internal only
                </p>
              ))}
              {preview.data.limits.map((limit) => (
                <p key={limit}>{limit}</p>
              ))}
              <ActionButton primary onClick={() => void create()}>
                Create reviewed follow-up
              </ActionButton>
            </section>
          )}
        </fieldset>
        {(preview.error || enqueue.error) && (
          <p role="alert">{(preview.error ?? enqueue.error)?.message}</p>
        )}
      </div>
    </Modal>
  );
}
