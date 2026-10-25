"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { Prospect } from "../contracts";
import { clientSearchLimit, type ClientChoice } from "./api";
import { useLinkClients, useLinkProspect } from "./queries";
import styles from "./conversion.module.css";
import { NewClientConversion } from "./NewClientConversion";
import { ContactTransfer } from "../contact-transfer/public";

export function ProspectClientLink({ record }: { record: Prospect }) {
  const identity = useIdentity();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const linked = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (open && record.linkedClientId) linked.current?.focus();
  }, [open, record.linkedClientId]);
  const permitted = ["standard_user", "user_admin", "capiro_admin"].includes(
    identity.data?.role ?? "",
  );
  if (record.linkedClientId)
    return (
      <>
        <NewClientConversion
          record={record}
          returnFocus={() => linked.current?.focus()}
        />
        <Link
          ref={linked}
          className="button"
          href={`/portfolio/${record.linkedClientId}`}
        >
          Open linked client ↗
        </Link>
        <ContactTransfer record={record} />
      </>
    );
  return (
    <>
      <NewClientConversion
        record={record}
        returnFocus={() => linked.current?.focus()}
      />
      <button
        ref={trigger}
        className="button"
        disabled={!permitted || record.status !== "active"}
        onClick={() => setOpen(true)}
      >
        Link existing client
      </button>
      {open && (
        <ClientLinkDialog
          record={record}
          onClose={() => setOpen(false)}
          returnFocus={() => trigger.current?.focus()}
        />
      )}
    </>
  );
}

function ClientLinkDialog({
  record,
  onClose,
  returnFocus,
}: {
  record: Prospect;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const [search, setSearch] = useState(record.displayName.slice(0, 200));
  const [selection, setSelection] = useState<{
    term: string;
    client: ClientChoice;
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const query = useLinkClients(search);
  const mutation = useLinkProspect(record.id);
  const term = search.trim().slice(0, 200);
  const current =
    query.isSuccess && !query.error && term ? query.data : undefined;
  const selected =
    selection && selection.term === term
      ? current?.results.find(
          (client) =>
            client.id === selection.client.id &&
            client.name === selection.client.name &&
            client.canonicalEntityId === selection.client.canonicalEntityId,
        )
      : undefined;
  if (selection && !selected) {
    setSelection(null);
    setConfirmed(false);
  }
  return (
    <Dialog
      open
      title={`Link ${record.displayName} to a client`}
      description="Choose an existing client in your firm. Linking creates no new client and makes no charge."
      onOpenChange={(value) => {
        if (!value && !mutation.isPending) onClose();
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        returnFocus();
      }}
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (selected && confirmed && !mutation.isPending)
            mutation.mutate(selected.id);
        }}
      >
        <label>
          Find an existing client
          <input
            value={search}
            maxLength={200}
            disabled={mutation.isPending}
            onChange={(event) => {
              const next = event.target.value;
              if (next.trim().slice(0, 200) !== term) {
                setSelection(null);
                setConfirmed(false);
              }
              setSearch(next);
            }}
          />
        </label>
        <QueryState
          pending={Boolean(search.trim()) && query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
        {!search.trim() && <p className="muted">Enter a client name.</p>}
        {current && (
          <fieldset className={styles.choices} disabled={mutation.isPending}>
            <legend>Matching clients</legend>
            {current.results.length === 0 && (
              <p className="muted">No matching accessible clients.</p>
            )}
            {current.results.map((client) => (
              <label key={client.id} className={styles.choice}>
                <input
                  type="radio"
                  name="existing-client"
                  checked={selected?.id === client.id}
                  onChange={() => {
                    if (!current || mutation.isPending) return;
                    setSelection({ term, client });
                    setConfirmed(false);
                    // A failed current read revokes presentation, not a
                    // dispatched mutation's variables/outcome.
                    if (!mutation.isError) mutation.reset();
                  }}
                />
                {client.name}
              </label>
            ))}
            {current.results.length === clientSearchLimit && (
              <p className="muted">
                Showing up to {clientSearchLimit} matches. Refine your search.
              </p>
            )}
          </fieldset>
        )}
        {selected && (
          <label className={styles.choice}>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={mutation.isPending}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Link this prospect to {selected.name}.
          </label>
        )}
        <p className="muted">
          Prospect history, files and research remain on this record. After
          linking, you can explicitly review contact carry-over to this client.
        </p>
        <QueryState error={mutation.error} />
        <footer className={`row ${styles.footer}`}>
          <button
            type="button"
            className="button"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={!selected || !confirmed || mutation.isPending}
          >
            {mutation.isPending ? "Linking…" : "Confirm link"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
