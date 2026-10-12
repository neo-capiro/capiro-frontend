"use client";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import { useArtifactMutation } from "./artifacts/useArtifactMutation";
import type { ArtifactActor, ArtifactChange } from "./artifacts/contracts";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
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
  const query = useMeetingNotes(meeting.id, kind);
  const mutation = useArtifactMutation(meeting, kind, actor);
  const blocked = mutation.isPending || mutation.uncertain || !allowed;
  const [editing, setEditing] = useState<
    | {
        id?: string;
        body: string;
        confidential: boolean;
        generated?: boolean;
      }
    | undefined
  >(() =>
    mutation.attempt.change?.action === "save"
      ? mutation.attempt.change
      : undefined,
  );
  const [sharing, setSharing] = useState<string>();
  const [preview, setPreview] = useState<z.infer<typeof noteSchema>>();
  const changeArtifact = (change: ArtifactChange) =>
    mutation.mutate(change, () => {
      setEditing(undefined);
      setSharing(undefined);
    });
  const singular = kind === "notes" ? "note" : "debrief";
  return (
    <div className="stack">
      <div className="row between">
        <h3>{kind === "notes" ? "Meeting notes" : "Debriefs"}</h3>
        <button
          className="button"
          disabled={
            mutation.isPending ||
            !allowed ||
            (mutation.uncertain && mutation.attempt.change?.action !== "save")
          }
          onClick={() => {
            const saved = mutation.attempt.change;
            if (mutation.uncertain) {
              if (saved?.action === "save") setEditing(saved);
              return;
            }
            setEditing({ body: "", confidential: false });
          }}
        >
          {mutation.uncertain && mutation.attempt.change?.action === "save"
            ? "Review retained draft"
            : `Add ${singular}`}
        </button>
      </div>
      {/* Generation owns role/runtime disabled states; active or uncertain artifact
          writes suppress new draft entry points until that attempt is resolved. */}
      {kind === "debriefs" && !mutation.isPending && !mutation.uncertain && (
        <DebriefGeneration
          meeting={meeting}
          onDraft={(body) =>
            setEditing({ body, confidential: false, generated: true })
          }
        />
      )}
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.map((item) => (
        <article className="card stack" key={item.id}>
          <div className="row between">
            <span className="chip">{item.status ?? "Draft"}</span>
            <small>
              {item.confidential
                ? "Confidential"
                : item.sharedAt === undefined
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
                  <button className="button" onClick={() => setPreview(item)}>
                    Export PDF
                  </button>
                )}
                <button
                  className="button"
                  disabled={blocked}
                  onClick={() =>
                    setEditing({
                      id: item.id,
                      body: item.body ?? "",
                      confidential: item.confidential,
                    })
                  }
                >
                  Edit
                </button>
                {item.status !== "approved" && (
                  <button
                    className="button"
                    disabled={blocked}
                    onClick={() =>
                      changeArtifact({
                        action: "approve",
                        id: item.id,
                      })
                    }
                  >
                    Approve
                  </button>
                )}
                {item.status === "approved" &&
                  meeting.client &&
                  !item.confidential &&
                  !item.sharedAt && (
                    <button
                      className="button"
                      disabled={blocked}
                      onClick={() => setSharing(item.id)}
                    >
                      Share
                    </button>
                  )}
                {item.sharedAt && (
                  <button
                    className="button"
                    disabled={blocked}
                    onClick={() =>
                      changeArtifact({
                        action: "unshare",
                        id: item.id,
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
      {query.data?.length === 0 && <p className="empty">No {kind} yet.</p>}
      {preview && (
        <SavedMeetingDocumentPreview
          meeting={meeting}
          document={{ kind: "debrief", debrief: preview }}
          onClose={() => setPreview(undefined)}
        />
      )}
      <QueryState error={mutation.error} />
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
        open={Boolean(editing)}
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
            if (blocked) return;
            const form = new FormData(event.currentTarget);
            changeArtifact({
              action: "save",
              id: editing?.id,
              body: String(form.get("body")).trim(),
              confidential: form.get("confidential") === "on",
            });
          }}
        >
          <TextareaField
            label="Content"
            name="body"
            rows={12}
            required
            defaultValue={editing?.body}
            readOnly={blocked}
          />
          <label className="row">
            <input
              type="checkbox"
              name="confidential"
              disabled={blocked}
              defaultChecked={editing?.confidential}
            />
            Confidential
          </label>
          <small>
            Edits require approval again. Saving does not send email.
          </small>
          <QueryState error={mutation.error} />
          <button className="button primary" disabled={blocked}>
            Save {singular}
          </button>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(sharing)}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setSharing(undefined);
        }}
        title={`Share ${singular}`}
        description={`Share this approved ${singular} with the authorized team for ${meeting.client?.name ?? "this client"}.`}
      >
        <p>
          Confidential material cannot be shared. This does not send an email.
        </p>
        <QueryState error={mutation.error} />
        <button
          className="button primary"
          disabled={blocked}
          onClick={() => {
            if (sharing)
              changeArtifact({
                action: "share",
                id: sharing,
              });
          }}
        >
          Share {singular}
        </button>
      </Dialog>
    </div>
  );
}
