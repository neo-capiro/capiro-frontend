"use client";
import { useEffect, useState } from "react";
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

const preferenceLabels = {
  notifyOnScheduleChange: "Schedule changes",
  notifyOnHearingStarting: "Hearing starting",
  notifyOnTranscriptReady: "Transcript ready",
  notifyOnHighPriorityMatch: "High priority client match",
} as const;
export function FollowHearingDialog({
  hearingId,
  open,
  onClose,
  onSaved,
}: {
  hearingId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const follow = useCapiroQuery(
    "legiwatch.follow.read",
    { params: { id: hearingId } },
    { enabled: open },
  );
  const clients = useCapiroQuery("clients.list", {}, { enabled: open });
  const save = useCapiroMutation("legiwatch.follow.update"),
    remove = useCapiroMutation("legiwatch.follow.remove");
  const [ids, setIds] = useState<string[]>([]),
    [preferences, setPreferences] = useState({
      notifyOnScheduleChange: true,
      notifyOnHearingStarting: true,
      notifyOnTranscriptReady: true,
      notifyOnHighPriorityMatch: true,
    });
  useEffect(() => {
    if (follow.data) {
      setIds(follow.data.clientIds);
      setPreferences({
        notifyOnScheduleChange: follow.data.notifyOnScheduleChange,
        notifyOnHearingStarting: follow.data.notifyOnHearingStarting,
        notifyOnTranscriptReady: follow.data.notifyOnTranscriptReady,
        notifyOnHighPriorityMatch: follow.data.notifyOnHighPriorityMatch,
      });
    }
  }, [follow.data]);
  const finish = async (unfollow = false) => {
    try {
      if (unfollow) await remove.run({ params: { id: hearingId } });
      else
        await save.run({
          params: { id: hearingId },
          body: { clientIds: ids, ...preferences },
        });
      onSaved();
      onClose();
    } catch {
      /* Mutation state displays the server result. */
    }
  };
  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={
        follow.data?.following ? "Edit hearing follow" : "Follow this hearing"
      }
      description="Following keeps you informed. Attendance and capture are separate choices."
      footer={
        <>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          {follow.data?.following && (
            <ActionButton
              disabled={remove.pending}
              onClick={() => finish(true)}
            >
              Unfollow
            </ActionButton>
          )}
          <ActionButton
            primary
            disabled={save.pending || follow.loading || Boolean(follow.error)}
            onClick={() => finish()}
          >
            {save.pending ? "Saving…" : "Save follow"}
          </ActionButton>
        </>
      }
    >
      <StatusPanel
        loading={follow.loading}
        error={follow.error}
        onRetry={follow.reload}
      >
        <div className={styles.form}>
          <div>
            <h2>Clients</h2>
            <div className={styles.checklist}>
              {clients.data?.map((client) => (
                <label key={client.id} className={styles.check}>
                  <input
                    type="checkbox"
                    checked={ids.includes(client.id)}
                    onChange={(event) =>
                      setIds((current) =>
                        event.target.checked
                          ? [...current, client.id]
                          : current.filter((id) => id !== client.id),
                      )
                    }
                  />
                  {client.name}
                </label>
              ))}
            </div>
            {clients.error && (
              <p className={styles.error}>{clients.error.message}</p>
            )}
          </div>
          <div className={styles.checklist}>
            {Object.entries(preferenceLabels).map(([key, label]) => (
              <label className={styles.check} key={key}>
                <input
                  type="checkbox"
                  checked={preferences[key as keyof typeof preferences]}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
          {(save.error || remove.error) && (
            <p role="alert" className={styles.error}>
              {save.error?.message ?? remove.error?.message}
            </p>
          )}
        </div>
      </StatusPanel>
    </Modal>
  );
}
