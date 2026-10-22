"use client";

import { useState } from "react";
import type { z } from "zod";
import {
  aliasType,
  type aliasSchema,
} from "../../../shared/capiro/operations/settings-admin/schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  Badge,
  DataTable,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsMutation } from "../useSettingsMutation";
import { SettingsMutationNotice } from "../SettingsMutationNotice";
import { MergePrograms, type MergeOption } from "./MergePrograms";

type Alias = z.infer<typeof aliasSchema>;
type AliasType = z.infer<typeof aliasType>;

export function AliasManager() {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("analyst-alias");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const programs = useCapiroQuery("settings.analyst.programs.search", {
    query: { q, limit: 100 },
  });
  const [programId, setProgramId] = useState("");
  const aliases = useCapiroQuery(
    "settings.analyst.aliases.list",
    { params: { programId } },
    { enabled: !!programId },
  );
  const duplicates = useCapiroQuery("settings.analyst.aliases.duplicates", {});
  const [editor, setEditor] = useState<{ alias?: Alias }>();
  const [remove, setRemove] = useState<Alias>();
  const [merge, setMerge] = useState<MergeOption[]>();
  const reload = () => {
    aliases.reload();
    duplicates.reload();
    programs.reload();
  };
  return (
    <div className={styles.stack} data-design-target="411:78057">
      <SettingsCard title="Alias manager">
        <form
          className={styles.row}
          onSubmit={(event) => {
            event.preventDefault();
            setQ(search);
          }}
        >
          <TextInput
            disabled={locked}
            className={styles.search}
            value={search}
            aria-label="Search programs"
            placeholder="Search programs by name or alias…"
            onChange={(event) => setSearch(event.target.value)}
          />
          <SettingsButton disabled={locked} type="submit">
            Search
          </SettingsButton>
          <select
            disabled={locked}
            className={styles.input}
            aria-label="Selected program"
            value={programId}
            onChange={(event) => setProgramId(event.target.value)}
          >
            <option value="">Select program</option>
            {(programs.data?.data ?? []).map((program) => (
              <option key={program.id} value={program.id}>
                {program.canonicalName} · {program.mdapCode ?? "No MDAP code"} ·{" "}
                {program.component ?? "No component"}
              </option>
            ))}
          </select>
          <SettingsButton
            primary
            disabled={!programId}
            onClick={() => setEditor({})}
          >
            Add alias
          </SettingsButton>
        </form>
        <StatusPanel
          loading={programs.loading}
          error={programs.error}
          onRetry={programs.reload}
        />
        <StatusPanel
          loading={aliases.loading}
          error={aliases.error}
          onRetry={aliases.reload}
        >
          <DataTable
            rows={aliases.data?.data ?? []}
            rowKey={(row) => row.id}
            caption="Program aliases"
            emptyMessage={
              programId
                ? "No aliases for this program."
                : "Select a program to view its aliases."
            }
            columns={[
              { key: "alias", label: "Alias", render: (row) => row.alias },
              {
                key: "type",
                label: "Type",
                render: (row) => <Badge>{row.aliasType}</Badge>,
              },
              {
                key: "source",
                label: "Source",
                render: (row) => row.source ?? "—",
              },
              {
                key: "confidence",
                label: "Confidence",
                render: (row) => `${Math.round(row.confidence * 100)}%`,
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className={styles.row}>
                    <SettingsButton
                      disabled={locked}
                      small
                      onClick={() => setEditor({ alias: row })}
                    >
                      Edit
                    </SettingsButton>
                    <SettingsButton
                      disabled={locked}
                      danger
                      small
                      onClick={() => setRemove(row)}
                    >
                      Delete
                    </SettingsButton>
                  </div>
                ),
              },
            ]}
          />
        </StatusPanel>
      </SettingsCard>
      <SettingsCard title="Duplicate-alias detector">
        <StatusPanel
          loading={duplicates.loading}
          error={duplicates.error}
          onRetry={duplicates.reload}
        >
          {duplicates.data?.data.length ? (
            duplicates.data.data.map((duplicate) => (
              <div className={styles.notice} key={duplicate.aliasNormalized}>
                <h3>{duplicate.aliasNormalized}</h3>
                {duplicate.programs.map((program) => (
                  <p
                    key={`${program.programId}:${program.aliasId}`}
                    className={styles.description}
                  >
                    {program.canonicalName ?? program.programId}{" "}
                    <Badge>{program.status ?? "Unknown"}</Badge>
                  </p>
                ))}
                <SettingsButton
                  small
                  disabled={
                    new Set(
                      duplicate.programs.map((program) => program.programId),
                    ).size < 2
                  }
                  onClick={() => setMerge(duplicate.programs)}
                >
                  Merge programs
                </SettingsButton>
              </div>
            ))
          ) : (
            <p className={styles.empty}>No duplicate aliases found.</p>
          )}
        </StatusPanel>
      </SettingsCard>
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      {action.error && (
        <SettingsNotice title="Alias action failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      {editor && (
        <AliasEditor
          programId={programId}
          initial={editor.alias}
          onClose={() => setEditor(undefined)}
          refresh={reload}
        />
      )}
      <SettingsDialog
        busy={action.busy}
        open={!!remove}
        onClose={() => setRemove(undefined)}
        title="Delete alias?"
        footer={
          <>
            <SettingsButton
              disabled={locked}
              onClick={() => setRemove(undefined)}
              disabled={locked}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              danger
              disabled={locked}
              onClick={() => {
                if (remove)
                  void action.run(
                    (signal) =>
                      api.request(
                        "settings.analyst.aliases.delete",
                        {
                          params: { id: remove.id },
                        },
                        { signal },
                      ),
                    "Alias was deleted.",
                    () => {
                      setRemove(undefined);
                      reload();
                    },
                  );
              }}
            >
              Delete alias
            </SettingsButton>
          </>
        }
      >
        <p>{remove?.alias}</p>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Alias deletion failed" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
      {merge && (
        <MergePrograms
          options={merge}
          onClose={() => setMerge(undefined)}
          refresh={reload}
        />
      )}
    </div>
  );
}

