"use client";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import { useArtifactMutation } from "./artifacts/useArtifactMutation";
import { MeetingCommandStatus } from "./commands/MeetingCommandStatus";
import type { ArtifactActor, ArtifactChange } from "./artifacts/contracts";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
import { ApiError } from "@/shared/portfolio/api/http";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useMeetingNotes } from "./queries";
import { type Meeting, type noteSchema } from "./contracts";
import type { z } from "zod";
import { DebriefGeneration } from "./debrief/public";
import { SavedMeetingDocumentPreview } from "./documents/public";
export function MeetingArtifacts({
  meeting,
  kind,
}: {
  meeting: Meeting;
  kind: "notes" | "debriefs";
}) {
  const identity = useIdentity();
  if (!identity.data?.tenant || !identity.isSuccess)
    return <QueryState pending={identity.isPending} error={identity.error} />;
  return (
    <ArtifactEditor
      key={`${identity.data.tenant.id}:${identity.data.user.id}:${meeting.id}:${meeting.client?.id ?? ""}:${kind}`}
      meeting={meeting}
      kind={kind}
      actor={{
        userId: identity.data.user.id,
        tenantId: identity.data.tenant.id,
      }}
      allowed={
        !identity.isFetching &&
        !identity.error &&
        (identity.data.role === "standard_user" ||
          canAdminister(identity.data.role))
      }
    />
  );
}
function ArtifactEditor({
  meeting,
  kind,
  actor,
  allowed,
}: {
  meeting: Meeting;
  kind: "notes" | "debriefs";
  actor: ArtifactActor;
  allowed: boolean;
}) {
  const cache = useQueryClient();
  const query = useMeetingNotes(meeting.id, kind, {
    ...actor,
    clientId: meeting.client?.id ?? null,
  });
  function readableRows() {
    const state = cache.getQueryState<z.infer<typeof noteSchema>[]>(
      query.queryKey,
    );
    return state?.status === "success" &&
      state.fetchStatus === "idle" &&
      !state.isInvalidated &&
      !state.error
      ? state.data
      : undefined;
  }
  function assertReadable(change: ArtifactChange) {
    const rows = readableRows();
    const selected = change.id
      ? rows?.find((row) => row.id === change.id)
      : undefined;
    if (
      !allowed ||
      !rows ||
      (change.id &&
        (!selected ||
          (selected.revision ?? selected.updatedAt) !== change.revision ||
          selected.restricted ||
          selected.capabilities?.[
            change.action === "save" ? "edit" : change.action
          ] === false)) ||
      (change.action === "share" &&
        (!meeting.client ||
          selected?.status !== "approved" ||
          selected.confidential)) ||
      (change.action === "unshare" && !selected?.sharedAt)
    )
      throw new ApiError(
        409,
        "Refresh the saved artifacts before changing this record.",
      );
  }
  const mutation = useArtifactMutation(meeting, kind, assertReadable);
  const rows =
    query.isSuccess && !query.isFetching && !query.error
      ? readableRows()
      : undefined;
  const current = rows !== undefined;
  const blocked =
    mutation.isPending || mutation.uncertain || !allowed || !current;
  const [editing, setEditing] = useState<
    | {
        id?: string;
        revision?: string;
        body: string;
        confidential: boolean;
        generated?: boolean;
        reviewedBody?: string;
        /** D2: audited context summary of the draft this body came from. */
        generatedFrom?: unknown;
      }
    | undefined
  >(() =>
    mutation.attempt.change?.action === "save"
      ? mutation.attempt.change
      : undefined,
  );
  const [sharing, setSharing] = useState<{ id: string; revision?: string }>();
  const [preview, setPreview] = useState<string>();
  const previewRecord = rows?.find(
    (item) => item.id === preview && !item.restricted,
  );
  const editingCurrent =
    current &&
    (!editing?.id ||
      rows.some(
        (item) =>
          item.id === editing.id &&
          !item.restricted &&
          item.capabilities?.edit !== false,
      ));
  const sharingCurrent = rows?.some(
    (item) =>
      item.id === sharing?.id &&
      (item.revision ?? item.updatedAt) === sharing.revision &&
      !item.restricted &&
      item.capabilities?.share !== false &&
      !item.confidential &&
      item.status === "approved",
  );
  const editingRevisionCurrent =
    !editing?.id ||
    rows?.some(
      (item) =>
        item.id === editing.id &&
        (item.revision ?? item.updatedAt) === editing.revision,
    );
  const returnToReview = () => {
    // The retained command owns the draft. Reopening it is the explicit step
    // that reviews a current row; the stale editor must not become writable.
    if (editing?.id) setEditing(undefined);
    setSharing(undefined);
  };
  const changeArtifact = (change: ArtifactChange) => {
    if (blocked) return;
    try {
      assertReadable(change);
    } catch {
      return;
    }
    mutation.mutate(change);
  };
  const singular = kind === "notes" ? "note" : "debrief";
  return (
    <div className="stack">
      <MeetingCommandStatus
        command={mutation.command}
        onDone={() => {
          setEditing(undefined);
          setSharing(undefined);
        }}
        onReview={returnToReview}
      />
      <div className="row between">
        <h3>{kind === "notes" ? "Meeting notes" : "Debriefs"}</h3>
        <button
          className="button"
          disabled={
            mutation.isPending ||
            !allowed ||
            !current ||
            (mutation.uncertain && mutation.attempt.change?.action !== "save")
          }
          onClick={() => {
            if (!allowed || mutation.isPending || !readableRows()) return;
            const saved = mutation.attempt.change;
            if (saved?.action === "save") {
              const reviewed = saved.id
                ? readableRows()?.find(
                    (row) => row.id === saved.id && !row.restricted,
                  )
                : undefined;
              setEditing({
                ...saved,
                revision: mutation.uncertain
                  ? saved.revision
                  : (reviewed?.revision ?? reviewed?.updatedAt),
                reviewedBody:
                  !mutation.uncertain && reviewed
                    ? (reviewed.body ?? "")
                    : undefined,
              });
              return;
            }
            if (mutation.uncertain) return;
            setEditing({ body: "", confidential: false });
          }}
        >
          {mutation.attempt.change?.action === "save"
            ? "Review retained draft"
            : `Add ${singular}`}
        </button>
      </div>
      {/* Generation owns role/runtime disabled states; active or uncertain artifact
          writes suppress new draft entry points until that attempt is resolved. */}
      {kind === "debriefs" && !mutation.isPending && !mutation.uncertain && (
        <DebriefGeneration
          meeting={meeting}
          onDraft={(body, generatedFrom) =>
            setEditing({
              body,
              confidential: false,
              generated: true,
              generatedFrom,
            })
          }
        />
      )}
      <QueryState
        pending={query.isPending || query.isFetching}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {rows?.map((item) => (
        <article className="card stack" key={item.id}>
          <div className="row between">
            <span className="chip">{item.status ?? "Draft"}</span>
            <small>
              {item.confidential
                ? "Confidential"
                : item.sharingKnown === false || item.sharedAt === undefined
                  ? "Sharing status unavailable"
                  : item.sharedAt
                    ? "Shared with client team"
                    : "Private"}
            </small>
          </div>
          {item.restricted ? (
            <p className="muted">You do not have access to this content.</p>
          ) : (
            <>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {item.body ?? "No content."}
              </p>
              <div className="row">
                {kind === "debriefs" && (
                  <button
                    className="button"
                    onClick={() => {
                      if (
                        readableRows()?.some(
                          (row) => row.id === item.id && !row.restricted,
                        )
                      )
                        setPreview(item.id);
                    }}
                  >
                    Export PDF
                  </button>
                )}
                <button
                  className="button"
                  disabled={blocked || item.capabilities?.edit === false}
                  onClick={() => {
                    const selected = readableRows()?.find(
                      (row) => row.id === item.id && !row.restricted,
                    );
                    if (
                      !blocked &&
                      selected &&
                      selected.capabilities?.edit !== false
                    )
                      setEditing({
                        id: selected.id,
                        revision: selected.revision ?? selected.updatedAt,
                        body: selected.body ?? "",
                        confidential: selected.confidential,
                      });
                  }}
                >
                  Edit
                </button>
                {item.status !== "approved" && (
                  <button
                    className="button"
                    disabled={blocked || item.capabilities?.approve === false}
                    onClick={() =>
                      changeArtifact({
                        action: "approve",
                        id: item.id,
                        revision: item.revision ?? item.updatedAt,
                      })
                    }
                  >
                    Approve
                  </button>
                )}
                {item.status === "approved" &&
                  meeting.client &&
                  !item.confidential &&
                  !item.sharedAt &&
                  item.sharingKnown !== false &&
                  item.capabilities?.share !== false && (
                    <button
                      className="button"
                      disabled={blocked}
                      onClick={() => {
                        if (
                          !blocked &&
                          readableRows()?.some(
                            (row) =>
                              row.id === item.id &&
                              !row.restricted &&
                              row.capabilities?.share !== false &&
                              !row.confidential &&
                              row.status === "approved",
                          )
                        )
                          setSharing({
                            id: item.id,
                            revision: item.revision ?? item.updatedAt,
                          });
                      }}
                    >
                      Share
                    </button>
                  )}
                {item.sharedAt && item.sharingKnown !== false && (
                  <button
                    className="button"
                    disabled={blocked || item.capabilities?.unshare === false}
                    onClick={() =>
                      changeArtifact({
                        action: "unshare",
                        id: item.id,
                        revision: item.revision ?? item.updatedAt,
                      })
                    }
                  >
                    Unshare
                  </button>
                )}
              </div>
            </>
          )}
        </article>
      ))}
      {rows?.length === 0 && <p className="empty">No {kind} yet.</p>}
      {previewRecord && (
        <SavedMeetingDocumentPreview
          meeting={meeting}
          document={{ kind: "debrief", debrief: previewRecord }}
          onClose={() => setPreview(undefined)}
        />
      )}
      {mutation.uncertain && (
        <button
          className="button"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh saved {kind}
        </button>
      )}
      <Dialog
        open={Boolean(editing) && editingCurrent}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setEditing(undefined);
        }}
        title={
          editing?.generated
            ? "Review generated debrief"
            : `${editing?.id ? "Edit" : "Add"} ${singular}`
        }
      >
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (blocked || !editingRevisionCurrent) return;
            const form = new FormData(event.currentTarget);
            changeArtifact({
              action: "save",
              id: editing?.id,
              revision: editing?.revision,
              body: String(form.get("body")).trim(),
              confidential: form.get("confidential") === "on",
              // D2: only a new debrief carries the audited context, and only when
              // the draft actually had one.
              ...(kind === "debriefs" &&
              !editing?.id &&
              editing?.generatedFrom !== undefined
                ? { generatedFrom: editing.generatedFrom }
                : {}),
            });
          }}
        >
          <MeetingCommandStatus
            command={mutation.command}
            onDone={() => setEditing(undefined)}
            onReview={returnToReview}
          />
          {editing?.reviewedBody !== undefined && (
            <div className="card stack">
              <strong>Current saved content</strong>
              <p style={{ whiteSpace: "pre-wrap" }}>{editing.reviewedBody}</p>
              <small>Review your retained draft below before saving.</small>
            </div>
          )}
          {!editingRevisionCurrent && (
            <p role="status">
              This saved record changed. Review the current revision before
              saving.
            </p>
          )}
          <TextareaField
            label="Content"
            name="body"
            rows={12}
            required
            value={editing?.body ?? ""}
            onChange={(event) => {
              const body = event.currentTarget.value;
              if (!blocked)
                setEditing((draft) => (draft ? { ...draft, body } : draft));
            }}
            readOnly={blocked}
          />
          <label className="row">
            <input
              type="checkbox"
              name="confidential"
              disabled={blocked}
              checked={editing?.confidential ?? false}
              onChange={(event) => {
                const confidential = event.currentTarget.checked;
                if (!blocked)
                  setEditing((draft) =>
                    draft ? { ...draft, confidential } : draft,
                  );
              }}
            />
            Confidential
          </label>
          <small>
            Edits require approval again. Saving does not send email.
          </small>
          <button
            className="button primary"
            disabled={blocked || !editingRevisionCurrent}
          >
            Save {singular}
          </button>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(sharing) && Boolean(sharingCurrent)}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setSharing(undefined);
        }}
        title={`Share ${singular}`}
        description={`Share this approved ${singular} with the authorized team for ${meeting.client?.name ?? "this client"}.`}
      >
        <MeetingCommandStatus
          command={mutation.command}
          onDone={() => setSharing(undefined)}
          onReview={returnToReview}
        />
        <p>
          Confidential material cannot be shared. This does not send an email.
        </p>
        <button
          className="button primary"
          disabled={blocked}
          onClick={() => {
            if (sharing)
              changeArtifact({
                action: "share",
                id: sharing.id,
                revision: sharing.revision,
              });
          }}
        >
          Share {singular}
        </button>
      </Dialog>
    </div>
  );
}
