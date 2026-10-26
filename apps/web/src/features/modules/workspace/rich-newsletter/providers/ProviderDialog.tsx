"use client";
import type { ReactNode } from "react";
import { ActionButton, Modal, Panel } from "../../../../../shared/module-ui";
import type { ProviderProposal } from "./use-provider-proposal";
import styles from "../assets/assets.module.css";

export function ProviderDialog({
  open,
  close,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  close: () => void;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={title}
      description={description}
      className={styles.modal}
      footer={
        <>
          <ActionButton onClick={close}>Close</ActionButton>
          {footer}
        </>
      }
    >
      <div className={styles.stack}>{children}</div>
    </Modal>
  );
}
export function ProviderNotice({
  phase,
  reason,
}: Pick<ProviderProposal<unknown>, "phase" | "reason">) {
  if (phase === "pending")
    return (
      <p role="status" className={styles.notice}>
        Request in progress… Closing does not cancel processing by the provider.
      </p>
    );
  if (phase === "unknown")
    return (
      <p role="alert" className={styles.notice}>
        This request could not be confirmed. The provider may have processed it
        or charged for it. It will not be repeated from this view.
        {reason && <span> Service response: {reason}</span>}
      </p>
    );
  if (phase === "stale")
    return (
      <p role="alert" className={styles.notice}>
        The content changed while this proposal was being prepared. The earlier
        result cannot replace the current content.
      </p>
    );
  return null;
}
export function ProviderAvailability({
  loading,
  reason,
  available,
  retry,
}: {
  loading: boolean;
  reason?: string | null;
  available?: boolean;
  retry: () => void;
}) {
  if (loading) return <p role="status">Checking availability…</p>;
  if (available) return null;
  return (
    <div className={styles.panel}>
      <Panel title="Tool unavailable">
        <p>{reason || "Availability could not be confirmed."}</p>
        <ActionButton onClick={retry}>Check availability</ActionButton>
      </Panel>
    </div>
  );
}
