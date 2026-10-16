"use client";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import { PanelPair } from "./PanelPair";
import type { ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec } from "./types";
import tooling from "./tooling.module.css";

export type BrowserPermissionRow = {
  id: string;
  workflow: string;
  qualification: string;
  rights: string;
  availability: string;
};
export type BrowserPermissionsView = {
  description: string;
  change: { title: string; detail: string };
  permissions: readonly BrowserPermissionRow[];
  boundaries: readonly ToolingPanelView[];
  blocked: readonly string[];
  actions: readonly ActionSpec[];
};

const columns: readonly DataColumn<BrowserPermissionRow>[] = [
  {
    key: "workflow",
    label: "Workflow",
    width: 210,
    render: (row) => row.workflow,
  },
  {
    key: "qualification",
    label: "Qualification",
    width: 250,
    render: (row) => row.qualification,
  },
  {
    key: "rights",
    label: "Configured rights",
    width: 240,
    render: (row) => row.rights,
  },
  {
    key: "availability",
    label: "Current availability",
    width: 356,
    render: (row) => row.availability,
  },
];

/** 12.17 Browser permissions & qualification: configured support never overrides current grants. */
export function BrowserPermissionsScreen({
  view,
  backHref,
  unavailable,
}: {
  view: BrowserPermissionsView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Browser permissions"
      description={view.description}
      backHref={backHref}
      unavailable={unavailable}
    >
      <Notice title={view.change.title}>{view.change.detail}</Notice>
      <DataTable
        caption="Workflow support and current permission matrix"
        columns={columns}
        rows={view.permissions}
      />
      <PanelPair
        label="Browser authority and isolation"
        panels={view.boundaries}
        tone="muted"
        unavailable={unavailable}
      />
      <ActionRow
        label="Unavailable browser actions"
        actions={view.blocked.map((label) => ({
          label,
          variant: "ghost",
          blocked: true,
        }))}
        unavailable="Blocked by the current grant for this connection."
      />
      <ActionRow
        label="Browser detail navigation"
        actions={view.actions}
        unavailable={unavailable}
      />
      <p className={tooling.caption}>
        These records demonstrate permission states, not live provider
        qualification. Public access, sign-in, uploads, downloads and viewer
        support are individually evaluated; no universal authenticated website
        access is promised.
      </p>
    </ToolingPage>
  );
}
