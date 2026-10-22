"use client";

import { useState } from "react";
import type { OperationResponse } from "../../../shared/capiro/contracts";
import type { analystOperations } from "../../../shared/capiro/operations/settings-admin/analyst";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, StatusPanel, TextInput } from "../../../shared/module-ui";
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
import { QueuePagination } from "./QueuePagination";

type Audit = OperationResponse<
  (typeof analystOperations)["settings.analyst.audit.list"]
>["data"][number];
type Quarantine = OperationResponse<
  (typeof analystOperations)["settings.analyst.quarantine.list"]
>["data"][number];

export function AnalystAuditLog() {
  const [draft, setDraft] = useState({ action: "", entityType: "" });
  const [filter, setFilter] = useState({ action: "", entityType: "" });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Audit>();
  const query = useCapiroQuery("settings.analyst.audit.list", {
    query: {
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
      page,
      limit: 25,
    },
  });
  return (
    <div className={styles.stack} data-design-target="411:78767">
      <SettingsCard title="Audit log">
        <form
          className={styles.row}
          onSubmit={(event) => {
            event.preventDefault();
            setFilter(draft);
            setPage(1);
          }}
        >
          <TextInput
            aria-label="Audit action"
            placeholder="action (e.g. program.merge)"
            maxLength={200}
            value={draft.action}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                action: event.target.value,
              }))
            }
          />
          <TextInput
            aria-label="Audit entity type"
            placeholder="entity type (e.g. program)"
            maxLength={200}
            value={draft.entityType}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                entityType: event.target.value,
              }))
            }
          />
          <SettingsButton primary type="submit">
            Apply filters
          </SettingsButton>
        </form>
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          <DataTable
            rows={query.data?.data ?? []}
            rowKey={(row) => row.id}
            caption="Capiro administration audit log"
            columns={[
              {
                key: "when",
                label: "When",
                render: (row) => new Date(row.occurredAt).toLocaleString(),
              },
              { key: "action", label: "Action", render: (row) => row.action },
              {
                key: "entity",
                label: "Entity",
                render: (row) => row.entityType,
              },
              {
                key: "id",
                label: "Entity ID",
                render: (row) => row.entityId ?? "—",
              },
              {
                key: "role",
                label: "Actor role",
                render: (row) => row.actorRole,
              },
              {
                key: "detail",
                label: "Detail",
                render: (row) => (
                  <SettingsButton small onClick={() => setDetail(row)}>
                    View
                  </SettingsButton>
                ),
              },
            ]}
          />
          {query.data && (
            <QueuePagination
              page={query.data.page}
              total={query.data.total}
              limit={query.data.limit}
              onChange={setPage}
            />
          )}
        </StatusPanel>
      </SettingsCard>
      <SettingsDialog
        open={!!detail}
        onClose={() => setDetail(undefined)}
        title="Audit detail"
      >
        <p>
          {detail?.action} · {detail?.entityType}
        </p>
        <p className={styles.description}>
          Actor {detail?.actorUserId} · {detail?.actorRole}
        </p>
        <h3>Before</h3>
        <pre className={styles.pre}>
          {JSON.stringify(detail?.before, null, 2)}
        </pre>
        <h3>After</h3>
        <pre className={styles.pre}>
          {JSON.stringify(detail?.after, null, 2)}
        </pre>
      </SettingsDialog>
    </div>
  );
}

