"use client";

import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { StatusPanel, TextInput } from "../../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsAction } from "../useSettingsAction";
import {
  mappingRelationships,
  mappingSources,
  requiresAwardDecision,
  type MappingRelationship,
  type SearchableMappingSource,
} from "./presentation";
import { SourceSearch, type SelectedFederalRecord } from "./SourceSearch";

export function AttachFederalRecord({
  initialClientId,
  onClose,
  refresh,
}: {
  initialClientId: string;
  onClose: () => void;
  refresh: () => void;
}) {
  const api = useCapiro();
  const clients = useCapiroQuery("clients.list", {});
  const [clientId, setClientId] = useState(initialClientId);
  const [source, setSource] = useState<SearchableMappingSource>("lda");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<SelectedFederalRecord>();
  const [relationship, setRelationship] = useState<MappingRelationship | "">(
    "",
  );
  const [rollUp, setRollUp] = useState<"yes" | "no" | "">("");
  const action = useSettingsAction();
  const award = requiresAwardDecision(source);
  return (
    <SettingsDialog
      open
      onClose={onClose}
      title="Attach a federal record"
      description="Select the client, source and external record. This is an explicit identity decision."
      footer={
        <>
          <SettingsButton onClick={onClose} disabled={action.busy}>
            Cancel
          </SettingsButton>
          <SettingsButton
            primary
            disabled={
              action.busy ||
              !selected ||
              !clientId ||
              (award && (!relationship || !rollUp))
            }
            onClick={() => {
              if (selected)
                void action.run(
                  () =>
                    api.request("settings.mappings.manual", {
                      params: { clientId },
                      body: {
                        source,
                        externalId: selected.id,
                        externalName: selected.name,
                        ...(award
                          ? {
                              relationshipType:
                                relationship as MappingRelationship,
                              rollUpAwards: rollUp === "yes",
                            }
                          : {}),
                      },
                    }),
                  "Federal record was attached.",
                  () => {
                    refresh();
                    onClose();
                  },
                );
            }}
          >
            Attach record
          </SettingsButton>
        </>
      }
    >
      <StatusPanel
        loading={clients.loading}
        error={clients.error}
        onRetry={clients.reload}
      >
        <SettingField label="Client">
          <select
            className={styles.input}
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              setSelected(undefined);
            }}
          >
            <option value="">Choose client</option>
            {(clients.data ?? []).map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </SettingField>
      </StatusPanel>
      <SettingField label="Source">
        <select
          className={styles.input}
          value={source}
          onChange={(event) => {
            setSource(event.target.value as SearchableMappingSource);
            setSelected(undefined);
            setQ("");
            setSearch("");
            setRelationship("");
            setRollUp("");
          }}
        >
          {mappingSources.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </SettingField>
      <form
        className={styles.row}
        onSubmit={(event) => {
          event.preventDefault();
          setSelected(undefined);
          setQ(search.trim());
        }}
      >
        <div className={styles.grow}>
          <SettingField label="Search by name or supported identifier">
            <TextInput
              maxLength={1000}
              required
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </SettingField>
        </div>
        <SettingsButton type="submit">Search</SettingsButton>
      </form>
      <SourceSearch source={source} q={q} choose={setSelected} />
      {selected && (
        <SettingsNotice title="Selected external record">
          {selected.name} · {selected.id}
        </SettingsNotice>
      )}
      {award && (
        <>
          <SettingField label="Relationship to client">
            <select
              className={styles.input}
              value={relationship}
              onChange={(event) =>
                setRelationship(event.target.value as typeof relationship)
              }
            >
              <option value="">Choose relationship</option>
              {mappingRelationships.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </SettingField>
          <SettingField label="Roll up federal awards into this client?">
            <select
              className={styles.input}
              value={rollUp}
              onChange={(event) =>
                setRollUp(event.target.value as typeof rollUp)
              }
            >
              <option value="">Choose explicitly</option>
              <option value="yes">Yes, attribute awards to this client</option>
              <option value="no">No, keep awards separate</option>
            </select>
          </SettingField>
        </>
      )}
      {action.error && (
        <SettingsNotice title="Federal record could not be attached" error>
          {action.error}
        </SettingsNotice>
      )}
    </SettingsDialog>
  );
}
