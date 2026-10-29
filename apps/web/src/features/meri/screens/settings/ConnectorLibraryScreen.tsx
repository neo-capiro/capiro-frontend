"use client";
import { useState } from "react";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { FormField } from "../../ui/FormField";
import ui from "../../ui/meri-ui.module.css";
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
import type {
  ConnectDraft,
  ConnectedServiceRow,
  LibraryCard,
} from "../../../../shared/meri-connectors/view";

/** One category of the reviewed library, in catalog order. */
export type LibraryGroup = { category: string; cards: readonly LibraryCard[] };

export type ConnectorLibraryView = {
  heading: SettingsHeading;
  notice: SettingsNotice;
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
 * 09.07 Connected services — Capiro's reviewed external-service library.
 *
 * Every action here is a request to Core: the surface never records a connection, never treats a
 * stored row as a working one, and never shows a credential it was given. The connect step collects
 * only the fields the entry's own catalog definition asks for; a catalog entry the workspace has not
 * been given, or one whose only transport is a local command, is not offered.
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
}: {
  chrome: SettingsChrome;
  view: ConnectorLibraryView;
  outcome?: SettingsOutcome | undefined;
  onOpenCard?: (cardId: string) => void;
  onConnect?: (cardId: string, draft: ConnectDraft) => void;
  onReauthorize?: (connectorId: string) => void;
  onDisconnect?: (connectorId: string) => void;
  onRefresh?: () => void;
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
          {view.connected.rows.length ? (
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
          {view.connected.rows.map((row) => (
            <div key={row.id} className={ui.row}>
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
              <button
                type="button"
                className={ui.ghost}
                disabled={!row.canManage || busy !== undefined}
                onClick={() => onDisconnect?.(row.id)}
              >
                Disconnect
              </button>
              {row.detail ? (
                <span className={styles.connectionStatus}>{row.detail}</span>
              ) : null}
            </div>
          ))}
        </SettingsCard>
      }
      supporting={
        <>
          <SettingsCallout notice={view.notice} />
          {view.groups.map((group) => (
            <SettingsCard key={group.category} title={group.category}>
              {group.cards.map((card) => {
                const open = view.openCardId === card.id;
                return (
                  <div key={card.id} className={styles.card}>
                    <p className={ui.muted}>
                      {card.name}
                      {card.verified ? " · Reviewed by Capiro" : ""} ·{" "}
                      {card.scope}
                    </p>
                    <p>{card.summary}</p>
                    {open ? (
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
                          <FormField
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
                            <FormField
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
                        disabled={
                          busy !== undefined || card.action === "manage"
                        }
                        onClick={() =>
                          open
                            ? onConnect?.(card.id, draftFor(card.id))
                            : onOpenCard?.(card.id)
                        }
                      >
                        {card.action === "manage"
                          ? "Connected"
                          : card.action === "authorize"
                            ? "Re-authorize"
                            : open
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
