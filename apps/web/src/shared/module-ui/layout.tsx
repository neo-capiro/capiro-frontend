"use client";

import type { ReactNode } from "react";
import { ActionButton } from "./controls";
import styles from "./module-ui.module.css";

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  titleAccessory,
}: {
  title: ReactNode;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  titleAccessory?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        {titleAccessory ? (
          <div className={styles.titleRow}>
            <h1>{title}</h1>
            {titleAccessory}
          </div>
        ) : (
          <h1>{title}</h1>
        )}
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      {(title || description || actions) && (
        <header className={styles.panelHeader}>
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * Conditions a retry cannot resolve. A retry would fail identically, so offering
 * "Try again" is misleading - the caller must fix access or configuration.
 */
const nonRetryableStatuses = new Set([401, 403, 404]);
const nonRetryableCodes = new Set(["PREVIEW_BACKEND_HELD"]);

function refusal(error: Error | string | null): {
  retryable: boolean;
  status?: number;
} | null {
  if (!error || typeof error === "string") return null;
  const status = (error as { status?: unknown }).status;
  const upstreamCode = (error as { upstreamCode?: unknown }).upstreamCode;
  const hasStatus = typeof status === "number";
  if (hasStatus && nonRetryableStatuses.has(status))
    return { retryable: false, status };
  if (typeof upstreamCode === "string" && nonRetryableCodes.has(upstreamCode))
    return { retryable: false, status: hasStatus ? status : undefined };
  return { retryable: true, status: hasStatus ? status : undefined };
}

function unavailableReason(status?: number): string {
  if (status === 401)
    return "Your session is no longer valid. Sign in again to continue.";
  if (status === 403)
    return "Your account does not have access to this view. Access must be granted before it can load.";
  if (status === 404) return "This record is no longer available.";
  return "This view is held or not configured for this environment. Retrying will not change it.";
}

export function StatusPanel({
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  loading?: boolean;
  error?: Error | string | null;
  empty?: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  if (loading)
    return (
      <div className={styles.status} role="status">
        Loading…
      </div>
    );
  if (error) {
    const message = typeof error === "string" ? error : error.message;
    const classification = refusal(error);
    if (classification && !classification.retryable)
      return (
        <div className={styles.status} role="alert">
          <h2>This view is unavailable</h2>
          <p>{message}</p>
          <p className={styles.statusNote}>
            {unavailableReason(classification.status)}
          </p>
        </div>
      );
    return (
      <div className={styles.status} role="alert">
        <h2>Unable to load this view</h2>
        <p>{message}</p>
        {onRetry && <ActionButton onClick={onRetry}>Try again</ActionButton>}
      </div>
    );
  }
  if (empty)
    return (
      <div className={styles.status}>
        <h2>{empty}</h2>
        <p>Adjust your filters or add a record to get started.</p>
      </div>
    );
  return <>{children}</>;
}

export function UnavailableAction({
  children,
  reason,
}: {
  children: ReactNode;
  reason: string;
}) {
  return (
    <span className={styles.unavailable}>
      <ActionButton disabled title={reason}>
        {children}
      </ActionButton>
      <span>{reason}</span>
    </span>
  );
}
