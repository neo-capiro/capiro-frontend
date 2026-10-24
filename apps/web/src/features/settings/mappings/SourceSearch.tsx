"use client";

import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, StatusPanel } from "../../../shared/module-ui";
import { SettingsButton, SettingsNotice } from "../components";
import type { SearchableMappingSource } from "./presentation";

export type SelectedFederalRecord = { id: string; name: string };
type RecordOption = SelectedFederalRecord & { detail: string };

export function SourceSearch({
  source,
  q,
  choose,
  disabled = false,
}: {
  source: SearchableMappingSource;
  q: string;
  choose: (record: SelectedFederalRecord) => void;
  disabled?: boolean;
}) {
  const lda = useCapiroQuery(
    "settings.mappings.searchLda",
    { query: { q } },
    { enabled: source === "lda" && !!q },
  );
  const employer = useCapiroQuery(
    "settings.mappings.searchEmployers",
    { query: { q } },
    { enabled: source === "fec_employer" && !!q },
  );
  const committee = useCapiroQuery(
    "settings.mappings.searchCommittees",
    { query: { q } },
    { enabled: source === "fec_committee" && !!q },
  );
  const contractor = useCapiroQuery(
    "settings.mappings.searchContractors",
    { query: { q } },
    { enabled: source === "contracting" && !!q },
  );
  const recipient = useCapiroQuery(
    "settings.mappings.searchRecipients",
    { query: { q } },
    { enabled: source === "assistance_recipient" && !!q },
  );
  const queries = {
    lda,
    fec_employer: employer,
    fec_committee: committee,
    contracting: contractor,
    assistance_recipient: recipient,
  };
  const active = queries[source];
  const options: Record<SearchableMappingSource, RecordOption[]> = {
    lda: (lda.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      detail: `${row.totalFilings} filings · ${row.state ?? "State unavailable"} · latest ${row.latestFilingYear ?? "unknown"}`,
    })),
    fec_employer: (employer.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      detail: `${row.contributionCount} contributions · latest ${row.latestYear ?? "unknown"}`,
    })),
    fec_committee: (committee.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      detail: `${row.committeeType ?? "Type unavailable"} · ${row.active === true ? "Active" : row.active === false ? "Inactive" : "Status unavailable"} · ${row.id}`,
    })),
    contracting: (contractor.data?.results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      detail: `${row.uei ?? "UEI unavailable"} · ${row.matchedOnIdentifier ? "Identifier match" : "Name similarity"} · ${row.totalContracts ?? "Unknown"} contracts`,
    })),
    assistance_recipient: (recipient.data ?? [])
      .filter((row) => !!row.name)
      .map((row) => ({
        id: row.id,
        name: row.name!,
        detail: `${row.uei ?? "UEI unavailable"} · ${row.state ?? "State unavailable"} · ${row.awardCount} awards`,
      })),
  };
  if (!q)
    return (
      <SettingsNotice title="Search a federal record">
        Use the external name or supported identifier to find an exact record.
      </SettingsNotice>
    );
  return (
    <StatusPanel
      loading={active.loading}
      error={active.error}
      onRetry={active.reload}
    >
      {source === "contracting" && contractor.data?.unsupportedIdentifier && (
        <SettingsNotice title="Unsupported identifier">
          {contractor.data.unsupportedIdentifier}
        </SettingsNotice>
      )}
      <DataTable
        rows={options[source]}
        rowKey={(row) => row.id}
        caption="Federal source search results"
        emptyMessage="No matching records found."
        columns={[
          { key: "name", label: "Name", render: (row) => row.name },
          {
            key: "detail",
            label: "Source details",
            render: (row) => row.detail,
          },
          {
            key: "pick",
            label: "Actions",
            render: (row) => (
              <SettingsButton
                small
                disabled={disabled}
                onClick={() => {
                  if (!disabled) choose({ id: row.id, name: row.name });
                }}
              >
                Select record
              </SettingsButton>
            ),
          },
        ]}
      />
    </StatusPanel>
  );
}
