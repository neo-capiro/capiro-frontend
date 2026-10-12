"use client";
import { useState } from "react";
import {
  useMemberOptions,
  memberName,
} from "@/features/portfolio/index/public";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useFileAccess } from "./queries";
import { useFileChange } from "./mutations";
import { useFileMetadataChange } from "./useFileMetadataChange";
import { FileMetadataStatus } from "./FileMetadataStatus";
import type { Attachment } from "./contracts";
export function FileAccess({
  clientId,
  file,
  folder,
  onClose,
}: {
  clientId: string;
  file?: Attachment;
  folder?: string | null;
  onClose: () => void;
}) {
  const query = useFileAccess(clientId, file?.id);
  const members = useMemberOptions();
  const change = useFileChange(clientId, onClose);
  const metadata = useFileMetadataChange(clientId, file?.id ?? "", onClose);
  const pending = file ? metadata.isPending : change.isPending;
  const draft = metadata.draft;
  const initial =
    draft?.kind === "access"
      ? draft
      : (metadata.current ?? (query.error ? undefined : query.data));
  return (
    <Dialog
      open
      title={`Access: ${file?.fileName ?? folder ?? "Unfiled"}`}
      description="Choose who on your team can view these files. The uploader retains access."
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <QueryState
        pending={Boolean(file) && query.isPending}
        error={(metadata.current ? null : query.error) ?? members.error}
        retry={() => {
          void query.refetch();
          void members.refetch();
        }}
      />
      {(!file || initial) && (
        <AccessForm
          key={file?.id ?? "folder"}
          initial={initial}
          members={members.isSuccess && !members.error ? members.data : []}
          pending={
            (file
              ? metadata.blocked || Boolean(query.error && !metadata.current)
              : change.isPending) ||
            !members.isSuccess ||
            Boolean(members.error)
          }
          onSave={(viewerMode, viewerUserIds) =>
            file
              ? metadata.mutate({ kind: "access", viewerMode, viewerUserIds })
              : change.mutate({
                  kind: "folder-access",
                  folder: folder ?? null,
                  viewerMode,
                  viewerUserIds,
                })
          }
        />
      )}
      {!file && (
        <small>
          Applies to the files currently visible in this folder. Future uploads
          do not inherit this setting.
        </small>
      )}
      {file ? (
        <FileMetadataStatus
          change={metadata}
          kind="access"
          viewerLabels={metadata.current?.viewerUserIds.map((id) => {
            const member = members.data?.find((item) => item.id === id);
            return member ? memberName(member) : "Unavailable team member";
          })}
        />
      ) : (
        <QueryState error={change.error} />
      )}
    </Dialog>
  );
}
function AccessForm({
  initial,
  members,
  pending,
  onSave,
}: {
  initial?: { viewerMode: "all" | "restricted"; viewerUserIds: string[] };
  members: NonNullable<ReturnType<typeof useMemberOptions>["data"]>;
  pending: boolean;
  onSave: (mode: "all" | "restricted", ids: string[]) => void;
}) {
  const [mode, setMode] = useState(initial?.viewerMode);
  const [ids, setIds] = useState(initial?.viewerUserIds ?? []);
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        if (mode && !pending) onSave(mode, mode === "all" ? [] : ids);
      }}
    >
      <fieldset disabled={pending}>
        <legend>Who can view</legend>
        {(["all", "restricted"] as const).map((value) => (
          <label className="row" key={value}>
            <input
              type="radio"
              required
              name="mode"
              checked={mode === value}
              onChange={() => setMode(value)}
            />
            {value === "all" ? "All team members" : "Specific people"}
          </label>
        ))}
      </fieldset>
      {mode === "restricted" && (
        <div className="stack">
          {members.map((member) => (
            <label className="row" key={member.id}>
              <input
                type="checkbox"
                disabled={pending}
                checked={ids.includes(member.id)}
                onChange={(event) =>
                  setIds(
                    event.target.checked
                      ? [...ids, member.id]
                      : ids.filter((id) => id !== member.id),
                  )
                }
              />
              <span>
                {memberName(member)}
                <small className="block">{member.email}</small>
              </span>
            </label>
          ))}
          <small>An empty selection grants access only to the uploader.</small>
        </div>
      )}
      <button className="button primary" disabled={pending || !mode}>
        Save access
      </button>
    </form>
  );
}
