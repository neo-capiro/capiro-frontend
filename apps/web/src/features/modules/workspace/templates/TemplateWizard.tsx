"use client";

import { useState } from "react";
import { type OutreachTemplateDetail } from "../../../../shared/capiro/operations/outreach-template-schemas";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { blankTemplate, templateQuestionsValid } from "./template-model";
import { SpecDefaults } from "./TemplateDefaults";
import { TemplateGuardrails } from "./TemplateGuardrails";
import { TemplateVariables } from "./TemplateVariables";

const steps = [
  "Basics",
  "Defaults",
  "Questions & Variables",
  "Guardrails",
  "Review & Publish",
];
export function TemplateWizard({
  existing,
  onClose,
  onSaved,
}: {
  existing?: OutreachTemplateDetail;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const initial =
    existing?.versions.find(
      (version) => version.id === existing.template.currentDraftVersionId,
    ) ?? existing?.versions.at(-1);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(existing?.template.name ?? "");
  const [description, setDescription] = useState(
    existing?.template.description ?? "",
  );
  const [campaignType, setCampaignType] = useState(
    existing?.template.campaignType ?? "",
  );
  const [spec, setSpec] = useState(initial?.spec ?? blankTemplate);
  const [savedId, setSavedId] = useState<string>();
  const [discard, setDiscard] = useState(false);
  const create = useCapiroMutation("workspace.template.create");
  const replace = useCapiroMutation("workspace.template.draft");
  const metadata = useCapiroMutation("workspace.template.metadata");
  const pending = create.pending || replace.pending || metadata.pending;
  const error = create.error ?? replace.error ?? metadata.error;
  async function save() {
    try {
      if (existing) {
        await metadata.run({
          params: { templateId: existing.template.id },
          body: {
            name,
            description,
            campaignType,
            scope: existing.template.scope,
            clientId: existing.template.clientId ?? undefined,
          },
        });
        await replace.run({
          params: { templateId: existing.template.id },
          body: { spec },
        });
        setSavedId(existing.template.id);
      } else {
        const result = await create.run({
          body: { name, description, campaignType, spec },
        });
        setSavedId(result.template.id);
      }
    } catch {
      /* Each acknowledged stage is preserved by the backend; form inputs stay visible. */
    }
  }
  const invalid =
    !name.trim() ||
    !templateQuestionsValid(spec) ||
    (spec.strategy.length === "custom" &&
      !spec.strategy.customLengthInstruction?.trim());
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !pending) setDiscard(true);
        }}
        title={
          savedId
            ? "Draft saved"
            : `${existing ? "Edit template · " : "Create template · "}${steps[step]}`
        }
        description="Reusable campaign defaults. Recipients, evidence and approvals are resolved when the template is used."
        footer={
          savedId ? (
            <>
              <ActionButton
                onClick={() => {
                  onSaved(savedId);
                  onClose();
                }}
              >
                Back to library
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton disabled={pending} onClick={() => setDiscard(true)}>
                Cancel
              </ActionButton>
              {step > 0 && (
                <ActionButton
                  disabled={pending}
                  onClick={() => setStep((previous) => previous - 1)}
                >
                  Back
                </ActionButton>
              )}
              <ActionButton
                primary
                disabled={
                  pending ||
                  (step === 0
                    ? !name.trim()
                    : step === 2
                      ? !templateQuestionsValid(spec)
                      : step === 4
                        ? invalid
                        : false)
                }
                onClick={
                  step === 4 ? save : () => setStep((previous) => previous + 1)
                }
              >
                {pending ? "Saving…" : step === 4 ? "Save draft" : "Next"}
              </ActionButton>
            </>
          )
        }
      >
        <div className={styles.form}>
          {savedId ? (
            <p className={styles.success}>
              Your private draft is saved. Publish and change its visibility
              from the library.
            </p>
          ) : (
            <>
              <ol className={styles.steps}>
                {steps.map((label, index) => (
                  <li
                    key={label}
                    className={step === index ? styles.current : ""}
                  >
                    {index < step ? "✓ " : `${index + 1}. `}
                    {label}
                  </li>
                ))}
              </ol>
              {step === 0 && (
                <>
                  <Field label="Name" htmlFor="template-name">
                    <TextInput
                      id="template-name"
                      value={name}
                      maxLength={160}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </Field>
                  <Field label="Description" htmlFor="template-description">
                    <TextArea
                      id="template-description"
                      value={description}
                      maxLength={1000}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </Field>
                  <Field label="Campaign type" htmlFor="template-campaign-type">
                    <TextInput
                      id="template-campaign-type"
                      value={campaignType}
                      maxLength={60}
                      onChange={(event) => setCampaignType(event.target.value)}
                    />
                  </Field>
                  <Field
                    label="Who can use it"
                    htmlFor="template-initial-scope"
                    description="New templates begin as private drafts. Visibility is editable after saving."
                  >
                    <TextInput
                      id="template-initial-scope"
                      value={existing?.template.scope ?? "Only me"}
                      readOnly
                    />
                  </Field>
                </>
              )}
              {step === 1 && <SpecDefaults spec={spec} onChange={setSpec} />}
              {step === 2 && (
                <TemplateVariables
                  variables={spec.variables}
                  onChange={(variables) =>
                    setSpec((previous) => ({ ...previous, variables }))
                  }
                />
              )}
              {step === 3 && (
                <TemplateGuardrails
                  guardrails={spec.guardrails}
                  onChange={(guardrails) =>
                    setSpec((previous) => ({ ...previous, guardrails }))
                  }
                />
              )}
              {step === 4 && (
                <div className={styles.variable}>
                  <strong>{name}</strong>
                  <p>
                    {
                      Object.values(spec.defaultsPolicy).filter(
                        (value) => value === "fixed" || value === "suggested",
                      ).length
                    }{" "}
                    fields carry fixed or suggested defaults.
                  </p>
                  <p>
                    {spec.variables.length} variables ·{" "}
                    {
                      spec.variables.filter((variable) => variable.required)
                        .length
                    }{" "}
                    required
                  </p>
                  <p>
                    Send authority:{" "}
                    {spec.guardrails.sendAuthority.replaceAll("_", " ")}
                  </p>
                  <p className={styles.footnote}>
                    Recipients, evidence, drafts, approvals and sending are
                    resolved fresh each time this template is used.
                  </p>
                </div>
              )}
            </>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error.message}
            </p>
          )}
        </div>
      </Modal>
      <Modal
        open={discard}
        onOpenChange={setDiscard}
        title="Discard template changes?"
        description="Unsaved inputs will be lost."
        footer={
          <>
            <ActionButton onClick={() => setDiscard(false)}>
              Keep editing
            </ActionButton>
            <ActionButton primary onClick={onClose}>
              Discard changes
            </ActionButton>
          </>
        }
      >
        <p>Your saved template versions remain available.</p>
      </Modal>
    </>
  );
}
