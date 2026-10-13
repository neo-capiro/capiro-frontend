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
  title: string;
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
  if (error)
    return (
      <div className={styles.status} role="alert">
        <h2>Unable to load this view</h2>
        <p>{typeof error === "string" ? error : error.message}</p>
        {onRetry && <ActionButton onClick={onRetry}>Try again</ActionButton>}
      </div>
    );
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
