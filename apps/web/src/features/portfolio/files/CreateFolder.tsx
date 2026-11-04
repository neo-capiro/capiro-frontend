"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useFileScope } from "./file-scope";
import { folderKey, folderNameSchema, folderReceiptSchema } from "./folders";
import styles from "./file-dialog.module.css";

export function CreateFolder({
  clientId,
  onClose,
  onCreated,
}: {
  clientId: string;
  onClose: () => void;
  onCreated: (folder: string) => void;
}) {
  const api = useApi(),
    cache = useQueryClient(),
    scope = useFileScope(clientId, "create-folder");
  const [name, setName] = useState("");
  const [held, setHeld] = useState<string>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error>();
  const lock = useRef(false);
  async function create() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(undefined);
    let dispatched = false;
    try {
      const folder = folderNameSchema.parse(held ?? name);
      const execution = scope.capture(true);
      setHeld(folder);
      dispatched = true;
      const result = await api.request(
        "core",
        `clients/${encodeURIComponent(clientId)}/files/folders`,
        folderReceiptSchema.refine((row) => row.folder === folder),
        { method: "POST", body: { folder }, signal: execution.signal },
      );
      execution.guard();
      await cache.invalidateQueries({ queryKey: folderKey(clientId) });
      execution.guard();
      onCreated(result.folder);
    } catch (cause) {
      if (!dispatched || !ambiguousClientWrite(cause)) setHeld(undefined);
      setError(
        cause instanceof Error
          ? cause
          : new Error("Folder creation was not confirmed."),
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <Dialog
      open
      title="New folder"
      description="Create an empty folder, then add files whenever you are ready."
      className={styles.dialog}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <div className={styles.body}>
          <label>
            Folder name
            <input
              autoFocus
              value={held ?? name}
              maxLength={120}
              required
              disabled={pending || Boolean(held)}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {held && error && (
            <p role="status">
              The result is unconfirmed. Retry the same folder name to check or
              finish creating it.
            </p>
          )}
          <QueryState error={error} />
        </div>
        <footer className={styles.footer}>
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={pending || !scope.canWrite || !(held ?? name).trim()}
          >
            {pending
              ? "Creating folder…"
              : held
                ? "Retry same folder"
                : "Create folder"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
