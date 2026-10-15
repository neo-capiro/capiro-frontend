"use client";
import { useState } from "react";
import { LinkAction } from "../../ui/LinkAction";
import { StatusPill } from "../../ui/StatusPill";
import { ToastCard, ToastRegion } from "../../ui/ToastCard";
import styles from "./files.module.css";

/** An already-recorded filing or download outcome (Figma 3.4 Artifact filed / Download ready overlays). */
export type ReceiptToast = {
  id: string;
  title: string;
  detail: string;
  /** Recorded status shown with the outcome, e.g. "Saved". */
  status?: string;
  /** Offers a route back to the artifact the outcome belongs to. */
  backToArtifact?: boolean;
};

/** Dismissible stack of recorded outcome toasts; dismissing never changes the recorded result. */
export function ReceiptToasts({
  toasts,
  artifactHref,
  unavailable,
  onEmpty,
}: {
  toasts: readonly ReceiptToast[];
  artifactHref?: string | undefined;
  unavailable: string;
  /** Called once every toast has been dismissed. */
  onEmpty?: () => void;
}) {
  const [dismissed, setDismissed] = useState<readonly string[]>([]);
  const visible = toasts.filter((toast) => !dismissed.includes(toast.id));
  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    if (next.length >= toasts.length) onEmpty?.();
  };
  return (
    <ToastRegion>
      <div className={styles.toastStack}>
        {visible.map((toast) => (
          <ToastCard
            key={toast.id}
            title={toast.title}
            detail={toast.detail}
            icon="success"
            onDismiss={() => dismiss(toast.id)}
          >
            {toast.status ? (
              <StatusPill tone="success">{toast.status}</StatusPill>
            ) : null}
            {toast.backToArtifact ? (
              <LinkAction
                variant="primary"
                href={artifactHref}
                unavailable={unavailable}
              >
                Back to artifact
              </LinkAction>
            ) : null}
          </ToastCard>
        ))}
      </div>
    </ToastRegion>
  );
}
