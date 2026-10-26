"use client";
import { useEffect, useMemo, useState } from "react";
import {
  parseNewsletterThreadNotifications,
  type NewsletterThreadNotifications,
} from "@capiro/shared/newsletter";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { ActionButton, Modal } from "../../../../../shared/module-ui";
import { isReviewAccessLoss, type ReviewActions } from "./use-review-actions";
import { ReviewActionNotice } from "./ReviewActionNotice";
import styles from "./newsletter-collaboration.module.css";

/** The request targets a known loaded root, never a guessed reply identity. */
export function receiveThread(value: unknown, rootId: string | null) {
  const result = parseNewsletterThreadNotifications(value);
  if (result.ok && result.value.rootId?.toLowerCase() !== rootId?.toLowerCase())
    return {
      ok: false as const,
      error: { code: "identity_mismatch" as const, path: "$.rootId" },
    };
  return result;
}

export function ThreadChoices({
  value,
  selected,
  disabled,
  onChange,
}: {
  value: NewsletterThreadNotifications;
  selected: string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className={styles.card}>
      <h3>Users to notify</h3>
      <p className={styles.hint}>
        {value.emailAvailable
          ? "Email notifications are configured. Delivery status is unavailable here."
          : "Email notifications are unavailable. These choices do not confirm delivery."}
      </p>
      <div className={styles.choices} aria-label="People to notify">
        {value.items.map((person) => (
          <label key={person.userId} className={styles.choice}>
            <input
              type="checkbox"
              role="switch"
              checked={selected.includes(person.userId)}
              disabled={
                disabled ||
                !value.editable ||
                (!selected.includes(person.userId) && selected.length >= 100)
              }
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, person.userId]
                    : selected.filter((id) => id !== person.userId),
                )
              }
            />
            <span>
              {person.name || person.email}
              <br />
              <span className={styles.hint}>{person.email}</span>
            </span>
          </label>
        ))}
      </div>
      {!value.items.length && <p>No eligible people in this loaded view.</p>}
    </div>
  );
}

export function ThreadNotifications({
  documentId,
  rootId,
  actions,
  onClose,
  onAccessLost,
  onSelect,
  initialSelection,
}: {
  documentId: string;
  rootId: string | null;
  actions: ReviewActions;
  onClose: () => void;
  onAccessLost: () => void;
  onSelect?: (ids: string[]) => void;
  initialSelection?: string[];
}) {
  const defaults = useCapiroQuery(
    "workspace.richNewsletter.threadDefaults",
    { params: { id: documentId } },
    { enabled: rootId === null },
  );
  const existing = useCapiroQuery(
    "workspace.richNewsletter.threadRead",
    { params: { id: documentId, commentId: rootId ?? documentId } },
    { enabled: rootId !== null },
  );
  const query = rootId === null ? defaults : existing;
  const result = useMemo(
    () => receiveThread(query.data, rootId),
    [query.data, rootId],
  );
  const value =
    !query.loading && !query.error && result.ok ? result.value : undefined;
  const [selection, setSelection] = useState(initialSelection);
  useEffect(() => {
    if (isReviewAccessLoss(query.error)) onAccessLost();
  }, [query.error, onAccessLost]);
  const save = async () => {
    if (!value?.editable || actions.blocked) return;
    const ids = selection ?? value.userIds;
    if (onSelect) {
      onSelect(ids);
      onClose();
      return;
    }
    if (
      rootId &&
      (await actions.perform(
        "Notification choices",
        () =>
          actions.watchers.run({
            params: { id: documentId, commentId: rootId },
            body: { userIds: ids },
          }),
        (raw) => receiveThread(raw, rootId),
        () => {},
      ))
    )
      onClose();
  };
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !actions.pending) onClose();
      }}
      closeDisabled={actions.pending}
      title="Thread email notifications"
      description="Choose who receives notifications for this thread."
      className={styles.dialog}
      footer={
        <>
          <ActionButton disabled={actions.pending} onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            primary
            disabled={actions.blocked || !value?.editable}
            onClick={() => {
              void save();
            }}
          >
            {onSelect ? "Use these choices" : "Save notifications"}
          </ActionButton>
        </>
      }
    >
      <div className={styles.stack} data-design-node="1176:300515">
        <ReviewActionNotice actions={actions} />
        {query.loading ? (
          <p role="status">Loading notification choices…</p>
        ) : value ? (
          <ThreadChoices
            value={value}
            selected={selection ?? value.userIds}
            onChange={setSelection}
            disabled={actions.blocked}
          />
        ) : (
          <p role="alert">
            Notification choices could not be loaded. Close and open again to
            refresh.
          </p>
        )}
        <p className={styles.hint}>
          Choose up to 100 people. Selecting nobody intentionally turns off
          email notifications for this thread. In-app preferences are separate.
        </p>
      </div>
    </Modal>
  );
}
