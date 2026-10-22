"use client";

import { useState } from "react";
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
import { confirmReviewedMappings } from "./bulkReview";
import { AttachFederalRecord } from "./AttachFederalRecord";
import { ContractorIdentity } from "./ContractorIdentity";
import { MappingReview } from "./MappingReview";
import {
  basisLabel,
  eligibleForBulkReview,
  mappingSources,
  type Mapping,
} from "./presentation";

export function MappingSettings() {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("mappings");
  const query = useCapiroQuery("settings.mappings.list", {});
  const clients = useCapiroQuery("clients.list", {});
  const [clientId, setClientId] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [basis, setBasis] = useState("");
  const [status, setStatus] = useState("");
  const [review, setReview] = useState<Mapping>();
  const [attach, setAttach] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [identity, setIdentity] = useState<string>();
  const rows = (query.data ?? []).filter(
    (row) =>
      (!clientId || row.clientId === clientId) &&
      (!source || row.source === source) &&
      (!basis || row.matchBasis === basis) &&
      (!status || row.reviewStatus === status) &&
      `${row.clientName ?? ""} ${row.externalName}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const eligible = rows.filter(eligibleForBulkReview);
  const summary = (result: {
    mappingsCreated: number;
    autoConfirmed: number;
    needsReview: number;
  }) =>
    `${result.mappingsCreated} mappings found; ${result.autoConfirmed} exact matches confirmed; ${result.needsReview} need review.`;
  async function confirmEligible(signal: AbortSignal) {
    try {
      return await confirmReviewedMappings(
        eligible,
        signal,
        (mappingId, currentSignal) =>
          api.request(
            "settings.mappings.confirmIndividual",
            { params: { mappingId }, body: { confirmed: true } },
            { signal: currentSignal },
          ),
      );
    } catch (cause) {
      if (!signal.aborted) query.reload();
      throw cause;
    }
  }
  return (
    <div className={styles.stack} data-design-target="411:74020">
      <SettingsCard
        title="Intelligence Mappings"
        action={
          <div className={`${styles.row} ${styles.wrap}`}>
            <SettingsButton disabled={locked} onClick={() => setAttach(true)}>
              Add mapping manually
            </SettingsButton>
            <SettingsButton
              disabled={locked}
              onClick={() =>
                void action.run(
                  (signal) =>
                    api.request(
                      "settings.mappings.exactIdentifiers",
                      {},
                      { signal },
                    ),
                  summary,
                  query.reload,
                )
              }
            >
              Find exact identifier matches
            </SettingsButton>
            <SettingsButton
              primary
              disabled={locked}
              onClick={() =>
                void action.run(
                  (signal) =>
                    api.request("settings.mappings.resolveAll", {}, { signal }),
                  summary,
                  query.reload,
                )
              }
            >
              Resolve All Clients
            </SettingsButton>
          </div>
        }
      >
        <h3>Filters</h3>
        <div className={styles.grid}>
          <SettingField label="Client">
            <select
              disabled={locked}
              className={styles.input}
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">All clients</option>
              {(clients.data ?? []).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </SettingField>
          <SettingField label="Search">
            <TextInput
              disabled={locked}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search client or external name…"
            />
          </SettingField>
          <SettingField label="Source">
            <select
              disabled={locked}
              className={styles.input}
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="">All sources</option>
              {Array.from(
                new Set((query.data ?? []).map((row) => row.source)),
              ).map((value) => (
                <option key={value} value={value}>
                  {mappingSources.find((item) => item.id === value)?.label ??
                    value}
                </option>
              ))}
            </select>
          </SettingField>
          <SettingField label="Match basis">
            <select
              disabled={locked}
              className={styles.input}
              value={basis}
              onChange={(event) => setBasis(event.target.value)}
            >
              <option value="">All bases</option>
              {Array.from(
                new Set(
                  (query.data ?? [])
                    .map((row) => row.matchBasis)
                    .filter((value) => !!value),
                ),
              ).map((value) => (
                <option key={value} value={value!}>
                  {basisLabel(value)}
                </option>
              ))}
            </select>
          </SettingField>
          <SettingField label="Status">
            <select
              disabled={locked}
              className={styles.input}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              {["candidate", "confirmed", "rejected", "superseded"].map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ),
              )}
            </select>
          </SettingField>
        </div>
        <div className={styles.row}>
          <SettingsButton
            disabled={locked || !eligible.length}
            onClick={() => setBulk(true)}
          >
            Confirm All ≥ 60%
          </SettingsButton>
          <p className={styles.description}>
            Federal-contractor, assistance-recipient and PAC-committee mappings
            always need individual review.
          </p>
        </div>
        <StatusPanel
          loading={query.loading || clients.loading}
          error={query.error ?? clients.error}
          onRetry={() => {
            query.reload();
            clients.reload();
          }}
        >
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            caption="Client intelligence mappings"
            emptyMessage="No mappings match these filters. Resolve clients or attach a federal record to get started."
            columns={[
              {
                key: "client",
                label: "Client",
                render: (row) => (
                  <SettingsButton
                    disabled={locked}
                    small
                    onClick={() => setIdentity(row.clientId)}
                  >
                    {row.clientName ??
                      clients.data?.find((client) => client.id === row.clientId)
                        ?.name ??
                      "Client"}
                  </SettingsButton>
                ),
              },
              {
                key: "source",
                label: "Source",
                render: (row) =>
                  mappingSources.find((item) => item.id === row.source)
                    ?.label ?? row.source,
              },
              {
                key: "external",
                label: "External name",
                render: (row) => row.externalName,
              },
              {
                key: "basis",
                label: "Match basis",
                render: (row) => basisLabel(row.matchBasis),
              },
              {
                key: "confidence",
                label: "Confidence",
                render: (row) => `${Math.round(row.confidence * 100)}%`,
              },
              {
                key: "review",
                label: "Confirmed",
                render: (row) => (
                  <SettingsButton
                    disabled={locked}
                    small
                    onClick={() => setReview(row)}
                  >
                    <Badge
                      tone={
                        row.confirmed
                          ? "success"
                          : row.reviewStatus === "rejected"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {row.confirmed
                        ? "Confirmed"
                        : row.reviewStatus === "candidate"
                          ? "Review individually"
                          : row.reviewStatus}
                    </Badge>
                  </SettingsButton>
                ),
              },
              {
                key: "updated",
                label: "Updated",
                render: (row) => new Date(row.updatedAt).toLocaleDateString(),
              },
            ]}
          />
          <p className={styles.description}>
            {rows.length} mappings shown ·{" "}
            {rows.filter((row) => row.confirmed).length} confirmed ·{" "}
            {eligible.length} bulk-review eligible
          </p>
        </StatusPanel>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Mapping action failed" error>
            {action.error}
          </SettingsNotice>
        )}
        {action.message && <SettingsNotice title={action.message} />}
      </SettingsCard>
      {review && (
        <MappingReview
          mapping={review}
          onClose={() => setReview(undefined)}
          refresh={query.reload}
        />
      )}
      {attach && (
        <AttachFederalRecord
          initialClientId={clientId}
          onClose={() => setAttach(false)}
          refresh={query.reload}
        />
      )}
      {identity && (
        <ContractorIdentity
          clientId={identity}
          onClose={() => setIdentity(undefined)}
          refresh={query.reload}
        />
      )}
      <SettingsDialog
        busy={action.busy}
        open={bulk}
        onClose={() => setBulk(false)}
        title={`Confirm ${eligible.length} mappings?`}
        description="Only the eligible candidates currently shown by your filters are included. Each confirmation is a separate reviewed backend request."
        footer={
          <>
            <SettingsButton disabled={locked} onClick={() => setBulk(false)}>
              Cancel
            </SettingsButton>
            <SettingsButton
              primary
              disabled={locked || !eligible.length}
              onClick={() =>
                void action.run(
                  confirmEligible,
                  (count) => `${count} mappings confirmed.`,
                  () => {
                    setBulk(false);
                    query.reload();
                  },
                )
              }
            >
              Confirm eligible mappings
            </SettingsButton>
          </>
        }
      >
        <p>
          Contractor, assistance-recipient and PAC-committee records are
          excluded.
        </p>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Bulk review stopped" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
    </div>
  );
}
