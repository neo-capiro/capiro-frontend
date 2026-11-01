"use client";
import Link from "next/link";
import type { DataAccessResponse } from "@capiro/meri-client/data-access";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { StatusPill } from "../../ui/StatusPill";
import surfaces from "../../ui/surfaces.module.css";
import ui from "../../ui/meri-ui.module.css";
import { SettingsCard } from "./SettingsCard";
import { SettingsLayout } from "./SettingsLayout";
import type { SettingsChrome, SettingsHeading } from "./settings-view";
import {
  availableCount,
  familyRow,
  relationRow,
  type ConnectionSummary,
  type DataAccessFamilyRow,
  type DataAccessRelationRow,
} from "./data-access-view";

export const dataAccessHeading: SettingsHeading = {
  title: "Data access",
  description:
    "What Meri can read for the selected client right now, and why a source is not readable.",
};

const familyColumns: readonly DataColumn<DataAccessFamilyRow>[] = [
  {
    key: "family",
    label: "Source",
    width: 220,
    render: (row) => (
      <>
        <strong>{row.family}</strong>
        <br />
        <span className={ui.muted}>{row.covers}</span>
      </>
    ),
  },
  {
    key: "state",
    label: "State",
    width: 170,
    render: (row) => (
      <StatusPill tone={row.state.tone}>{row.state.label}</StatusPill>
    ),
  },
  {
    key: "freshness",
    label: "Freshness and version fields",
    width: 320,
    render: (row) => row.freshness,
  },
];
const relationColumns: readonly DataColumn<DataAccessRelationRow>[] = [
  { key: "name", label: "Relation", width: 300, render: (row) => row.name },
  {
    key: "state",
    label: "State",
    width: 170,
    render: (row) => (
      <StatusPill tone={row.state.tone}>{row.state.label}</StatusPill>
    ),
  },
];

/** Preferences → Data access: a read-only view over Meri's answer; nothing here changes policy or connects a provider. */
export function DataAccessScreen({
  chrome,
  page,
  clientName,
  connections,
}: {
  chrome: SettingsChrome;
  page: DataAccessResponse;
  clientName: string;
  connections: readonly ConnectionSummary[] | undefined;
}) {
  const families = page.families.map((family) =>
    familyRow(family, connections),
  );
  const publicRelations = page.relations
    .filter((relation) => relation.source === "public")
    .map(relationRow);
  const clientRelations = page.relations
    .filter((relation) => relation.source === "client_records")
    .map(relationRow);
  const available = availableCount(page.families, connections);
  return (
    <SettingsLayout
      chrome={chrome}
      heading={dataAccessHeading}
      primary={
        <SettingsCard
          title="Read families"
          description={
            page.generalReads
              ? `${available} of ${page.families.length} sources are readable for ${clientName}, checked ${page.checkedAt.slice(0, 16).replace("T", " ")} UTC. Every read still applies its own current-authority checks.`
              : `General reads are off by policy for your role in this workspace, checked ${page.checkedAt.slice(0, 16).replace("T", " ")} UTC.`
          }
        >
          <DataTable
            caption={`Read families for ${clientName}`}
            columns={familyColumns}
            rows={families}
          />
          <p className={surfaces.caption}>
            A last-successful-read time is not retained for these reads; the
            conversation that made a read keeps its own receipt.
          </p>
        </SettingsCard>
      }
      supporting={
        <>
          <SettingsCard
            title="SQL relations"
            description="The relations the describe path publishes for text-to-SQL. Client records need a selected client."
          >
            <h3 className={surfaces.sectionTitle}>Public</h3>
            <DataTable
              caption="Public SQL relations"
              columns={relationColumns}
              rows={publicRelations}
            />
            <h3 className={surfaces.sectionTitle}>Client records</h3>
            <DataTable
              caption="Client record SQL relations"
              columns={relationColumns}
              rows={clientRelations}
            />
          </SettingsCard>
          <SettingsCard
            title="Connections"
            description="Mailbox reads use your own provider connection; connected services list the connectors Meri can call. Connect or repair them on their own pages."
          >
            <p className={ui.row}>
              <Link href="/settings/preferences?page=connections">
                Connections
              </Link>
              <Link href="/settings/preferences?page=connected-services">
                Connected services
              </Link>
            </p>
          </SettingsCard>
        </>
      }
    />
  );
}
