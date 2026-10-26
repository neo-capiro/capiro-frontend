"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useClients } from "../../shared/portfolio/api/clients";
import { useSelectedClient } from "../../shared/session/SelectedClient";
import { scopedHref } from "../../shared/session/client-route";
import { MeriDialog } from "./ui/MeriDialog";
import {
  ScopeChoice,
  type ScopeOption,
} from "./screens/conversation/ScopeChoice";
import ui from "./ui/meri-ui.module.css";
import styles from "./MeriClientSelector.module.css";

type ClientScope = { tenantId: string; userId: string };
type Destination = "/meri" | "/meri/conversations";
type RosterClient = { id: string; name: string; status: string };
type Roster = {
  isSuccess?: boolean;
  isPending?: boolean;
  isFetching?: boolean;
  error?: unknown;
  data?: readonly RosterClient[] | undefined;
  refetch?: () => unknown;
};

export const GENERAL_SCOPE_ID = "general";
/** Figma 01.03 data-scope rows; Core decides what each scope actually returns. */
const CLIENT_DATA_SCOPE = [
  "Client records and timelines",
  "Approved institutional memory",
  "Authorized mailboxes and documents",
  "Public sources",
] as const;
const GENERAL_DATA_SCOPE = [
  "Permitted firm sources",
  "Personal files",
  "Public sources",
] as const;

/** General first, then the returned non-archived clients; nothing here grants access. */
export function scopeOptions(
  clients: readonly RosterClient[],
): readonly ScopeOption[] {
  return [
    {
      id: GENERAL_SCOPE_ID,
      name: "General workspace",
      detail: "Your permitted firm sources and personal files",
      dataScope: GENERAL_DATA_SCOPE,
    },
    ...clients
      .filter((client) => client.status !== "archived")
      .map((client) => ({
        id: client.id,
        name: client.name.trim() || "Unnamed client",
        detail: "Authorized client workspace",
        dataScope: CLIENT_DATA_SCOPE,
      })),
  ];
}

export function scopeHref(destination: Destination, scopeId: string) {
  return scopeId === GENERAL_SCOPE_ID
    ? `${destination}?scope=general`
    : scopedHref(destination, scopeId);
}

/** The roster supplies navigation choices; Core verifies the selected client again. */
export function MeriClientSelector({
  scope,
  destination = "/meri",
}: {
  scope?: ClientScope;
  destination?: Destination;
}) {
  const selected = useSelectedClient();
  const params = useSearchParams();
  const general = params.get("scope") === "general" && !params.has("clientId");
  const clients = useClients({
    enabled: Boolean(scope),
    scope: scope ?? { tenantId: "", userId: "" },
  });
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const appliedId = general
    ? GENERAL_SCOPE_ID
    : selected.state === "authorized-client"
      ? selected.client.id
      : undefined;
  const label = general
    ? "General"
    : selected.state === "authorized-client"
      ? selected.client.name
      : "Choose a scope";
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className={ui.outline}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <ChevronDown aria-hidden />
        <span className={styles.label}>{label}</span>
      </button>
      <MeriDialog
        open={open}
        onOpenChange={setOpen}
        returnFocus={trigger}
        title="Choose a scope"
        description="Only clients and sources available to your account appear here."
        width="default"
      >
        <ScopeRoster
          verified={Boolean(scope)}
          roster={clients}
          destination={destination}
          appliedId={appliedId}
          onClose={() => setOpen(false)}
        />
      </MeriDialog>
    </>
  );
}

/** Dialog body: roster states stay truthful; "Use …" navigates through the existing scoped routes. */
export function ScopeRoster({
  verified,
  roster,
  destination,
  appliedId,
  onClose,
}: {
  verified: boolean;
  roster: Roster;
  destination: Destination;
  appliedId?: string | undefined;
  onClose: () => void;
}) {
  if (!verified)
    return <p role="status">Verify your account to see available clients.</p>;
  if (roster.isFetching || roster.isPending)
    return <p role="status">Loading available clients.</p>;
  if (roster.error || !roster.isSuccess)
    return (
      <div role="alert">
        <p>Available clients could not be loaded.</p>
        <button
          type="button"
          className={ui.outline}
          onClick={() => void roster.refetch?.()}
        >
          Retry clients
        </button>
      </div>
    );
  const options = scopeOptions(roster.data ?? []);
  return (
    <>
      {options.length === 1 && (
        <p role="status">
          No available clients were returned for your account.
        </p>
      )}
      <ScopeChoice
        options={options}
        appliedId={appliedId}
        onCancel={onClose}
        apply={(choice) =>
          choice ? (
            <Link
              className={ui.primary}
              href={scopeHref(destination, choice.id)}
              aria-current={choice.id === appliedId ? "page" : undefined}
              onClick={onClose}
            >
              Use {choice.name}
            </Link>
          ) : null
        }
      />
    </>
  );
}
