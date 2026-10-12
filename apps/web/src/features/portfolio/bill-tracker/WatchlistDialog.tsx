"use client";
import { useState } from "react";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useIdentity, canAdminister } from "@/shared/portfolio/auth/identity";
import {
  profileActorKey,
  useProfileActor,
} from "@/features/portfolio/client-profile/read-public";
import { useWatchlistView } from "./watchlist-queries";
import { useWatchlistEditor } from "./useWatchlistEditor";
import { WatchlistForm } from "./WatchlistForm";
import { WatchlistNotice } from "./WatchlistNotice";
import { AlertPreferencesEntry } from "./AlertPreferencesDialog";
import styles from "./watchlist.module.css";

type WatchlistProps = {
  clientId: string;
  backend: TrackerBackend;
  onClose: () => void;
};

export function WatchlistDialog(props: WatchlistProps) {
  const identity = useIdentity();
  const actor = useProfileActor();
  const [actorScope, setActorScope] = useState(() => profileActorKey(actor));
  // A failed read conceals the existing draft; an actual actor/client/owner
  // replacement gets a new editor lifetime, even when its parent is unkeyed.
  if (actor && profileActorKey(actor) !== actorScope)
    setActorScope(profileActorKey(actor));
  return (
    <WatchlistSession
      key={`${props.clientId}:${props.backend}:${actorScope}`}
      {...props}
      identity={identity}
    />
  );
}

function WatchlistSession({
  clientId,
  backend,
  onClose,
  identity,
}: WatchlistProps & { identity: ReturnType<typeof useIdentity> }) {
  const source = useWatchlistView(clientId, backend);
  const editor = useWatchlistEditor(source.view, onClose);
  const [reloading, setReloading] = useState(false);
  const currentView = source.view;
  const saving = Boolean(editor.pending);
  const pending = identity.isPending || identity.isFetching || source.pending;
  const editable = Boolean(
    currentView &&
    (backend === "core" || canAdminister(currentView.reader.actor.role)),
  );
  async function refresh() {
    try {
      if (!source.reader) await identity.refetch();
      else await source.refresh();
    } catch {
      /* Query state owns the next current-read presentation. */
    }
  }
  return (
    <Dialog
      open
      wide
      className={styles.dialog}
      title="Configure Bill Tracker"
      description="Shared client targeting. Changes take effect when you save; notification settings are separate."
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <AlertPreferencesEntry
        clientId={clientId}
        backend={backend}
        disabled={saving || !currentView}
      />
      {!currentView && (
        <>
          <QueryState pending={pending} />
          {!pending && (
            <WatchlistNotice
              kind="unavailable"
              onAction={() => void refresh()}
            />
          )}
        </>
      )}
      {currentView && editor.draft && editor.base && (
        <WatchlistForm
          record={editor.base}
          draft={editor.draft}
          issueAreas={currentView.issueAreas}
          jurisdictions={currentView.jurisdictions}
          editable={editable}
          backend={backend}
          pending={editor.pending}
          changed={editor.changed}
          unconfirmed={editor.unconfirmed}
          rejections={editor.rejections}
          error={editor.error}
          onChange={editor.setDraft}
          onSave={editor.save}
          onReload={() => setReloading(true)}
        />
      )}
      <Dialog
        open={reloading}
        title="Reload saved targeting"
        description="Discard these local edits and reload the saved watchlist?"
        onOpenChange={(open) => {
          if (!saving) setReloading(open);
        }}
      >
        {!currentView && (
          <WatchlistNotice
            kind="unavailable"
            disabled={pending}
            onAction={() => void refresh()}
          />
        )}
        {currentView && !editor.unconfirmed && (
          <QueryState error={editor.error} />
        )}
        <button
          className="button"
          disabled={!currentView || saving}
          onClick={() => editor.reload(() => setReloading(false))}
        >
          {editor.pending === "reload"
            ? "Reloading…"
            : "Discard edits and reload"}
        </button>
      </Dialog>
    </Dialog>
  );
}
