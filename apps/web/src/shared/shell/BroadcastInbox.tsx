"use client";
import { useState } from "react";
import Image from "next/image";
import { ActionButton, Modal } from "../module-ui";
import { useBroadcastInbox } from "./useBroadcastInbox";
import styles from "./broadcast-inbox.module.css";

export function BroadcastInbox() {
  const state = useBroadcastInbox();
  const [open, setOpen] = useState(false);
  const rows = state.query.data;
  if (
    !rows?.length &&
    !state.query.error &&
    !state.pendingId &&
    !state.message &&
    !state.error
  )
    return null;
  return (
    <section className={styles.banner} aria-label="Workspace notices">
      <span>
        {state.query.error
          ? "Workspace notices unavailable"
          : `Workspace notices${rows?.length ? ` · ${rows.length} pending in this batch` : ""}`}
      </span>
      <ActionButton onClick={() => setOpen(true)}>Review notices</ActionButton>
      <Modal
        open={open}
        onOpenChange={(value) => {
          if (!state.busy) setOpen(value);
        }}
        closeDisabled={state.busy}
        title="Workspace notices"
        description="Opening or closing this inbox does not acknowledge a notice. Acknowledge only after reading it."
        footer={
          <ActionButton
            disabled={state.busy || state.query.loading}
            onClick={state.query.reload}
          >
            Refresh pending notices
          </ActionButton>
        }
      >
        {state.query.loading && <p role="status">Checking current notices…</p>}
        {(state.query.error || state.error) && (
          <p role="alert">{state.error ?? state.query.error?.message}</p>
        )}
        {state.message && <p role="status">{state.message}</p>}
        {state.pendingId && (
          <div className={styles.recovery} role="status">
            <p>
              The previous acknowledgement is unconfirmed. Recheck this exact
              notice; the service keeps the first acknowledgement time. Absence
              from the pending list alone is not a receipt.
            </p>
            <ActionButton
              disabled={state.busy}
              onClick={() => void state.acknowledge(state.pendingId!)}
            >
              Confirm retained acknowledgement
            </ActionButton>
          </div>
        )}
        {rows && !rows.length && (
          <p>No notices are pending in the current read.</p>
        )}
        <ol className={styles.list} data-design-node="1064:253731">
          {rows?.map((notice) => (
            <li className={styles.item} key={notice.id}>
              <Image
                src="/design/shared/broadcast-bell.svg"
                width={16}
                height={16}
                alt=""
              />
              <div className={styles.content}>
                <h3>{notice.title}</h3>
                <time dateTime={notice.createdAt}>
                  {new Date(notice.createdAt).toLocaleString()}
                </time>
                <p>{notice.body}</p>
              </div>
              <ActionButton
                disabled={
                  state.busy || !!state.pendingId || state.query.loading
                }
                onClick={() => void state.acknowledge(notice.id)}
              >
                Acknowledge
              </ActionButton>
            </li>
          ))}
        </ol>
        {rows?.length === 100 && (
          <p>
            Showing the oldest 100 pending notices. Refresh after acknowledging
            to read the next batch.
          </p>
        )}
      </Modal>
    </section>
  );
}
