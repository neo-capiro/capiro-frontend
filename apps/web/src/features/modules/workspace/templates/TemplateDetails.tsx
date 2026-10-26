"use client";

import { useState } from "react";
import type { OutreachTemplateDetail } from "../../../../shared/capiro/operations/outreach-template-schemas";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { TemplateSettings } from "./TemplateSettings";
import presentation from "./template-presentation.module.css";
import { TemplateHistory } from "./TemplateHistory";
import { useTemplateCommands } from "./useTemplateCommands";
import historyStyles from "./template-history.module.css";

function UseTemplate({
  detail,
  onApplied,
}: {
  detail: OutreachTemplateDetail;
  onApplied: () => void;
}) {
  const version = detail.versions.find(
    (value) => value.id === detail.template.publishedVersionId,
  );
  const clients = useCapiroQuery("workspace.clients", {});
  const commands = useTemplateCommands();
  const retained = commands.record?.command;
  const submitted =
    retained?.operation === "workspace.template.use" &&
    retained.input.params.templateId === detail.template.id
      ? retained.input.body
      : undefined;
  const [clientId, setClientId] = useState(
    submitted ? (submitted.clientId ?? "") : (detail.template.clientId ?? ""),
  );
  const [title, setTitle] = useState(submitted?.title ?? "");
  const [values, setValues] = useState<Record<string, string>>(
    submitted?.variableValues ?? {},
  );
  async function use() {
    const completed = await commands.submit({
      operation: "workspace.template.use",
      input: {
        params: { templateId: detail.template.id },
        body: {
          requestKey: crypto.randomUUID(),
          title: title || undefined,
          clientId: clientId || undefined,
          variableValues: values,
        },
      },
    });
    if (completed?.result !== undefined) onApplied();
  }
  return (
    <div className={styles.form}>
      <Field label="Client" htmlFor="template-use-client">
        <SelectInput
          disabled={commands.blocked}
          id="template-use-client"
          value={clientId}
          onValueChange={setClientId}
          options={[
            { value: "", label: "Select client (optional)" },
            ...(clients.data?.items ?? []).map((client) => ({
              value: client.id,
              label: client.name,
            })),
          ]}
        />
      </Field>
      <Field label="Campaign title" htmlFor="template-use-title">
        <TextInput
          disabled={commands.blocked}
          id="template-use-title"
          value={title}
          maxLength={240}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      {version?.spec.variables.map((variable) => (
        <Field
          key={variable.key}
          label={`${variable.label}${variable.required ? " *" : ""}`}
          htmlFor={`template-answer-${variable.key}`}
          description={variable.question ?? undefined}
        >
          {variable.type === "choice" ? (
            <SelectInput
              disabled={commands.blocked}
              id={`template-answer-${variable.key}`}
              value={values[variable.key] ?? variable.defaultValue ?? ""}
              onValueChange={(value) =>
                setValues((previous) => ({
                  ...previous,
                  [variable.key]: value,
                }))
              }
              options={[
                { value: "", label: "Choose an answer" },
                ...(variable.choices ?? []).map((value) => ({
                  value,
                  label: value,
                })),
              ]}
            />
          ) : (
            <TextInput
              disabled={commands.blocked}
              id={`template-answer-${variable.key}`}
              type={
                variable.type === "date"
                  ? "date"
                  : variable.type === "number"
                    ? "number"
                    : variable.type === "email"
                      ? "email"
                      : variable.type === "url"
                        ? "url"
                        : "text"
              }
              value={values[variable.key] ?? variable.defaultValue ?? ""}
              maxLength={500}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  [variable.key]: event.target.value,
                }))
              }
            />
          )}
        </Field>
      ))}
      {commands.error && (
        <p role="alert" className={styles.error}>
          {commands.error}
        </p>
      )}
      <ActionButton
        primary
        disabled={
          commands.blocked ||
          !detail.capabilities.canUse ||
          commands.busy ||
          !version ||
          version.spec.variables.some(
            (variable) =>
              variable.required &&
              !(values[variable.key] ?? variable.defaultValue)?.trim(),
          )
        }
        onClick={use}
      >
        {commands.busy ? "Applying…" : "Apply template"}
      </ActionButton>
    </div>
  );
}

export function TemplateDetails({
  id,
  mode,
  onClose,
  onEdit,
  onSettingsSaved,
  clientId,
}: {
  id: string;
  clientId?: string;
  mode: "use" | "history" | "settings";
  onClose: () => void;
  onEdit: (detail: OutreachTemplateDetail) => void;
  onSettingsSaved: () => void;
}) {
  const [selectedClientId, setSelectedClientId] = useState(clientId);
  const query = useCapiroQuery("workspace.template", {
    params: { templateId: id },
    query: { clientId: selectedClientId },
  });
  return (
    <Modal
      open
      className={
        mode === "settings"
          ? presentation.settingsDialog
          : mode === "history"
            ? historyStyles.dialog
            : undefined
      }
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        mode === "history" ? (
          <ActionButton onClick={onClose}>Close</ActionButton>
        ) : undefined
      }
      title={
        mode === "use"
          ? "Use template · Questions"
          : mode === "history"
            ? (query.data?.template.name ?? "Template version history")
            : "Edit template"
      }
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <div className={mode === "settings" ? undefined : styles.form}>
            {mode === "use" && <h3>{query.data.template.name}</h3>}
            {mode === "use" ? (
              <UseTemplate detail={query.data} onApplied={onClose} />
            ) : mode === "settings" ? (
              <TemplateSettings
                detail={query.data}
                onClose={onClose}
                onSaved={(savedClientId) => {
                  setSelectedClientId(savedClientId);
                  query.reload();
                  onSettingsSaved();
                }}
              />
            ) : (
              <>
                <TemplateHistory key={id} detail={query.data} />
                {query.data.capabilities.canEdit && (
                  <ActionButton
                    className={historyStyles.edit}
                    onClick={() => {
                      onEdit(query.data!);
                      onClose();
                    }}
                  >
                    Edit template
                  </ActionButton>
                )}
              </>
            )}
          </div>
        )}
      </StatusPanel>
    </Modal>
  );
}