function AliasEditor({
  programId,
  initial,
  onClose,
  refresh,
}: {
  programId: string;
  initial?: Alias;
  onClose: () => void;
  refresh: () => void;
}) {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("analyst-alias");
  const [alias, setAlias] = useState(initial?.alias ?? "");
  const [type, setType] = useState<AliasType>(
    aliasType.safeParse(initial?.aliasType).success
      ? (initial?.aliasType as AliasType)
      : "canonical",
  );
  const [source, setSource] = useState(initial?.source ?? "");
  return (
    <SettingsDialog
      busy={action.busy}
      open
      onClose={onClose}
      title={initial ? "Edit alias" : "Add alias"}
      footer={
        <>
          <SettingsButton disabled={locked} onClick={onClose}>
            Cancel
          </SettingsButton>
          <SettingsButton
            primary
            type="submit"
            form="program-alias-editor"
            disabled={locked}
          >
            Save alias
          </SettingsButton>
        </>
      }
    >
      <form
        id="program-alias-editor"
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          void action.run(
            (signal) =>
              initial
                ? api.request(
                    "settings.analyst.aliases.update",
                    {
                      params: { id: initial.id },
                      body: { alias, aliasType: type },
                    },
                    { signal },
                  )
                : api.request(
                    "settings.analyst.aliases.add",
                    {
                      params: { programId },
                      body: {
                        alias,
                        aliasType: type,
                        ...(source ? { source } : {}),
                      },
                    },
                    { signal },
                  ),
            "Alias was saved.",
            () => {
              refresh();
              onClose();
            },
          );
        }}
      >
        <SettingField label="Alias">
          <TextInput
            disabled={locked}
            required
            maxLength={1000}
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
          />
        </SettingField>
        <SettingField label="Type">
          <select
            disabled={locked}
            className={styles.input}
            value={type}
            onChange={(event) => setType(event.target.value as AliasType)}
          >
            {aliasType.options.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </SettingField>
        <SettingField label="Source (optional)">
          <TextInput
            maxLength={1000}
            value={source}
            disabled={!!initial}
            onChange={(event) => setSource(event.target.value)}
          />
        </SettingField>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Alias could not be saved" error>
            {action.error}
          </SettingsNotice>
        )}
      </form>
    </SettingsDialog>
  );
}
