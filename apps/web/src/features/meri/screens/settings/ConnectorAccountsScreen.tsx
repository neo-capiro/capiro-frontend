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
import styles from "./settings.module.css";
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

export type GrantedScopeCard = {
  title: string;
  description: string;
  notice: SettingsNotice;
};

export type DisconnectTerms = { description: string; confirm: string };

/**
 * The supporting copy that belongs to one account row. The screen shows the entry
 * for the selected row, so scope, coverage and disconnect terms always describe
 * the account whose warning the user is reading.
 */
export type ConnectionAccountDetail = {
  id: string;
  grantedScope: GrantedScopeCard;
  coverage: SettingsNotice;
  disconnect: DisconnectTerms;
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
  /**
   * Route of the surface that owns provider connect, reconnect, sync and
   * disconnect for the current account. When present, this page links there
   * instead of offering an action it cannot perform or verify.
   */
  ownerHref?: string | undefined;
  /**
   * One entry per row, keyed by row id. The screen owns the selection and renders
   * the selected entry; the view-level copy below is the no-selection fallback.
   */
  accounts?: readonly ConnectionAccountDetail[] | undefined;
  grantedScope: GrantedScopeCard;
  unavailable: SettingsNotice;
  disconnect: DisconnectTerms;
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
  /**
   * The supporting copy describes the SELECTED row, not the first one. The
   * selection stays the single piece of state owned here; the host only supplies
   * one detail per row, so no second selection authority exists.
   */
  const detail = view.accounts?.find((account) => account.id === selectedId);
  const grantedScope = detail?.grantedScope ?? view.grantedScope;
  const coverage = detail?.coverage ?? view.unavailable;
  const disconnect = detail?.disconnect ?? view.disconnect;
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
            ownerHref={view.ownerHref}
            disconnectRef={disconnectButton}
            canDisconnect={Boolean(selected)}
            onDisconnect={() => setConfirming(true)}
          />
        </SettingsCard>
      }
      supporting={
        <>
          <SettingsCard
            title={grantedScope.title}
            description={grantedScope.description}
            emphasis
          >
            <SettingsCallout notice={grantedScope.notice} />
          </SettingsCard>
          <SettingsCallout notice={coverage} />
          {selected ? (
            <MeriDialog
              open={confirming}
              onOpenChange={setConfirming}
              title={
                view.ownerHref
                  ? `Disconnect ${selected.connection}?`
                  : `Disconnect the ${selected.connection.toLowerCase()}?`
              }
              description={disconnect.description}
              width="compact"
              returnFocus={disconnectButton}
            >
              {view.ownerHref ? (
                <div className={styles.stack}>
                  <LinkAction
                    variant="primary"
                    href={view.ownerHref}
                    unavailable={chrome.unavailable}
                  >
                    {disconnect.confirm}
                  </LinkAction>
                  <button
                    type="button"
                    className={ui.outline}
                    onClick={() => setConfirming(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <ConfirmActions
                  confirm={disconnect.confirm}
                  unavailable={chrome.unavailable}
                  onCancel={() => setConfirming(false)}
                />
              )}
            </MeriDialog>
          ) : null}
        </>
      }
    />
  );
}

/**
 * Reconnect opens the supported owner when the page is bound to one; coverage
 * navigates; Disconnect opens the confirmation for the selection.
 */
function ConnectionActions({
  chrome,
  coverageHref,
  ownerHref,
  disconnectRef,
  canDisconnect,
  onDisconnect,
}: {
  chrome: SettingsChrome;
  coverageHref?: string | undefined;
  ownerHref?: string | undefined;
  disconnectRef: RefObject<HTMLButtonElement | null>;
  canDisconnect: boolean;
  onDisconnect: () => void;
}) {
  return (
    <div className={`${ui.row} ${styles.actions}`}>
      {ownerHref ? (
        <LinkAction
          variant="primary"
          href={ownerHref}
          unavailable={chrome.unavailable}
        >
          Reconnect selected
        </LinkAction>
      ) : (
        <button
          type="button"
          className={ui.primary}
          disabled
          title={chrome.unavailable}
        >
          Reconnect selected
        </button>
      )}
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
