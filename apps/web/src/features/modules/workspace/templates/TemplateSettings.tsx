"use client";

import { useState } from "react";
import type { OutreachTemplateDetail } from "../../../../shared/capiro/operations/outreach-template-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";

export function TemplateSettings({
  detail,
  onSaved,
}: {
  detail: OutreachTemplateDetail;
  onSaved: () => void;
}) {
  const [name, setName] = useState(detail.template.name);
  const [description, setDescription] = useState(
    detail.template.description ?? "",
  );
  const [campaignType, setCampaignType] = useState(
    detail.template.campaignType ?? "",
  );
  const [scope, setScope] = useState(detail.template.scope);
  const [clientId, setClientId] = useState(detail.template.clientId ?? "");
  const clients = useCapiroQuery("workspace.clients", {});
  const update = useCapiroMutation("workspace.template.metadata");
  async function save() {
    try {
      await update.run({
        params: { templateId: detail.template.id },
        body: {
          name,
          description,
          campaignType,
          scope,
          clientId: scope === "client" ? clientId : undefined,
        },
      });
      onSaved();
    } catch {
      /* Retain entered metadata on authorization or validation failure. */
    }
  }
  const disabled = !detail.capabilities.canEdit || update.pending;
  return (
    <div className={styles.form}>
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
      <Field
        label="Who can use it"
        htmlFor="template-settings-scope"
        description="The template service checks who may edit and publish in this scope."
      >
        <SelectInput
          id="template-settings-scope"
          disabled={disabled}
          value={scope}
          onValueChange={(value) => setScope(value as typeof scope)}
          options={[
            { value: "private", label: "Only me" },
            { value: "firm", label: "Firm" },
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
      {update.error && (
        <p role="alert" className={styles.error}>
          {update.error.message}
        </p>
      )}
      {update.data && (
        <p className={styles.success}>Template settings saved.</p>
      )}
      {clients.error && scope === "client" && (
        <p role="alert" className={styles.error}>
          {clients.error.message}
        </p>
      )}
      <ActionButton
        primary
        disabled={disabled || !name.trim() || (scope === "client" && !clientId)}
        onClick={save}
      >
        {update.pending ? "Saving…" : "Save settings"}
      </ActionButton>
    </div>
  );
}
