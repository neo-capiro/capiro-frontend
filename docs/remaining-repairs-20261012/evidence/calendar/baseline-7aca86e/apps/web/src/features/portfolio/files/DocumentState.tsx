import type { ReactNode } from "react";
import { ApiError } from "@/shared/portfolio/api/http";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import styles from "./entity-documents.module.css";

/** The document-specific frame composes the canonical retry/session control. */
export function DocumentState({
  loading,
  error,
  retry,
  children,
}: {
  loading?: boolean;
  error?: Error | null;
  retry?: () => void;
  children?: ReactNode;
}) {
  if (loading)
    return (
      <div
        className={styles.state}
        role="status"
        aria-label="Loading documents"
      >
        <p>Loading documents</p>
        <span className={styles.skeleton} aria-hidden="true" />
        <span className={styles.skeleton} aria-hidden="true" />
      </div>
    );
  if (error)
    return (
      <div className={styles.state}>
        <QueryState
          error={
            retry &&
            !(error instanceof ApiError && [401, 403].includes(error.status))
              ? new Error("Documents could not be loaded.")
              : error
          }
          retry={retry}
        />
      </div>
    );
  return children ? (
    <div className={styles.state} role="status">
      <p>{children}</p>
    </div>
  ) : null;
}
