"use client";

import { useState } from "react";
import type { OutreachTemplateDetail } from "../../../../shared/capiro/operations/outreach-template-schemas";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { useTemplateCommands } from "./useTemplateCommands";
import { outreachTemplateOperations } from "../../../../shared/capiro/operations/outreach-templates";
import presentation from "./template-presentation.module.css";

export function TemplateSettings({
  detail,
  onSaved,
  onClose,
}: {
  detail: OutreachTemplateDetail;
  onSaved: (clientId?: string) => void;
  onClose: () => void;
}) {
  const commands = useTemplateCommands();
  const retained = commands.record?.command;
  const submitted =
    retained?.operation === "workspace.template.metadata" &&
    retained.input.params.templateId === detail.template.id
      ? retained.input.body
      : undefined;
  const [name, setName] = useState(submitted?.name ?? detail.template.name);
  const [description, setDescription] = useState(
    submitted?.description ?? detail.template.description ?? "",
  );
  const [campaignType, setCampaignType] = useState(
    submitted?.campaignType ?? detail.template.campaignType ?? "",
  );
  const [scope, setScope] = useState(submitted?.scope ?? detail.template.scope);
  const [clientId, setClientId] = useState(
    submitted ? (submitted.clientId ?? "") : (detail.template.clientId ?? ""),
  );
  const clients = useCapiroQuery("workspace.clients", {});
  async function save() {
    try {
      const completed = await commands.submit({
        operation: "workspace.template.metadata",
        accessClientId: detail.template.clientId ?? undefined,
        input: {
          params: { templateId: detail.template.id },
          body: {
            name,
            description,
            campaignType,
            scope,
            clientId: scope === "client" ? clientId : undefined,
          },
        },
      });
      if (completed?.result !== undefined)
        onSaved(
          outreachTemplateOperations[
            "workspace.template.metadata"
          ].response.parse(completed.result).clientId ?? undefined,
        );
    } catch {
      /* Retain entered metadata on authorization or validation failure. */
    }
  }
  const disabled = !detail.capabilities.canEdit || commands.blocked;
  return (
    <div>
      <div className={presentation.settingsFields}>
        <Field label="Name" htmlFor="template-settings-name">
          <TextInput
            id="template-settings-name"
            disabled={disabled}
            maxLength={160}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor="template-settings-description">
          <TextArea
            id="template-settings-description"
            disabled={disabled}
            maxLength={1000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <Field label="Campaign type" htmlFor="template-settings-type">
          <TextInput
            id="template-settings-type"
            disabled={disabled}
            maxLength={60}
            value={campaignType}
            onChange={(event) => setCampaignType(event.target.value)}
          />
        </Field>
        <Field label="Who can use it" htmlFor="template-settings-scope">
          <SelectInput
            id="template-settings-scope"
            disabled={disabled}
            value={scope}
            onValueChange={(value) => setScope(value as typeof scope)}
            options={[
              { value: "private", label: "Only me" },
              { value: "firm", label: "The firm" },
              { value: "client", label: "Client" },
            ]}
          />
        </Field>
        {scope === "client" && (
          <Field label="Client" htmlFor="template-settings-client">
            <SelectInput
              id="template-settings-client"
              disabled={disabled}
              value={clientId}
              onValueChange={setClientId}
              options={[
                { value: "", label: "Select a client" },
                ...(clients.data?.items ?? []).map((client) => ({
                  value: client.id,
                  label: client.name,
                })),
              ]}
            />
          </Field>
        )}
        {commands.error && (
          <p role="alert" className={styles.error}>
            {commands.error}
          </p>
        )}
        {commands.record?.result !== undefined && (
          <p className={styles.success}>Template settings saved.</p>
        )}
        {clients.error && scope === "client" && (
          <p role="alert" className={styles.error}>
            {clients.error.message}
          </p>
        )}
      </div>
      <footer className={presentation.settingsFooter}>
        <ActionButton onClick={onClose}>Cancel</ActionButton>
        <ActionButton
          primary
          disabled={
            disabled || !name.trim() || (scope === "client" && !clientId)
          }
          onClick={save}
        >
          {commands.busy ? "Saving…" : "Save"}
        </ActionButton>
      </footer>
    </div>
  );
}
