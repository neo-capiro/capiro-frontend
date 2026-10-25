"use client";
import { useState } from "react";
import {
  useMemberOptions,
  memberName,
} from "@/features/portfolio/index/public";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useFileChange } from "./mutations";
import {
  fileAccessCommand,
  type FileAccessCommand,
} from "./file-access-command";
import type { Attachment } from "./contracts";
export function FileAccess({
  clientId,
  files,
  folder,
  operation,
  onClose,
}: {
  clientId: string;
  files: readonly Attachment[];
  folder: string | null;
  operation: FileAccessCommand["operation"];
  onClose: () => void;
}) {
  const members = useMemberOptions(),
    change = useFileChange(clientId, onClose);
  // Freeze the visible review. New files and revised rows require a new explicit review.
  const [review] = useState(() => structuredClone(files));
  const [selected, setSelected] = useState(() =>
    files.length <= 100 ? files.map((file) => file.id) : [],
  );
  const initial = operation === "file-access" ? files[0] : undefined;
  const [mode, setMode] = useState(initial?.viewerMode);
  const [ids, setIds] = useState([...(initial?.viewerUserIds ?? [])]);
  const [error, setError] = useState<Error>();
  const held = change.attempt?.command;
  const blocked =
    !change.canStart ||
    !members.isSuccess ||
    members.isFetching ||
    Boolean(members.error);
  const viewerLabel = (id: string) => {
    const member = members.data?.find((item) => item.id === id);
    return member ? memberName(member) : `Unavailable team member (${id})`;
  };
  return (
    <Dialog
      open
      title={`Access: ${held?.folder ?? folder ?? "Unfiled"}`}
      description="Review the exact files and who can view them. The uploader retains access. Future uploads are not included."
      onOpenChange={(open) => {
        if (!open && !change.pending) onClose();
      }}
    >
      <QueryState
        error={error ?? change.error ?? members.error}
        retry={members.error ? () => void members.refetch() : undefined}
      />
      {held ? (
        <section className="stack" aria-label="Saved access change">
          <p role="status">
            {change.pending
              ? "Checking the saved access change…"
              : change.attempt?.outcome?.status === "refused"
                ? "Core confirmed this access change was refused. Review current files before clearing it."
                : "The access change is unconfirmed. Check its recorded outcome or retry the exact saved request."}
          </p>
          <p>
            Folder: {held.folder ?? "Unfiled"}. Access:{" "}
            {held.viewerMode === "all" ? "All team members" : "Specific people"}
            .
          </p>
          <ul>
            {held.files.map((file) => (
              <li key={file.id}>
                {review.find((row) => row.id === file.id)?.fileName ?? file.id}{" "}
                · reviewed revision {file.expectedRevision}
              </li>
            ))}
          </ul>
          {held.viewerMode === "restricted" && (
            <ul>
              {held.viewerUserIds.map((id) => (
                <li key={id}>{viewerLabel(id)}</li>
              ))}
            </ul>
          )}
          {change.attempt?.outcome?.status === "refused" ? (
            <button
              className="button"
              disabled={!change.canCheck}
              onClick={change.retire}
            >
              Review fresh files and clear refused access change
            </button>
          ) : (
            <div className="row">
              <button
                className="button"
                disabled={!change.canCheck}
                onClick={change.check}
              >
                Check access outcome
              </button>
              <button
                className="button"
                disabled={!change.canCheck}
                onClick={change.retry}
              >
                Retry same access change
              </button>
            </div>
          )}
        </section>
      ) : (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (blocked || !mode) return;
            try {
              const command = fileAccessCommand(
                clientId,
                operation,
                folder,
                review.filter((file) => selected.includes(file.id)),
                mode,
                ids,
              );
              setError(undefined);
              change.start(command);
            } catch {
              setError(
                new Error(
                  "Choose between 1 and 100 current files with known revisions, then review their folder and viewers.",
                ),
              );
            }
          }}
        >
          <fieldset disabled={blocked}>
            <legend>
              Reviewed files ({selected.length} of {review.length}; maximum 100)
            </legend>
            {review.map((file) => (
              <label className="row" key={file.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(file.id)}
                  disabled={
                    operation === "file-access" ||
                    (!selected.includes(file.id) && selected.length >= 100)
                  }
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? [...selected, file.id]
                        : selected.filter((id) => id !== file.id),
                    )
                  }
                />
                <span>
                  {file.fileName} · revision{" "}
                  {file.metadataRevision ?? "unavailable"}
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset disabled={blocked}>
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
              {members.data?.map((member) => (
                <label className="row" key={member.id}>
                  <input
                    type="checkbox"
                    disabled={blocked}
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
              <small>
                An empty selection grants access only to the uploader.
              </small>
            </div>
          )}
          <button
            className="button primary"
            disabled={
              blocked || !mode || !selected.length || selected.length > 100
            }
          >
            Save access for {selected.length}{" "}
            {selected.length === 1 ? "file" : "files"}
          </button>
        </form>
      )}
    </Dialog>
  );
}
