"use client";
import { useState } from "react";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import {
  createClassicTemplateInput,
  type ClassicOutreachTemplate,
} from "../../../../shared/capiro/operations/outreach-template-catalog";
import { useCampaignTemplateCreation } from "./useCampaignTemplateCreation";
import styles from "./outreach-workflow.module.css";

export function TemplateCreateDialog({
  onClose,
  onConfirmed,
  onReload,
  disabled,
}: {
  onClose: () => void;
  onConfirmed: (template: ClassicOutreachTemplate) => void;
  onReload: () => void;
  disabled: boolean;
}) {
  const [fields, setFields] = useState({
    name: "",
    category: "general",
    prompt: "",
    description: "",
    tone: "professional",
  });
  const { state, owner } = useCampaignTemplateCreation(onConfirmed);
  const pending = state.status === "creating" || state.status === "checking";
  const editable = !disabled && state.status === "ready" && !!owner;
  // Twenty characters is the legacy editor's guidance, not a Core DTO limit.
  const valid =
    createClassicTemplateInput.safeParse(fields).success &&
    fields.prompt.trim().length >= 20;
  return (
    <Modal
      open
      title="Create custom template"
      description="Save a private template for your account. This does not generate or send any email."
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      closeDisabled={pending}
      className={styles.templateDialog}
    >
      <form
        className={styles.fields}
        onSubmit={(event) => {
          event.preventDefault();
          if (editable && valid) void owner?.create(fields);
        }}
      >
        <Field label="Template name" htmlFor="classic-template-name">
          <TextInput
            id="classic-template-name"
            value={fields.name}
            maxLength={120}
            disabled={!editable}
            onChange={(event) =>
              setFields({ ...fields, name: event.target.value })
            }
          />
        </Field>
        <Field label="Description" htmlFor="classic-template-description">
          <TextInput
            id="classic-template-description"
            value={fields.description}
            maxLength={500}
            disabled={!editable}
            onChange={(event) =>
              setFields({ ...fields, description: event.target.value })
            }
          />
        </Field>
        <div className={styles.grid}>
          <Field label="Category" htmlFor="classic-template-category">
            <TextInput
              id="classic-template-category"
              value={fields.category}
              maxLength={50}
              disabled={!editable}
              onChange={(event) =>
                setFields({ ...fields, category: event.target.value })
              }
            />
          </Field>
          <Field label="Tone" htmlFor="classic-template-tone">
            <TextInput
              id="classic-template-tone"
              value={fields.tone}
              maxLength={50}
              disabled={!editable}
              onChange={(event) =>
                setFields({ ...fields, tone: event.target.value })
              }
            />
          </Field>
        </div>
        <Field
          label="Prompt"
          htmlFor="classic-template-prompt"
          description="Describe the structure and instructions in at least 20 characters. A sample is not generated when you save."
        >
          <TextArea
            id="classic-template-prompt"
            value={fields.prompt}
            maxLength={5000}
            rows={7}
            disabled={!editable}
            onChange={(event) =>
              setFields({ ...fields, prompt: event.target.value })
            }
          />
        </Field>
        {state.error && <p role="alert">{state.error}</p>}
        {state.status === "unknown" && (
          <p role="status">
            An earlier creation may have been saved. Review your catalog; this
            form will not submit that request again. A matching name does not
            confirm its outcome.
          </p>
        )}
        {state.status === "created" && (
          <p role="status">
            The template was created. Confirm it in your current catalog before
            selecting it.
          </p>
        )}
        {pending && (
          <p role="status">
            {state.status === "creating"
              ? "Creating template…"
              : "Confirming your saved template…"}
          </p>
        )}
        <div className={styles.actions}>
          <ActionButton type="button" disabled={pending} onClick={onClose}>
            Close
          </ActionButton>
          {state.status === "ready" && (
            <ActionButton primary type="submit" disabled={!editable || !valid}>
              Create template
            </ActionButton>
          )}
          {state.status === "created" && (
            <ActionButton
              type="button"
              disabled={disabled}
              onClick={() => void owner?.check()}
            >
              Check saved template
            </ActionButton>
          )}
          {state.status === "unknown" && (
            <ActionButton
              type="button"
              onClick={() => {
                onReload();
                onClose();
              }}
            >
              Review template catalog
            </ActionButton>
          )}
        </div>
      </form>
    </Modal>
  );
}
