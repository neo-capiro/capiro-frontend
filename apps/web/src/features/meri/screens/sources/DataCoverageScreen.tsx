"use client";
import { ChevronDown, Layers } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./sources.module.css";

export type SourceDomainRow = {
  id: string;
  domain: string;
  availability: string;
  lastRefresh: string;
  scope: string;
};
export type DataCoverageView = {
  client: string;
  domains: readonly SourceDomainRow[];
  enabledActions: readonly string[];
};

const columns: readonly DataColumn<SourceDomainRow>[] = [
  {
    key: "domain",
    label: "Source domain",
    width: 365,
    render: (row) => row.domain,
  },
  {
    key: "availability",
    label: "Availability",
    width: 180,
    render: (row) => row.availability,
  },
  {
    key: "refresh",
    label: "Last refresh",
    width: 200,
    render: (row) => row.lastRefresh,
  },
  { key: "scope", label: "Scope", width: 407, render: (row) => row.scope },
];

/** 05.02 Data access: per-domain availability, freshness and scope, checked on each retrieval. */
export function DataCoverageScreen({
  view,
  operationsHref,
  connectorHealthHref,
  limitationsHref,
  scopeHref,
  unavailable,
}: {
  view: DataCoverageView;
  operationsHref?: string | undefined;
  connectorHealthHref?: string | undefined;
  limitationsHref?: string | undefined;
  scopeHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Data access"
        description={`${view.client} · Current permissions checked for each retrieval`}
      />
      <div className={ui.row}>
        <LinkAction
          variant="outline"
          href={operationsHref}
          unavailable={unavailable}
        >
          Source operations
        </LinkAction>
      </div>
      <DataTable
        caption={`Source domains available to ${view.client}`}
        columns={columns}
        rows={view.domains}
      />
      <div className={ui.row} aria-label="Coverage actions">
        <LinkAction
          variant="outline"
          href={connectorHealthHref}
          unavailable={unavailable}
        >
          <Layers aria-hidden /> View connector health
        </LinkAction>
        <LinkAction
          variant="outline"
          href={limitationsHref}
          unavailable={unavailable}
        >
          View coverage limitations
        </LinkAction>
        <LinkAction variant="ghost" href={scopeHref} unavailable={unavailable}>
          <ChevronDown aria-hidden /> Change scope
        </LinkAction>
      </div>
      <section
        className={`${surfaces.panel} ${styles.capabilities}`}
        aria-labelledby="enabled-actions"
      >
        <h2 id="enabled-actions" className={surfaces.sectionTitle}>
          Enabled actions
        </h2>
        <p className={panel.body}>{view.enabledActions.join(" · ")}</p>
        <p className={surfaces.caption}>
          Reading a source does not grant permission to change it. Action access
          is checked separately.
        </p>
      </section>
    </div>
  );
}
