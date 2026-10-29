"use client";
import { useId, useState } from "react";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { FormField } from "../../ui/FormField";
import ui from "../../ui/meri-ui.module.css";
import field from "../../ui/panel.module.css";
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
import {
  cardCommand,
  connectionEndAction,
  type ConnectDraft,
  type ConnectedServiceRow,
  type ConnectorReadState,
  type LibraryCard,
} from "../../../../shared/meri-connectors/view";

/** One category of the reviewed library, in catalog order. */
export type LibraryGroup = { category: string; cards: readonly LibraryCard[] };

export type ConnectorLibraryView = {
  heading: SettingsHeading;
  notice: SettingsNotice;
  /** Distinguishes a read in flight or failed from a genuinely empty connection list. */
  state: ConnectorReadState;
  groups: readonly LibraryGroup[];
  connected: {
    title: string;
    description: string;
    rows: readonly ConnectedServiceRow[];
  };
  /** The card whose setup fields are open, if any. */
  openCardId?: string | undefined;
  /** The row or card whose Core request is in flight, if any. */
  busyId?: string | undefined;
};

const connectedColumns: readonly DataColumn<ConnectedServiceRow>[] = [
  {
    key: "service",
    label: "Service",
    width: 150,
    render: (row) => row.service,
  },
  { key: "scope", label: "Scope", width: 170, render: (row) => row.scope },
  {
    key: "status",
    label: "Authorization",
    width: 140,
    render: (row) => row.status,
  },
  {
    key: "access",
    label: "Your access",
    width: 120,
    render: (row) => row.access,
  },
  { key: "tools", label: "Tools", width: 110, render: (row) => row.tools },
  {
    key: "lastSync",
    label: "Last checked",
    width: 110,
    render: (row) => row.lastSync,
  },
];

/**
 * A feature-local secret field.
 *
 * The shared `FormField` renders a plain text input, and a credential must not be shown on screen
 * while it is typed. This keeps the value out of sight without changing a shared component or
 * adding a place to store it: the draft lives only until this surface is re-mounted after settling.
 */
