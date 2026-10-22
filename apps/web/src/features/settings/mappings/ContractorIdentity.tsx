"use client";

import { useState } from "react";
import type { OperationResponse } from "../../../shared/capiro/contracts";
import type { mappingOperations } from "../../../shared/capiro/operations/settings-admin/mappings";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  Badge,
  DataTable,
  StatusPanel,
  TextArea,
} from "../../../shared/module-ui";
import {
  SettingFacts,
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";
import { useSettingsMutation } from "../useSettingsMutation";
import { SettingsMutationNotice } from "../SettingsMutationNotice";
import {
  basisLabel,
  mappingRelationships,
  type MappingRelationship,
} from "./presentation";

type Candidate = OperationResponse<
  (typeof mappingOperations)["settings.mappings.contractorCandidates"]
>["candidates"][number];

export function ContractorIdentity({
  clientId,
  onClose,
  refresh,
}: {
  clientId: string;
  onClose: () => void;
  refresh: () => void;
}) {
  const { api, action, pending, reconcile, locked } = useSettingsMutation(
    "contractor-identity",
  );
  const query = useCapiroQuery("settings.mappings.contractorCandidates", {
    params: { clientId },
  });
  const [candidate, setCandidate] = useState<Candidate>();
  const [relationship, setRelationship] = useState<MappingRelationship | "">(
    "",
  );
  const [rollUp, setRollUp] = useState<"yes" | "no" | "">("");
  const [reason, setReason] = useState("");
  const reload = () => {
    query.reload();
    refresh();
  };
  return (
    <SettingsDialog
      busy={action.busy}
      open
      side="right"
      onClose={onClose}
      title="Client contractor identity"
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <>
            <SettingFacts
              items={[
                ["Client", query.data.client.name],
                ["UEI", query.data.client.uei],
                ["CAGE", query.data.client.cageCode],
              ]}
            />
            <SettingsButton
              disabled={locked}
              onClick={() =>
                void action.run(
                  (signal) =>
                    api.request(
                      "settings.mappings.resolveClient",
                      {
                        params: { clientId },
                      },
                      { signal },
                    ),
                  "Client candidate search completed.",
                  reload,
                )
              }
            >
              Resolve this client
            </SettingsButton>
            <DataTable
              rows={query.data.candidates}
              rowKey={(row) => row.contractorId}
              caption="Contractor identity candidates"
              columns={[
                {
                  key: "name",
                  label: "External record",
                  render: (row) => row.contractorName,
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
                  key: "status",
                  label: "Status",
                  render: (row) => (
                    <Badge>{row.mapping?.reviewStatus ?? "Candidate"}</Badge>
                  ),
                },
                {
                  key: "review",
                  label: "Actions",
                  render: (row) => (
                    <SettingsButton
                      disabled={locked}
                      small
                      onClick={() => {
                        setCandidate(row);
                        setRelationship("");
                        setRollUp("");
                        setReason("");
                        action.clear();
                      }}
                    >
                      Review individually
                    </SettingsButton>
                  ),
                },
              ]}
            />
          </>
        )}
      </StatusPanel>
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      {action.error && (
        <SettingsNotice title="Identity action failed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsDialog
        busy={action.busy}
        open={!!candidate}
        onClose={() => setCandidate(undefined)}
        title={candidate?.contractorName ?? "Contractor candidate"}
        description="Decide the relationship and award attribution explicitly before confirming."
        footer={
          <>
            <SettingsButton
              disabled={locked}
              onClick={() => setCandidate(undefined)}
              disabled={locked}
            >
              Cancel
            </SettingsButton>
            <SettingsButton
              danger
              disabled={locked}
              onClick={() => {
                if (candidate)
                  void action.run(
                    (signal) =>
                      api.request(
                        "settings.mappings.rejectContractorCandidate",
                        {
                          params: { clientId },
                          body: {
                            source: "contracting",
                            externalId: candidate.contractorId,
                            externalName: candidate.contractorName,
                            ...(reason ? { reason } : {}),
                          },
                        },
                        { signal },
                      ),
                    "Contractor candidate was rejected.",
                    () => {
                      setCandidate(undefined);
                      reload();
                    },
                  );
              }}
            >
              Reject
            </SettingsButton>
            <SettingsButton
              primary
              disabled={locked || !relationship || !rollUp}
              onClick={() => {
                if (candidate)
                  void action.run(
                    (signal) =>
                      candidate.mapping
                        ? api.request(
                            "settings.mappings.confirmIndividual",
                            {
                              params: { mappingId: candidate.mapping.id },
                              body: {
                                confirmed: true,
                                relationshipType:
                                  relationship as MappingRelationship,
                                rollUpAwards: rollUp === "yes",
                              },
                            },
                            { signal },
                          )
                        : api.request(
                            "settings.mappings.manual",
                            {
                              params: { clientId },
                              body: {
                                source: "contracting",
                                externalId: candidate.contractorId,
                                externalName: candidate.contractorName,
                                relationshipType:
                                  relationship as MappingRelationship,
                                rollUpAwards: rollUp === "yes",
                              },
                            },
                            { signal },
                          ),
                    (result) =>
                      result.confirmed
                        ? "Contractor identity was confirmed."
                        : "The service did not confirm this identity.",
                    () => {
                      setCandidate(undefined);
                      reload();
                    },
                  );
              }}
            >
              Confirm identity
            </SettingsButton>
          </>
        }
      >
        <SettingFacts
          items={[
            ["Match basis", basisLabel(candidate?.matchBasis ?? null)],
            ["Tier", candidate?.matchTier],
            [
              "Exact identifiers",
              candidate?.explanation
                ? Object.entries(candidate.explanation.exactIdentifiers)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" · ")
                : "—",
            ],
            [
              "Corroboration",
              candidate?.explanation?.corroborators.join(" · "),
            ],
            ["Conflicts", candidate?.explanation?.conflicts.join(" · ")],
          ]}
        />
        <SettingsCard title="Award footprint">
          <SettingFacts
            items={[
              ["Award count", candidate?.explanation?.awardCount],
              [
                "Total obligated",
                candidate?.explanation?.totalObligated === null ||
                candidate?.explanation?.totalObligated === undefined
                  ? "—"
                  : new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(candidate.explanation.totalObligated),
              ],
              ["Latest award", candidate?.explanation?.latestAwardDate],
              ["Source synced", candidate?.explanation?.sourceSyncedAt],
            ]}
          />
        </SettingsCard>
        <SettingField label="Relationship to client">
          <select
            disabled={locked}
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
            disabled={locked}
            className={styles.input}
            value={rollUp}
            onChange={(event) => setRollUp(event.target.value as typeof rollUp)}
          >
            <option value="">Choose explicitly</option>
            <option value="yes">Yes, attribute awards to this client</option>
            <option value="no">No, keep awards separate</option>
          </select>
        </SettingField>
        <SettingField label="Rejection reason (optional)">
          <TextArea
            disabled={locked}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </SettingField>
        <SettingsMutationNotice
          pending={pending}
          busy={action.busy}
          reconcile={reconcile}
        />
        {action.error && (
          <SettingsNotice title="Contractor review failed" error>
            {action.error}
          </SettingsNotice>
        )}
      </SettingsDialog>
    </SettingsDialog>
  );
}
