"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  ProfileCapacityStatus,
  useProfileCapacity,
} from "@/features/portfolio/billing/public";
import type { Prospect } from "../contracts";
import { useLinkClients } from "./queries";
import { useNewClientConversion } from "./useNewClientConversion";

export function NewClientConversion({
  record,
  returnFocus,
}: {
  record: Prospect;
  returnFocus: () => void;
}) {
  const identity = useIdentity();
  return (
    <ConversionSession
      key={`${identity.data?.tenant?.id}:${identity.data?.user.id}:${record.id}`}
      record={record}
      returnFocus={returnFocus}
    />
  );
}
function ConversionSession({
  record,
  returnFocus,
}: {
  record: Prospect;
  returnFocus: () => void;
}) {
  const flow = useNewClientConversion(record);
  const [open, setOpen] = useState(false),
    [reviewed, setReviewed] = useState(false);
  const [website, setWebsite] = useState(record.website ?? ""),
    [description, setDescription] = useState(record.description ?? "");
  const trigger = useRef<HTMLButtonElement>(null);
  const capacity = useProfileCapacity(open && !flow.pending);
  const duplicates = useLinkClients(
    open && !flow.pending ? record.displayName : "",
  );
  const matchesReady =
    duplicates.isSuccess && !duplicates.isFetching && !duplicates.error;
  const locked = flow.action.isPending || Boolean(flow.pending);
  if (record.linkedClientId && !flow.pending && !flow.error) return null;
  return (
    <>
      <button
        className="button"
        ref={trigger}
        disabled={!flow.ready || (!flow.pending && record.status !== "active")}
        onClick={() => {
          setReviewed(false);
          setOpen(true);
        }}
      >
        {flow.pending
          ? "Recover new-client conversion"
          : "Create client from prospect"}
      </button>
      {flow.error && <p role="alert">{flow.error}</p>}
      {open && (
        <Dialog
          open
          title={
            flow.pending
              ? "Recover new-client conversion"
              : `Create client from ${record.displayName}`
          }
          description="Review one new client. Conversion consumes one available client slot and makes no purchase. Contacts, files and research stay with the prospect."
          onOpenChange={(value) => {
            if (!flow.action.isPending) setOpen(value);
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (trigger.current) trigger.current.focus();
            else returnFocus();
          }}
        >
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (!locked && reviewed && matchesReady && capacity.allowed)
                flow.action.mutate({
                  kind: "create",
                  website,
                  description,
                  duplicates: duplicates.data.results,
                });
            }}
          >
            <label>
              Client name
              <input
                className="input"
                readOnly
                value={flow.pending?.command.clientName ?? record.displayName}
              />
            </label>
            <label>
              Website
              <input
                className="input"
                type="url"
                maxLength={2048}
                placeholder="Optional website"
                disabled={locked}
                value={
                  flow.pending
                    ? (flow.pending.command.clientWebsite ?? "")
                    : website
                }
                onChange={(event) => {
                  setWebsite(event.target.value);
                  setReviewed(false);
                }}
              />
            </label>
            <label>
              Description
              <textarea
                className="input"
                maxLength={600}
                disabled={locked}
                value={
                  flow.pending
                    ? (flow.pending.command.clientDescription ?? "")
                    : description
                }
                onChange={(event) => {
                  setDescription(event.target.value);
                  setReviewed(false);
                }}
              />
            </label>
            {!flow.pending && (
              <>
                <ProfileCapacityStatus capacity={capacity} />
                <section
                  aria-label="Possible existing clients"
                  className="stack"
                >
                  <h3>Possible existing clients</h3>
                  <QueryState
                    pending={duplicates.isFetching}
                    error={duplicates.error}
                    retry={() => void duplicates.refetch()}
                  />
                  {matchesReady &&
                    (duplicates.data.results.length ? (
                      <>
                        <ul>
                          {duplicates.data.results.map((client) => (
                            <li key={client.id}>{client.name}</li>
                          ))}
                        </ul>
                        <small>
                          Showing up to 30 matches. Close this review to link an
                          existing client.
                        </small>
                      </>
                    ) : (
                      <p>No matching clients were found.</p>
                    ))}
                </section>
                <label className="row">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    disabled={!matchesReady || !capacity.allowed || locked}
                    onChange={(event) => setReviewed(event.target.checked)}
                  />
                  I reviewed the possible matches and want to create this
                  separate client.
                </label>
              </>
            )}
            {flow.action.error && (
              <p role="alert" className="status error">
                {flow.action.error.message}
              </p>
            )}
            {flow.pending && !flow.receipt && (
              <div className="stack" role="status">
                <p>
                  This conversion is retained across reloads. Recover its exact
                  receipt before attempting another conversion.
                </p>
                <button
                  type="button"
                  className="button"
                  disabled={flow.action.isPending}
                  onClick={() => flow.action.mutate({ kind: "recover" })}
                >
                  Recover conversion receipt
                </button>
              </div>
            )}
            {flow.receipt && (
              <div className="stack" role="status">
                <p>
                  Client created. Contacts, files and research remain
                  prospect-scoped.
                </p>
                <Link
                  className="button"
                  href={`/portfolio/${flow.receipt.clientId}`}
                >
                  Open created client
                </Link>
                <button
                  type="button"
                  className="button"
                  disabled={flow.action.isPending}
                  onClick={() =>
                    flow.action.mutate(
                      { kind: "acknowledge" },
                      { onSuccess: () => setOpen(false) },
                    )
                  }
                >
                  Acknowledge conversion
                </button>
              </div>
            )}
            {!flow.pending && (
              <button
                className="button primary"
                disabled={
                  !flow.ready ||
                  locked ||
                  !reviewed ||
                  !matchesReady ||
                  !capacity.allowed
                }
              >
                Create reviewed client
              </button>
            )}
          </form>
        </Dialog>
      )}
    </>
  );
}
