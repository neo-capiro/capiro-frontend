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
  familyRows,
  relationRow,
  type ConnectionsRead,
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
];
const relationColumns: readonly DataColumn<DataAccessRelationRow>[] = [
  { key: "name", label: "Data", width: 300, render: (row) => row.name },
  {
    key: "state",
    label: "State",
    width: 170,
    render: (row) => (
      <StatusPill tone={row.state.tone}>{row.state.label}</StatusPill>
    ),
  },
];
const checked = (iso: string) => `${iso.slice(0, 16).replace("T", " ")} UTC`;

/** Preferences → Data access: a read-only view of Meri's answer; nothing here changes a setting or connects a provider. */
export function DataAccessScreen({
  chrome,
  page,
  clientName,
  connections,
}: {
  chrome: SettingsChrome;
  page: DataAccessResponse;
  clientName: string;
  connections: ConnectionsRead;
}) {
  const families = familyRows(page.families, connections);
  const publicRelations = page.relations
    .filter((relation) => relation.source === "public")
    .map(relationRow);
  const clientRelations = page.relations
    .filter((relation) => relation.source === "client_records")
    .map(relationRow);
  return (
    <SettingsLayout
      chrome={chrome}
      heading={dataAccessHeading}
      primary={
        <SettingsCard
          title="Sources"
          description={
            page.generalReads
              ? `${availableCount(families)} of ${families.length} sources are readable for ${clientName}, checked ${checked(page.checkedAt)}. Every read still checks your current access.`
              : `Reading sources is turned off for your role in this workspace, checked ${checked(page.checkedAt)}.`
          }
        >
          <DataTable
            caption={`Sources for ${clientName}`}
            columns={familyColumns}
            rows={families}
          />
          <p className={surfaces.caption}>
            Meri does not keep a record of its last successful read per source;
            each conversation shows the reads it made.
          </p>
        </SettingsCard>
      }
      supporting={
        <>
          <SettingsCard
            title="Data tables"
            description="The tables Meri can query directly. Client records need a selected client."
          >
            <h3 className={surfaces.sectionTitle}>Public</h3>
            <DataTable
              caption="Public data tables"
              columns={relationColumns}
              rows={publicRelations}
            />
            <h3 className={surfaces.sectionTitle}>Client records</h3>
            <DataTable
              caption="Client record data tables"
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
