"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { StatusPanel } from "../../../shared/module-ui";
import {
  SettingField,
  SettingsCard,
  SettingsNotice,
  SettingsTabs,
} from "../components";
import styles from "../styles";

export function MemoryFiles() {
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
              <ClientFile key={selected.type} type={selected.type} />
            ) : (
              <FileSections
                key={`${scope}:${selected.type}`}
                type={selected.type}
                slug={scope === "user" ? "me" : "firm"}
              />
            )}
          </>
        )}
      </StatusPanel>
      <SettingsNotice title="Editing and submission unavailable">
        New proposals and corrections require the agreed ownership, retention
        and offboarding rules. Existing content is read from its canonical
        owner; no draft or candidate is created here.
      </SettingsNotice>
    </SettingsCard>
  );
}

function ClientFile({ type }: { type: string }) {
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
        <FileSections
          key={`${type}:${selected.id}`}
          type={type}
          slug={selected.id}
        />
      )}
    </StatusPanel>
  );
}

function FileSections({ type, slug }: { type: string; slug: string }) {
  const result = useCapiroQuery("settings.memory.files.sections", {
    params: { type, slug },
  });
  const file = result.data;
  return (
    <StatusPanel
      loading={result.loading}
      error={result.error}
      onRetry={result.reload}
    >
      {file && (file.type !== type || file.slug !== slug) && (
        <SettingsNotice error title="Memory file unavailable">
          The owner returned a different file. Reload before continuing.
        </SettingsNotice>
      )}
      {file && file.type === type && file.slug === slug && (
        <>
          <p>
            {file.visibility === "user"
              ? "Private personal file"
              : "Shared memory file"}
            .{" "}
            {file.exists
              ? `Last canonical update: ${file.updatedAt ?? "Unavailable"}.`
              : "This file has not been created."}
          </p>
          {file.pendingReview && (
            <SettingsNotice title="Submission pending review">
              Active content remains unchanged. The current pending proposal can
              be found in the Memory Governance Center’s Pending review tab.
            </SettingsNotice>
          )}
          {file.sections.map((section) => (
            <section key={section.key}>
              <h3>
                {type === "firm-soul" && section.key === "mission"
                  ? `Who we are · ${section.heading}`
                  : section.heading}
              </h3>
              <p className={styles.description}>
                {section.owner === "engine"
                  ? "Managed automatically"
                  : section.prompt}
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {section.body || "No content recorded for this section."}
              </p>
            </section>
          ))}
        </>
      )}
    </StatusPanel>
  );
}
