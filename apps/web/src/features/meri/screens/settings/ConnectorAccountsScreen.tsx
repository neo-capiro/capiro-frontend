"use client";
import { useRef, useState, type RefObject } from "react";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import { MeriDialog } from "../../ui/MeriDialog";
import ui from "../../ui/meri-ui.module.css";
import { ConfirmActions } from "./ConfirmActions";
import { SettingsCard } from "./SettingsCard";
import { SettingsCallout } from "./SettingsCallout";
import { SettingsLayout } from "./SettingsLayout";
import type {
  SettingsChrome,
  SettingsHeading,
  SettingsNotice,
  SettingsOutcome,
} from "./settings-view";

export type ConnectionRow = {
  id: string;
  connection: string;
  account: string;
  scope: string;
  refresh: string;
  health: string;
};

export type ConnectorAccountsView = {
  heading: SettingsHeading;
  connections: {
    title: string;
    description: string;
    rows: readonly ConnectionRow[];
    /** Rows are selectable only when there are account rows to act on. */
    initialSelectedId?: string | undefined;
  };
  coverageHref?: string | undefined;
  grantedScope: { title: string; description: string; notice: SettingsNotice };
  unavailable: SettingsNotice;
  disconnect: { description: string; confirm: string };
};

const columns: readonly DataColumn<ConnectionRow>[] = [
  {
    key: "connection",
    label: "Connection",
    width: 125,
    render: (row) => row.connection,
  },
  {
    key: "account",
    label: "Account / scope",
    width: 155,
    render: (row) => row.account,
  },
  {
    key: "scope",
    label: "Granted scope",
    width: 130,
    render: (row) => row.scope,
  },
  {
    key: "refresh",
    label: "Refresh",
    width: 100,
    render: (row) => row.refresh,
  },
  { key: "health", label: "Health", width: 100, render: (row) => row.health },
];

/** 09.02 Connector accounts and permissions, with the disconnect confirmation for the selected account. */
export function ConnectorAccountsScreen({
  chrome,
  view,
  outcome,
  disconnectOpen = false,
}: {
  chrome: SettingsChrome;
  view: ConnectorAccountsView;
  outcome?: SettingsOutcome | undefined;
  /** Fixture state: the confirmation is open when the page loads. */
  disconnectOpen?: boolean;
}) {
  const { connections } = view;
  const [selectedId, setSelectedId] = useState(connections.initialSelectedId);
  const [confirming, setConfirming] = useState(disconnectOpen);
  const disconnectButton = useRef<HTMLButtonElement>(null);
  const selected = connections.rows.find((row) => row.id === selectedId);
  return (
    <SettingsLayout
      chrome={chrome}
      heading={view.heading}
      outcome={outcome}
      primary={
        <SettingsCard
          title={connections.title}
          description={connections.description}
        >
          <DataTable
            caption={`${connections.title}; select a row to act on it`}
            columns={columns}
            rows={connections.rows}
            selectedId={selectedId}
            onSelect={connections.initialSelectedId ? setSelectedId : undefined}
          />
          <ConnectionActions
            chrome={chrome}
            coverageHref={view.coverageHref}
            disconnectRef={disconnectButton}
            canDisconnect={Boolean(selected)}
            onDisconnect={() => setConfirming(true)}
          />
        </SettingsCard>
      }
      supporting={
        <>
          <SettingsCard
            title={view.grantedScope.title}
            description={view.grantedScope.description}
            emphasis
          >
            <SettingsCallout notice={view.grantedScope.notice} />
          </SettingsCard>
          <SettingsCallout notice={view.unavailable} />
          {selected ? (
            <MeriDialog
              open={confirming}
              onOpenChange={setConfirming}
              title={`Disconnect the ${selected.connection.toLowerCase()}?`}
              description={view.disconnect.description}
              width="compact"
              returnFocus={disconnectButton}
            >
              <ConfirmActions
                confirm={view.disconnect.confirm}
                unavailable={chrome.unavailable}
                onCancel={() => setConfirming(false)}
              />
            </MeriDialog>
          ) : null}
        </>
      }
    />
  );
}

/** Reconnect stays disabled; coverage navigates; Disconnect opens the confirmation for the selection. */
function ConnectionActions({
  chrome,
  coverageHref,
  disconnectRef,
  canDisconnect,
  onDisconnect,
}: {
  chrome: SettingsChrome;
  coverageHref?: string | undefined;
  disconnectRef: RefObject<HTMLButtonElement | null>;
  canDisconnect: boolean;
  onDisconnect: () => void;
}) {
  return (
    <div className={ui.row}>
      <button
        type="button"
        className={ui.primary}
        disabled
        title={chrome.unavailable}
      >
        Reconnect selected
      </button>
      <LinkAction
        variant="outline"
        href={coverageHref}
        unavailable={chrome.unavailable}
      >
        View coverage
      </LinkAction>
      <button
        ref={disconnectRef}
        type="button"
        className={ui.outline}
        disabled={!canDisconnect}
        title={canDisconnect ? undefined : chrome.unavailable}
        onClick={onDisconnect}
      >
        Disconnect
      </button>
    </div>
  );
}
