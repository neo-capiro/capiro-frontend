"use client";
import { useState, type ReactNode } from "react";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { briefCopyIdSchema } from "@/shared/capiro/operations/workspace-brief-copy";
import type { ProspectWriter } from "@/features/modules/workspace/prospect-actions-public";
import type { Prospect } from "../../contracts";
import type { ClientBriefSelection } from "./review";
import { useClientBriefCopy } from "./useClientBriefCopy";
import { CopyResult } from "./CopyResult";

type Props = {
  record: Prospect | undefined;
  children: (
    select: ((value: ClientBriefSelection) => void) | undefined,
  ) => ReactNode;
};
export function ClientBriefCopy({ record, children }: Props) {
  const identity = useIdentity();
  const tenantId = identity.data?.tenant?.id,
    userId = identity.data?.user.id,
    ownerId = identity.data?.user.clerkUserId;
  if (
    !record?.convertedAt ||
    !record.linkedClientId ||
    !briefCopyIdSchema.safeParse(tenantId).success ||
    !briefCopyIdSchema.safeParse(userId).success ||
    !ownerId ||
    ownerId.length > 200
  )
    return <>{children(undefined)}</>;
  const actor = { tenantId: tenantId!, userId: userId!, ownerId };
  return (
    <CopySession
      key={`${tenantId}:${userId}:${ownerId}:${record.id}:${record.linkedClientId}`}
      actor={actor}
      record={record}
    >
      {children}
    </CopySession>
  );
}
function CopySession({
  actor,
  record,
  children,
}: {
  actor: ProspectWriter;
  record: Prospect;
  children: Props["children"];
}) {
  const flow = useClientBriefCopy(actor, record);
  const [open, setOpen] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [title, setTitle] = useState("");
  const [selection, setSelection] = useState<ClientBriefSelection>();
  const pending = flow.recovery.record,
    busy = flow.action.isPending || flow.review.isPending;
  const review =
    !flow.review.isPending && !flow.review.error ? flow.review.data : undefined;
  const receipt =
    pending && flow.action.data?.requestId === pending.command.requestId
      ? flow.action.data
      : undefined;
  const error =
    flow.contextError ??
    flow.recovery.error ??
    flow.action.error?.message ??
    flow.review.error?.message;
  const validTitle = title.trim().length > 0 && title.trim().length <= 500;
  const select = (value: ClientBriefSelection) => {
    setOpen(true);
    setConfirmed(false);
    if (pending || !flow.recovery.ready || busy || flow.contextError) return;
    setSelection(value);
    setTitle(`${value.title} — client draft`);
    flow.action.reset();
    flow.review.reset();
    flow.review.mutate(value);
  };
  return (
    <>
      {children(
        flow.recovery.ready && !busy && !flow.contextError ? select : undefined,
      )}
      {pending && (
        <button
          className="button"
          disabled={!flow.recovery.ready || Boolean(flow.contextError)}
          onClick={() => {
            setOpen(true);
            setConfirmed(false);
          }}
        >
          Recover private client brief copy
        </button>
      )}
      {flow.contextError && <p role="alert">{flow.contextError}</p>}
      {flow.recovery.error && (
        <div role="alert">
          <p>{flow.recovery.error}</p>
          <button className="button" onClick={flow.recovery.retry}>
            Retry brief-copy recovery
          </button>
        </div>
      )}
      {open && (
        <Dialog
          open
          title={
            pending
              ? "Recover private client brief copy"
              : "Review private client brief copy"
          }
          description="Copy only the selected saved brief into a new private draft for the linked client. The saved Core brief stays unchanged. No collaborators, sharing or sending are added."
          onOpenChange={(value) => {
            if (!busy) setOpen(value);
          }}
        >
          <div className="stack">
            {error && <p role="alert">{error}</p>}
            {flow.contextError || !flow.recovery.ready ? null : pending ? (
              <>
                <h3>{pending.command.docTitle}</h3>
                <p>Client: {pending.clientName}</p>
                <p>
                  Saved source: {pending.sourceTitle}, version{" "}
                  {pending.command.source.versionNumber}
                </p>
                {receipt ? (
                  <>
                    <CopyResult receipt={receipt} />
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        flow.action.mutate(
                          { kind: "acknowledge", expected: pending },
                          {
                            onSuccess: () => {
                              setOpen(false);
                              setConfirmed(false);
                              setSelection(undefined);
                              flow.review.reset();
                            },
                          },
                        )
                      }
                    >
                      Acknowledge copy result
                    </button>
                  </>
                ) : (
                  <>
                    <p>
                      The original command is saved across reloads. An
                      interrupted response or missing receipt does not establish
                      whether it completed. Retrying checks its original result
                      first.
                    </p>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        flow.action.mutate({ kind: "check", expected: pending })
                      }
                    >
                      Check original copy result
                    </button>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        flow.action.mutate({ kind: "retry", expected: pending })
                      }
                    >
                      Retry the same reviewed copy
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                {flow.review.isPending && (
                  <p role="status">
                    Checking the saved source and linked client…
                  </p>
                )}
                {review && (
                  <>
                    <p>
                      Client: <strong>{review.client.name}</strong>
                    </p>
                    <p>
                      Saved source: <strong>{review.selection.title}</strong>,
                      version {review.selection.source.versionNumber}
                    </p>
                    <label>
                      New private draft title
                      <input
                        value={title}
                        maxLength={500}
                        disabled={busy}
                        onChange={(event) => {
                          setTitle(event.target.value);
                          setConfirmed(false);
                        }}
                      />
                    </label>
                  </>
                )}
                {selection && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => {
                      setConfirmed(false);
                      flow.action.reset();
                      flow.review.mutate(selection);
                    }}
                  >
                    Refresh saved-brief review
                  </button>
                )}
                <label>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={busy || !review || !validTitle}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />{" "}
                  I reviewed this saved source, linked client and private draft
                  title.
                </label>
                <button
                  className="button primary"
                  disabled={
                    !flow.recovery.ready ||
                    busy ||
                    !review ||
                    !validTitle ||
                    !confirmed
                  }
                  onClick={() => {
                    if (review && confirmed)
                      flow.action.mutate({
                        kind: "submit",
                        review,
                        docTitle: title,
                      });
                  }}
                >
                  Create reviewed private client draft
                </button>
              </>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
