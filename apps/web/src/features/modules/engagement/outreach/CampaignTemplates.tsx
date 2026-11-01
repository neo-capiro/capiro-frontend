"use client";
import { useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import type { ClassicOutreachTemplate } from "../../../../shared/capiro/operations/outreach-template-catalog";
import { ActionButton, Modal } from "../../../../shared/module-ui";
import { TemplateCreateDialog } from "./TemplateCreateDialog";
import styles from "./outreach-workflow.module.css";

/** Escaped text only. Previewing never executes the prompt or calls a provider. */
export function TemplatePreviewContent({
  template,
}: {
  template: ClassicOutreachTemplate;
}) {
  return (
    <div className={styles.fields}>
      {template.description && <p>{template.description}</p>}
      <p className={styles.hint}>
        {template.category} · {template.tone}
        {template.source === "user"
          ? ` · Used ${template.usageCount} times`
          : ""}
      </p>
      <section>
        <h3>Sample output</h3>
        <p className={styles.templateText}>
          {template.samplePreview ||
            "This template has no saved sample output."}
        </p>
      </section>
      <section>
        <h3>Prompt</h3>
        <p className={styles.templateText}>{template.prompt}</p>
      </section>
      <p className={styles.hint}>
        This is a saved example, not a generated message for your recipients.
      </p>
    </div>
  );
}

export function CampaignTemplates({
  templates,
  selectedId,
  disabled,
  onSelect,
  onReload,
}: {
  templates: readonly ClassicOutreachTemplate[];
  selectedId: string | null;
  disabled: boolean;
  onSelect: (id: string | null) => void;
  onReload: () => void;
}) {
  const api = useCapiro();
  const [dialog, setDialog] = useState<{
    api: typeof api;
    kind: "create" | "preview";
    id?: string;
  }>();
  const current = dialog?.api === api ? dialog : undefined;
  const preview =
    current?.kind === "preview"
      ? templates.find((item) => item.id === current.id)
      : undefined;
  return (
    <>
      <fieldset className={styles.templateGallery} disabled={disabled}>
        <legend>Choose a template</legend>
        <p className={styles.hint}>
          Preview a saved example or create your own instructions.
        </p>
        <div className={styles.templateChoices}>
          <label className={styles.templateChoice}>
            <input
              type="radio"
              name="outreach-template"
              checked={!selectedId}
              onChange={() => onSelect(null)}
            />
            <span>
              <strong>Start from scratch</strong>
              <span>Use your own campaign context.</span>
            </span>
          </label>
          {templates.map((template) => (
            <div key={template.id} className={styles.templateCard}>
              <label className={styles.templateChoice}>
                <input
                  type="radio"
                  name="outreach-template"
                  value={template.id}
                  checked={selectedId === template.id}
                  onChange={() => onSelect(template.id)}
                />
                <span>
                  <strong>{template.name}</strong>
                  {template.description && <span>{template.description}</span>}
                </span>
              </label>
              <ActionButton
                type="button"
                onClick={() =>
                  setDialog({ api, kind: "preview", id: template.id })
                }
                aria-label={`Preview ${template.name}`}
              >
                Preview
              </ActionButton>
            </div>
          ))}
          <ActionButton
            type="button"
            className={styles.createTemplate}
            onClick={() => setDialog({ api, kind: "create" })}
          >
            + Create custom template
          </ActionButton>
        </div>
      </fieldset>
      {preview && (
        <Modal
          open
          title={preview.name}
          description="Template preview"
          className={styles.templateDialog}
          onOpenChange={(open) => {
            if (!open) setDialog(undefined);
          }}
          footer={
            <>
              <ActionButton onClick={() => setDialog(undefined)}>
                Close
              </ActionButton>
              <ActionButton
                primary
                disabled={disabled}
                onClick={() => {
                  onSelect(preview.id);
                  setDialog(undefined);
                }}
              >
                Use this template
              </ActionButton>
            </>
          }
        >
          <TemplatePreviewContent template={preview} />
        </Modal>
      )}
      {current?.kind === "create" && (
        <TemplateCreateDialog
          disabled={disabled}
          onClose={() => setDialog(undefined)}
          onReload={onReload}
          onConfirmed={(template) => {
            onReload();
            if (!disabled) onSelect(template.id);
            setDialog(undefined);
          }}
        />
      )}
    </>
  );
}