function SecretField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className={field.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="password"
        autoComplete="new-password"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/**
 * 09.07 Connected services — Capiro's reviewed external-service library.
 *
 * Every action here is a request to Core: the surface never records a connection, never treats a
 * stored row as a working one, and never shows a credential it was given. The connect step collects
 * only the fields the entry's own catalog definition asks for; an entry whose only transport is a
 * local command is not offered.
 *
 * End-of-connection wording follows the owner that performs it: an OAuth row's authorization is
 * revoked, while a token/none row is removed — the only path that also clears its stored key and
 * `enabled`.
 */
export function ConnectorLibraryScreen({
  chrome,
  view,
  outcome,
  onOpenCard,
  onConnect,
  onReauthorize,
  onDisconnect,
  onRefresh,
  onRetry,
}: {
  chrome: SettingsChrome;
  view: ConnectorLibraryView;
  outcome?: SettingsOutcome | undefined;
  onOpenCard?: (cardId: string) => void;
  onConnect?: (cardId: string, draft: ConnectDraft) => void;
  onReauthorize?: (connectorId: string) => void;
  onDisconnect?: (row: ConnectedServiceRow) => void;
  onRefresh?: () => void;
  /** Re-run the current read after a failed result. */
  onRetry?: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, ConnectDraft>>({});
  const busy = view.busyId;
  const draftFor = (cardId: string): ConnectDraft => drafts[cardId] ?? {};
  const setDraft = (cardId: string, field: keyof ConnectDraft, value: string) =>
    setDrafts((current) => ({
      ...current,
      [cardId]: { ...current[cardId], [field]: value },
    }));

  return (
    <SettingsLayout
      chrome={chrome}
      heading={view.heading}
      outcome={outcome}
      primary={
        <SettingsCard
          title={view.connected.title}
          description={view.connected.description}
        >
          <div className={ui.row}>
            <button
              type="button"
              className={ui.outline}
              onClick={onRefresh}
              disabled={onRefresh === undefined || busy !== undefined}
            >
              Refresh tool lists
            </button>
          </div>
          {view.state === "loading" ? (
            <p role="status">
              Reading the connected services for this account…
            </p>
          ) : view.state === "unavailable" ? (
            <>
              <p role="alert">
                The connected services for this account could not be read, so no
                connection is shown here. Nothing is known to be disconnected.
              </p>
              <div className={ui.row}>
                <button
                  type="button"
                  className={ui.outline}
                  onClick={onRetry}
                  disabled={onRetry === undefined}
                >
                  Try again
                </button>
              </div>
            </>
          ) : view.connected.rows.length ? (
            <DataTable
              caption={view.connected.title}
              columns={connectedColumns}
              rows={view.connected.rows}
            />
          ) : (
            <p className={ui.muted}>
              No external service is connected for this account yet.
            </p>
          )}
          {view.state === "ready"
            ? view.connected.rows.map((row) => (
                <div key={row.id} className={ui.row}>
                  {row.authType === "oauth" ? (
                    <button
                      type="button"
                      className={ui.ghost}
                      disabled={!row.canAuthorize || busy !== undefined}
                      onClick={() => onReauthorize?.(row.id)}
                    >
                      {row.status === "Reconnect required"
                        ? "Reconnect"
                        : "Re-authorize"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={ui.ghost}
                    disabled={!row.canManage || busy !== undefined}
                    onClick={() => onDisconnect?.(row)}
                  >
                    {connectionEndAction(row) === "revoke"
                      ? "Revoke authorization"
                      : "Remove connection"}
                  </button>
                  {row.detail ? (
                    <span className={styles.connectionStatus}>
                      {row.detail}
                    </span>
                  ) : null}
                </div>
              ))
            : null}
        </SettingsCard>
      }
      supporting={
        <>
          <SettingsCallout notice={view.notice} />
          {view.groups.map((group) => (
            <SettingsCard key={group.category} title={group.category}>
              {group.cards.map((card) => {
                const open = view.openCardId === card.id;
                const command = cardCommand(card, open);
                return (
                  <div key={card.id} className={styles.card}>
                    <p className={ui.muted}>
                      {card.name}
                      {card.verified ? " · Reviewed by Capiro" : ""} ·{" "}
                      {card.scope}
                    </p>
                    <p>{card.summary}</p>
                    {open && !card.connected ? (
                      <>
                        {card.inputs.endpoint ? (
                          <FormField
                            label="Server URL"
                            value={draftFor(card.id).endpoint ?? ""}
                            placeholder="https://"
                            onChange={(value) =>
                              setDraft(card.id, "endpoint", value)
                            }
                          />
                        ) : null}
                        {card.inputs.apiKey ? (
                          <SecretField
                            label="API key"
                            value={draftFor(card.id).authToken ?? ""}
                            onChange={(value) =>
                              setDraft(card.id, "authToken", value)
                            }
                          />
                        ) : null}
                        {card.inputs.oauthClient ? (
                          <>
                            <FormField
                              label="OAuth Client ID"
                              value={draftFor(card.id).oauthClientId ?? ""}
                              onChange={(value) =>
                                setDraft(card.id, "oauthClientId", value)
                              }
                            />
                            <SecretField
                              label="OAuth Client Secret"
                              value={draftFor(card.id).oauthClientSecret ?? ""}
                              onChange={(value) =>
                                setDraft(card.id, "oauthClientSecret", value)
                              }
                            />
                          </>
                        ) : null}
                        {card.setupNote ? (
                          <p className={ui.muted}>{card.setupNote}</p>
                        ) : null}
                      </>
                    ) : null}
                    <div className={ui.row}>
                      <button
                        type="button"
                        className={open ? ui.primary : ui.outline}
                        disabled={busy !== undefined || command.kind === "none"}
                        onClick={() => {
                          if (command.kind === "reauthorize")
                            onReauthorize?.(command.connectorId);
                          else if (command.kind === "connect")
                            onConnect?.(card.id, draftFor(card.id));
                          else if (command.kind === "open")
                            onOpenCard?.(card.id);
                        }}
                      >
                        {command.kind === "none"
                          ? "Refresh to manage"
                          : command.kind === "reauthorize"
                            ? card.authorization === "needs_reauth"
                              ? "Reconnect"
                              : "Re-authorize"
                            : command.kind === "connect"
                              ? "Connect"
                              : "Set up"}
                      </button>
                      {card.docsHref ? (
                        <a
                          className={ui.ghost}
                          href={card.docsHref}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Provider documentation
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </SettingsCard>
          ))}
        </>
      }
    />
  );
}
