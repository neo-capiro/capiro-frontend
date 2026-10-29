"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { StatusPanel } from "../../../shared/module-ui";
import { SettingField, SettingsCard, SettingsTabs } from "../components";
import styles from "../styles";
import { MemoryDraftEditor } from "./drafts/MemoryDraftEditor";

type EditorPolicy = {
  readOnly?: boolean;
  reviewEnabled?: boolean;
  onSubmitted?: () => void;
};
export function MemoryFiles({
  readOnly = false,
  reviewEnabled = false,
  onSubmitted,
}: EditorPolicy) {
  const catalog = useCapiroQuery("settings.memory.files.catalog", {});
  const [scope, setScope] = useState("firm");
  const [selectedType, setSelectedType] = useState("");
  const definitions =
    catalog.data?.filter((file) => file.scope === scope) ?? [];
  const selected =
    definitions.find((file) => file.type === selectedType) ?? definitions[0];
  return (
    <SettingsCard title="Memory files">
      <SettingsTabs
        label="Memory file owner"
        value={scope}
        onChange={setScope}
        items={[
          { id: "firm", label: "Firm" },
          { id: "user", label: "My files" },
          { id: "client", label: "Client files" },
        ]}
      />
      <StatusPanel
        loading={catalog.loading}
        error={catalog.error}
        onRetry={catalog.reload}
      >
        <SettingField label="Canonical file">
          <select
            className={styles.input}
            value={selected?.type ?? ""}
            onChange={(event) => setSelectedType(event.target.value)}
          >
            {definitions.map((file) => (
              <option key={file.type} value={file.type}>
                {file.label}
              </option>
            ))}
          </select>
        </SettingField>
        {selected && (
          <>
            <p>{selected.blurb}</p>
            {scope === "client" ? (
              <ClientFile
                key={selected.type}
                type={selected.type}
                readOnly={readOnly}
                reviewEnabled={reviewEnabled}
                onSubmitted={onSubmitted}
              />
            ) : (
              <MemoryDraftEditor
                key={`${scope}:${selected.type}`}
                type={selected.type}
                slug={scope === "user" ? "me" : "firm"}
                readOnly={readOnly}
                reviewEnabled={reviewEnabled}
                onSubmitted={onSubmitted}
              />
            )}
          </>
        )}
      </StatusPanel>
    </SettingsCard>
  );
}

function ClientFile({
  type,
  readOnly = false,
  reviewEnabled = false,
  onSubmitted,
}: { type: string } & EditorPolicy) {
  const clients = useCapiroQuery("clients.list", {});
  const [clientId, setClientId] = useState("");
  const selected = clients.data?.find(
    (client) => client.id === clientId && client.status !== "archived",
  );
  return (
    <StatusPanel
      loading={clients.loading}
      error={clients.error}
      onRetry={clients.reload}
    >
      <SettingField label="Active client">
        <select
          className={styles.input}
          value={selected?.id ?? ""}
          onChange={(event) => setClientId(event.target.value)}
        >
          <option value="">Choose a client</option>
          {clients.data
            ?.filter((client) => client.status !== "archived")
            .map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
        </select>
      </SettingField>
      {selected && (
        <MemoryDraftEditor
          key={`${type}:${selected.id}`}
          type={type}
          slug={selected.id}
          readOnly={readOnly}
          reviewEnabled={reviewEnabled}
          onSubmitted={onSubmitted}
        />
      )}
    </StatusPanel>
  );
}
