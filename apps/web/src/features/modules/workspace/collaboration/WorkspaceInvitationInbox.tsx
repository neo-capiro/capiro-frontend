"use client";

import { useState } from "react";
import type { CapiroMe } from "../../../../shared/capiro/operations/settings-schemas";
import type { WorkspaceNotification } from "../../../../shared/capiro/operations/workspace-notifications";
import { CapiroApiError } from "../../../../shared/capiro/http";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import { ActionButton, Modal, StatusPanel } from "../../../../shared/module-ui";
import { accessRefused } from "./use-collaboration";
import styles from "./collaboration.module.css";

function NotificationCard({
  item,
  me,
  refresh,
  fail,
}: {
  item: WorkspaceNotification;
  me: CapiroMe;
  refresh: () => void;
  fail: (error: unknown) => void;
}) {
  const accept = useCapiroMutation("workspace.collaborator.accept");
  const decline = useCapiroMutation("workspace.collaborator.decline");
  const read = useCapiroMutation("workspace.notification.read");
  const pending = accept.pending || decline.pending || read.pending;
  const actionable =
    item.kind === "collab_invite" &&
    item.actionable &&
    item.draftId &&
    item.collaboratorId;
  async function decide(action: "accept" | "decline") {
    if (!actionable || pending) return;
    const params = { draftId: item.draftId!, id: item.collaboratorId! };
    try {
      if (action === "accept") {
        const result = await accept.run({ params });
        if (
          result.id !== params.id ||
          result.draftId !== params.draftId ||
          result.tenantId !== me.tenant.id ||
          result.subjectId !== me.user.clerkUserId ||
          result.status !== "active"
        )
          throw new CapiroApiError(
            502,
            "Acceptance was not confirmed. Refresh invitations to check.",
          );
      } else await decline.run({ params });
      refresh();
    } catch (error) {
      fail(error);
    }
  }
  async function markRead() {
    try {
      await read.run({ params: { id: item.id } });
      refresh();
    } catch (error) {
      fail(error);
    }
  }
  return (
    <article
      className={styles.card}
      data-design-node={actionable ? "3153:116352" : undefined}
    >
      <p className={styles.caption}>
        {item.kind === "collab_invite"
          ? "Document invitation"
          : "Workspace notification"}
      </p>
      <h3>{item.draftTitle || "Workspace document"}</h3>
      <p>
        {actionable
          ? `${item.actorName || "A teammate"} invited you to this document${item.role ? ` as a ${item.role.charAt(0).toUpperCase()}${item.role.slice(1)}` : ""}.`
          : item.message}
      </p>
      {actionable && (
        <p className={styles.caption}>
          Accept the invitation to access this document, subject to current
          firm, client and document restrictions.
        </p>
      )}
      <div className={styles.actions}>
        {actionable && (
          <>
            <ActionButton
              type="button"
              disabled={pending}
              onClick={() => void decide("decline")}
            >
              Decline
            </ActionButton>
            <ActionButton
              type="button"
              primary
              disabled={pending}
              onClick={() => void decide("accept")}
            >
              Accept invitation
            </ActionButton>
          </>
        )}
        {!item.read && (
          <ActionButton
            type="button"
            disabled={pending}
            onClick={() => void markRead()}
          >
            Mark read
          </ActionButton>
        )}
        {item.read && <span className={styles.caption}>Read</span>}
      </div>
      {pending && <p role="status">Updating invitation…</p>}
    </article>
  );
}

function CurrentInbox({ me }: { me: CapiroMe }) {
  const query = useCapiroQuery("workspace.notifications", {});
  const readAll = useCapiroMutation("workspace.notifications.readAll");
  const [failure, setFailure] = useState<Error>();
  const [refused, setRefused] = useState<Error>();
  const mismatch = query.data?.items.some(
    (item) =>
      item.tenantId !== me.tenant.id ||
      item.recipientId !== me.user.clerkUserId,
  );
  const error =
    query.error ??
    refused ??
    (mismatch
      ? new Error("These notifications do not match the current account.")
      : undefined);
  function refresh() {
    setFailure(undefined);
    setRefused(undefined);
    query.reload();
  }
  function fail(error: unknown) {
    if (error instanceof Error && error.name === "AbortError") return;
    const message = new Error(
      "The action could not be confirmed. Refresh invitations before taking another action.",
    );
    if (accessRefused(error)) setRefused(message);
    setFailure(message);
    query.reload();
  }
  async function markAllRead() {
    try {
      await readAll.run({});
      refresh();
    } catch (error) {
      fail(error);
    }
  }
  return (
    <div className={styles.stack}>
      <div className={styles.actions}>
        <ActionButton
          type="button"
          onClick={refresh}
          disabled={readAll.pending}
        >
          Refresh invitations
        </ActionButton>
        {!error && !query.loading && Boolean(query.data?.unread) && (
          <ActionButton
            type="button"
            disabled={readAll.pending}
            onClick={() => void markAllRead()}
          >
            Mark all read
          </ActionButton>
        )}
      </div>
      <StatusPanel loading={query.loading} error={error} onRetry={refresh}>
        {failure && <p role="alert">{failure.message}</p>}
        {query.data && (
          <p>
            {query.data.unread} unread. Showing recent Workspace notifications.
          </p>
        )}
        {query.data &&
          !query.data.items.some(
            (item) =>
              item.kind === "collab_invite" &&
              item.actionable &&
              item.draftId &&
              item.collaboratorId,
          ) && <p>No actionable invitations returned.</p>}
        {query.data?.items.map((item) => (
          <NotificationCard
            key={item.id}
            item={item}
            me={me}
            refresh={refresh}
            fail={fail}
          />
        ))}
      </StatusPanel>
    </div>
  );
}

/** Can mount before a pending invitee has permission to read the draft. */
export function WorkspaceInvitationInbox() {
  const me = useCapiroQuery("me.read", {});
  return (
    <StatusPanel loading={me.loading} error={me.error} onRetry={me.reload}>
      {me.data && (
        <CurrentInbox
          key={`${me.data.tenant.id}:${me.data.user.clerkUserId}`}
          me={me.data}
        />
      )}
    </StatusPanel>
  );
}

export function WorkspaceInvitationEntry() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionButton type="button" onClick={() => setOpen(true)}>
        Invitations
      </ActionButton>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Workspace invitations"
        description="Review your recent document invitations and notifications."
        className={styles.dialog}
        footer={
          <ActionButton onClick={() => setOpen(false)}>Done</ActionButton>
        }
      >
        {open && <WorkspaceInvitationInbox />}
      </Modal>
    </>
  );
}
