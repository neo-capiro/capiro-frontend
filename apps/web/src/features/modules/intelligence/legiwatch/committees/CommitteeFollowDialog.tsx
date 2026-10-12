"use client";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { committeeFollowBodySchema } from "../../../../../shared/capiro/operations/legiwatch-committees";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Modal,
  StatusPanel,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";

const flags = [
  { key: "notifyOnNewHearing", label: "New hearings" },
  { key: "notifyOnScheduleChange", label: "Schedule changes" },
  { key: "notifyOnTranscriptReady", label: "Transcript ready" },
  { key: "notifyOnHighPriorityMatch", label: "High priority client matches" },
  { key: "notifyOnPublication", label: "New official publications" },
] as const;
export function CommitteeFollowDialog({
  id,
  open,
  onClose,
  onSaved,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const query = useCapiroQuery(
    "legiwatch.committee.follow",
    { params: { id } },
    { enabled: open },
  );
  const clients = useCapiroQuery("clients.list", {}, { enabled: open });
  const update = useCapiroMutation("legiwatch.committee.follow.update");
  const remove = useCapiroMutation("legiwatch.committee.follow.remove");
  const [body, setBody] = useState<z.infer<typeof committeeFollowBodySchema>>(
    {},
  );
  const [error, setError] = useState<string>();
  const [loadedFollow, setLoadedFollow] = useState(() => (query.data));
  if (loadedFollow !== (query.data)) {
    setLoadedFollow(query.data);
    if (query.data)
      setBody({
        clientIds: query.data.clientIds,
        ...Object.fromEntries(
          flags.map((flag) => [flag.key, query.data![flag.key]]),
        ),
      });

  }
  async function save(unfollow = false) {
    setError(undefined);
    try {
      if (unfollow) await remove.run({ params: { id } });
      else await update.run({ params: { id }, body });
      onSaved();
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save committee follow",
      );
    }
  }
  const pending = update.pending || remove.pending;
  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!value && !pending) onClose();
      }}
      title="Follow committee"
      description="Follow notifications independently from hearing attendance. Capture is never scheduled by this form."
      footer={
        <>
          <ActionButton disabled={pending} onClick={onClose}>
            Cancel
          </ActionButton>
          {query.data?.following && (
            <ActionButton disabled={pending} onClick={() => void save(true)}>
              Unfollow
            </ActionButton>
          )}
          <ActionButton
            primary
            disabled={pending || !query.data}
            onClick={() => void save()}
          >
            {pending ? "Saving…" : "Save follow"}
          </ActionButton>
        </>
      }
    >
      <StatusPanel
        loading={query.loading || clients.loading}
        error={query.error || clients.error}
        onRetry={() => {
          query.reload();
          clients.reload();
        }}
      >
        <div className={styles.form}>
          {flags.map((flag) => (
            <label className={styles.check} key={flag.key}>
              <input
                type="checkbox"
                checked={body[flag.key] ?? false}
                onChange={(event) =>
                  setBody((previous) => ({
                    ...previous,
                    [flag.key]: event.target.checked,
                  }))
                }
              />
              {flag.label}
            </label>
          ))}
          <strong>Connect clients</strong>
          {clients.data?.map((client) => (
            <label className={styles.check} key={client.id}>
              <input
                type="checkbox"
                checked={body.clientIds?.includes(client.id) ?? false}
                onChange={(event) =>
                  setBody((previous) => ({
                    ...previous,
                    clientIds: event.target.checked
                      ? [...(previous.clientIds ?? []), client.id]
                      : previous.clientIds?.filter(
                          (value) => value !== client.id,
                        ),
                  }))
                }
              />
              {client.name}
            </label>
          ))}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      </StatusPanel>
    </Modal>
  );
}
