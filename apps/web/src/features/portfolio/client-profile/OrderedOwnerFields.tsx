"use client";
import { memberName } from "@/features/portfolio/index/public";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { ProfileActor } from "./profile-access";
import { ownerLabels } from "./ordered-owners";
import { useOrderedOwners } from "./useOrderedOwners";

export function OrderedOwnerFields({
  clientId,
  actor,
  blocked,
}: {
  clientId: string;
  actor: ProfileActor | undefined;
  blocked: boolean;
}) {
  const editor = useOrderedOwners(clientId, actor);
  return (
    <fieldset className="stack" aria-label="Ordered account owners">
      <legend>Account owners</legend>
      <p>
        Up to four owners, in order. Ownership does not grant access to this
        client.
      </p>
      <QueryState pending={editor.loading} error={editor.error} />
      {ownerLabels.map((label, index) => {
        const value = editor.slots[index] ?? "";
        const available = editor.options.data?.some(
          (member) => member.id === value,
        );
        return (
          <label key={label}>
            {label} owner
            <select
              value={value}
              disabled={blocked || !editor.editable}
              onChange={(event) => editor.edit(index, event.target.value)}
            >
              <option value="">Unassigned</option>
              {value && !available && (
                <option value={value} disabled>
                  Unavailable owner · {value}
                </option>
              )}
              {editor.options.data?.map((member) => (
                <option key={member.id} value={member.id}>
                  {memberName(member)}
                </option>
              ))}
            </select>
          </label>
        );
      })}
      {editor.attempt && (
        <p role="status">
          Owner change result needs review. Read current owners and compare the
          complete order before another save.
        </p>
      )}
      {editor.stale && !editor.attempt && (
        <p role="status">
          The saved owner source changed. Read current owners before saving this
          retained draft.
        </p>
      )}
      {editor.message && <p role="status">{editor.message}</p>}
      <div className="formActions">
        <button
          className="button"
          disabled={editor.pending || editor.loading}
          onClick={() => void editor.review()}
        >
          Read current owners
        </button>
        <button
          className="button primary"
          disabled={
            blocked || !editor.editable || !editor.draft || editor.stale
          }
          onClick={() => void editor.save()}
        >
          {editor.pending ? "Saving owners…" : "Save owner order"}
        </button>
      </div>
    </fieldset>
  );
}
