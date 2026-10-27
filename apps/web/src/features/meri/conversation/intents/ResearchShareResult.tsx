"use client";
import { useState } from "react";
import { Button } from "@capiro/ui/button";
import styles from "./intents.module.css";

/** Only the fresh winning decision response supplies this in-memory capability. */
export function ResearchShareResult({
  sharePath,
  onDismiss,
}: {
  sharePath: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const url = `${window.location.origin}${sharePath}`;
  return (
    <section className={styles.card} aria-label="Published client link">
      <h3>Client link published</h3>
      <p>
        This address is shown once. Copy it now and share the PIN separately
        yourself. Nothing was sent.
      </p>
      <code className={styles.hash}>{url}</code>
      <div className={styles.actions}>
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setError(false);
            } catch {
              setError(true);
            }
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button variant="outline" onClick={onDismiss}>
          Dismiss address
        </Button>
      </div>
      {error && (
        <p role="alert">
          The address could not be copied. Select and copy the displayed
          address.
        </p>
      )}
    </section>
  );
}