export function QuarantineQueue() {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("analyst-quarantine");
  const [type, setType] = useState<"program_element" | "acquisition_personnel">(
    "program_element",
  );
  const [source, setSource] = useState("");
  const [appliedSource, setAppliedSource] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Quarantine>();
  const [discard, setDiscard] = useState<Quarantine>();
  const query = useCapiroQuery("settings.analyst.quarantine.list", {
    query: {
      type,
      ...(appliedSource ? { source: appliedSource } : {}),
      page,
      limit: 25,
    },
  });
  return (
    <div className={styles.stack} data-design-target="411:78602">
      <SettingsCard title="Quarantine">
        <form
          className={styles.row}
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedSource(source);
            setPage(1);
          }}
        >
          <SettingField label="Type">
            <select
              disabled={locked}
              className={styles.input}
              value={type}
              onChange={(event) => {
                setType(event.target.value as typeof type);
                setPage(1);
              }}
            >
              <option value="program_element">Program element</option>
              <option value="acquisition_personnel">
                Acquisition personnel
              </option>
            </select>
          </SettingField>
          <SettingField label="Source">
            <TextInput
              disabled={locked}
              maxLength={200}
              placeholder="Filter by source…"
              value={source}
              onChange={(event) => setSource(event.target.value)}
            />
          </SettingField>
          <SettingsButton disabled={locked} primary type="submit">
            Apply filter
          </SettingsButton>
        </form>
        <StatusPanel
          loading={query.loading}
          error={query.error}
          onRetry={query.reload}
        >
          <DataTable
            rows={query.data?.data ?? []}
            rowKey={(row) => row.id}
            caption="Quarantined source records"
            columns={[
              { key: "source", label: "Source", render: (row) => row.source },
              {
                key: "reason",
                label: "Reason",
                render: (row) => row.reason ?? "—",
              },
              {
                key: "date",
                label: "Quarantined",
                render: (row) => new Date(row.quarantinedAt).toLocaleString(),
              },
              {
                key: "raw",
                label: "Raw record",
                render: (row) => (
                  <SettingsButton
                    disabled={locked}
                    small
                    onClick={() => setDetail(row)}
                  >
                    View
                  </SettingsButton>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className={styles.row}>
                    <SettingsButton
                      small
                      disabled={locked}
                      onClick={() =>
                        void action.run(
                          (signal) =>
                            api.request(
                              "settings.analyst.quarantine.reprocess",
                              { params: { type, id: row.id } },
                              { signal },
                            ),
                          (result) =>
                            result.accepted
                              ? "The source record was accepted after reprocessing."
                              : `The record remains quarantined.${result.reason ? ` ${result.reason}` : ""}`,
                          query.reload,
                        )
                      }
                    >
                      Reprocess
                    </SettingsButton>
                    <SettingsButton
                      danger
                      small
                      disabled={locked}
                      onClick={() => {
                        setDiscard(row);
                        action.clear();
                      }}
                    >
                      Discard
                    </SettingsButton>
                  </div>
                ),
              },
            ]}
          />
          {query.data && (
            <QueuePagination
              page={query.data.page}
              total={query.data.total}
              limit={query.data.limit}
              onChange={setPage}
            />
          )}
        </StatusPanel>
      </SettingsCard>
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      {action.error && (
        <SettingsNotice title="Quarantine action failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsDialog
        busy={action.busy}
        open={!!detail}
        onClose={() => setDetail(undefined)}
        title="Raw record"
      >
        <p>
          {detail?.source} · {detail?.reason}
        </p>
        <pre className={styles.pre}>
          {JSON.stringify(detail?.rawRecord, null, 2)}
        </pre>
      </SettingsDialog>
      <SettingsDialog
        busy={action.busy}
        open={!!discard}
        onClose={() => setDiscard(undefined)}
        title="Discard quarantined record?"
        description="This removes the raw record from the quarantine queue and records your decision."
        footer={
          <>
            <SettingsButton
              onClick={() => setDiscard(undefined)}
              disabled={locked}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              danger
              disabled={locked}
              onClick={() => {
                if (discard)
                  void action.run(
                    (signal) =>
                      api.request(
                        "settings.analyst.quarantine.discard",
                        {
                          params: { type, id: discard.id },
                        },
                        { signal },
                      ),
                    "The quarantined record was discarded.",
                    () => {
                      setDiscard(undefined);
                      query.reload();
                    },
                  );
              }}
            >
              Discard
            </SettingsButton>
          </>
        }
      >
        <p>
          {discard?.source} · {discard?.reason}
        </p>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Discard failed" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
    </div>
  );
}
