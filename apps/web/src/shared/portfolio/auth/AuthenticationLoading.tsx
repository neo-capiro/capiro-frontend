"use client";
import { useEffect, useState } from "react";
import { ActionButton, PageHeader } from "@/shared/module-ui";
import styles from "./authentication-loading.module.css";

/** Feedback for elapsed SDK loading; never establishes authentication or its cause. */
export function AuthenticationLoading() {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDelayed(true), 15_000);
    return () => window.clearTimeout(timer);
  }, []);
  if (!delayed)
    return (
      <main className={styles.screen}>
        <h1 className="sr-only">Sign-in</h1>
        <p role="status">Loading sign-in…</p>
      </main>
    );
  return (
    <main className={styles.screen}>
      <div className={styles.message}>
        <PageHeader title="Sign-in is taking longer than expected" />
        <p role="status">
          The sign-in service has not finished loading. Reload to try again.
        </p>
        <p>If this continues, contact your administrator.</p>
        <ActionButton onClick={() => window.location.reload()}>
          Reload
        </ActionButton>
      </div>
    </main>
  );
}
