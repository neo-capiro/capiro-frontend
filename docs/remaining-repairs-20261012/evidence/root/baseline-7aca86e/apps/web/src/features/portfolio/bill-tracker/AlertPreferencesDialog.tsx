"use client";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
import { useProfileClient } from "@/features/portfolio/client-profile/read-public";
import {
  preferenceActorKey,
  usePreferenceActor,
  type PreferenceActor,
} from "./alert-preferences/personal-access";
import { usePersonalPreferences } from "./alert-preferences/personal-queries";
import { PreferenceForm } from "./alert-preferences/PreferenceForm";
import styles from "./alert-preferences/preferences.module.css";

export function AlertPreferencesEntry({
  clientId,
  disabled,
  backend,
}: {
  clientId: string;
  backend: TrackerBackend;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.entry}>
      <p>Choose your personal email and SMS preferences for this client.</p>
      <button
        className="button"
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        My alert preferences
      </button>
      {open && (
        <AlertPreferencesDialog
          clientId={clientId}
          backend={backend}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export function AlertPreferencesDialog({
  clientId,
  onClose,
  backend,
}: {
  clientId: string;
  backend: TrackerBackend;
  onClose: () => void;
}) {
  const identity = useIdentity();
  const owner = usePreferenceActor(backend);
  return (
    <Dialog
      open
      title="My bill alerts"
      description="Personal notifications for this client."
      className={styles.dialog}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {owner ? (
        <PreferenceSession
          key={`${clientId}:${preferenceActorKey(owner)}`}
          owner={owner}
          clientId={clientId}
          onClose={onClose}
        />
      ) : (
        <div className={styles.body}>
          <QueryState
            pending={identity.isPending || identity.isFetching}
            error={identity.error}
          />
          {!identity.isPending && !identity.isFetching && (
            <>
              <p role="status">
                Your current account cannot edit personal bill alerts. Refresh
                your account to check access.
              </p>
              <button
                type="button"
                className="button"
                onClick={() => void identity.refetch()}
              >
                Reload account
              </button>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
function PreferenceSession({
  owner,
  clientId,
  onClose,
}: {
  owner: PreferenceActor;
  clientId: string;
  onClose: () => void;
}) {
  const client = useProfileClient(clientId);
  const clientCurrent = Boolean(client.data && client.source);
  const source = usePersonalPreferences(clientId, owner, clientCurrent);
  return source.data ? (
    <>
      {!clientCurrent && (
        <div className={styles.body}>
          <QueryState
            pending={client.isFetching}
            error={client.error}
            retry={() => void client.refetch()}
          />
          <p role="status">
            The current client is unavailable. Reload the client before changing
            bill alerts.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => void client.refetch()}
          >
            Reload client
          </button>
        </div>
      )}
      <PreferenceForm
        initial={source.data}
        source={source}
        owner={owner}
        clientCurrent={clientCurrent}
        clientId={clientId}
        onClose={onClose}
      />
    </>
  ) : (
    <div className={styles.body}>
      <QueryState
        pending={client.isPending || (clientCurrent && source.isPending)}
        error={client.error ?? source.error}
        retry={() => {
          void (clientCurrent ? source.refetch() : client.refetch());
        }}
      />
    </div>
  );
}
