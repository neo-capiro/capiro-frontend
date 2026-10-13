"use client";

import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Modal,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./workspace.module.css";

export function WorkspaceShares() {
  const query = useCapiroQuery("workspace.shares", {});
  const revoke = useCapiroMutation("workspace.share.revoke");
  const [selected, setSelected] = useState<{
    id: string;
    draftId: string;
    draftTitle: string;
  }>();
  async function remove() {
    if (!selected) return;
    try {
      await revoke.run({
        params: { draftId: selected.draftId, shareLinkId: selected.id },
      });
      setSelected(undefined);
      query.reload();
    } catch {
      /* The mutation error remains visible. */
    }
  }
  return (
    <>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <DataTable
          rows={query.data?.shares ?? []}
          rowKey={(row) => row.id}
          caption="Client document shares"
          columns={[
            {
              key: "document",
              label: "DOCUMENT",
              render: (row) => (
                <strong>
                  {row.draftTitle}
                  <span className={styles.secondary}>
                    {row.label ?? "Document share"}
                  </span>
                </strong>
              ),
            },
            {
              key: "expires",
              label: "EXPIRES",
              render: (row) =>
                row.expiresAt
                  ? new Date(row.expiresAt).toLocaleDateString()
                  : "No expiry",
            },
            {
              key: "state",
              label: "STATE",
              render: (row) => (
                <Badge
                  tone={
                    row.expiresAt && new Date(row.expiresAt) < new Date()
                      ? "warning"
                      : "success"
                  }
                >
                  {row.expiresAt && new Date(row.expiresAt) < new Date()
                    ? "Expired"
                    : "Active"}
                </Badge>
              ),
            },
            {
              key: "comments",
              label: "FEEDBACK",
              render: (row) => `${row.guestCommentCount} comments`,
            },
            {
              key: "action",
              label: "ACTION",
              render: (row) => (
                <ActionButton onClick={() => setSelected(row)}>
                  Revoke
                </ActionButton>
              ),
            },
          ]}
        />
      </StatusPanel>
      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !revoke.pending) setSelected(undefined);
        }}
        title="Revoke document share?"
        description="This link will stop granting access to the shared document."
        footer={
          <>
            <ActionButton
              disabled={revoke.pending}
              onClick={() => setSelected(undefined)}
            >
              Cancel
            </ActionButton>
            <ActionButton primary disabled={revoke.pending} onClick={remove}>
              {revoke.pending ? "Revoking…" : "Revoke share"}
            </ActionButton>
          </>
        }
      >
        <p>{selected?.draftTitle}</p>
        {revoke.error && (
          <p role="alert" className={styles.error}>
            {revoke.error.message}
          </p>
        )}
      </Modal>
    </>
  );
}
