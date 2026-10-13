"use client";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { ProfileActor } from "./profile-access";
import { useOrderedOwners } from "./useOrderedOwners";
import { OwnerCards } from "./OwnerCards";
import styles from "./owners.module.css";

type OwnerProps = {
  clientId: string;
  clientName?: string;
  actor: ProfileActor | undefined;
  blocked: boolean;
  roles: Readonly<Record<string, string | null>>;
};
export function OrderedOwnerFields(props: OwnerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="button" onClick={() => setOpen(true)}>
        Manage owners
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={props.clientName ? `Owners · ${props.clientName}` : "Owners"}
        className={styles.dialog}
      >
        {open && <OwnerEditor {...props} onCancel={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}
function OwnerEditor({
  clientId,
  actor,
  blocked,
  roles,
  onCancel,
}: OwnerProps & { onCancel: () => void }) {
  const editor = useOrderedOwners(clientId, actor);
  return (
    <>
      <div className={styles.body}>
        <QueryState pending={editor.loading} error={editor.error} />
        <OwnerCards editor={editor} blocked={blocked} roles={roles} />
        {editor.attempt && (
          <p role="status">
            Owner change result needs review. Read current owners and compare
            the complete order before another save.
          </p>
        )}
        {editor.stale && !editor.attempt && (
          <p role="status">
            The saved owner source changed. Read current owners before saving
            this retained draft.
          </p>
        )}
        {editor.message && <p role="status">{editor.message}</p>}
        {(editor.attempt || editor.stale || editor.error) && (
          <button
            className="button"
            disabled={editor.pending || editor.loading}
            onClick={() => void editor.review()}
          >
            Read current owners
          </button>
        )}
        <p className={styles.access}>
          Ownership does not grant access to this client.
        </p>
      </div>
      <footer className={styles.footer}>
        <span>Changes apply to this client only</span>
        <button className="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="button primary"
          disabled={
            blocked || !editor.editable || !editor.draft || editor.stale
          }
          onClick={() => void editor.save()}
        >
          {editor.pending ? "Saving owners…" : "Save owners"}
        </button>
      </footer>
    </>
  );
}
