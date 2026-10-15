"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import ui from "../../ui/meri-ui.module.css";
import styles from "./sources.module.css";

type CopyStatus = "idle" | "copied" | "unavailable";
const DISMISS_AFTER_MS = 6000;

/** Clipboard copy with an outcome that dismisses itself and clears its timer on unmount. */
export function useClipboardCopy() {
  const [status, setStatus] = useState<CopyStatus>("idle");
  useEffect(() => {
    if (status === "idle") return;
    const timer = window.setTimeout(() => setStatus("idle"), DISMISS_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [status]);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("unavailable");
    }
  }, []);
  return { status, copy, dismiss: () => setStatus("idle") };
}

/** Overlay · Copied: local clipboard outcome, announced politely. */
export function CopyToast({
  status,
  subject,
  onDismiss,
}: {
  status: CopyStatus;
  subject: string;
  onDismiss: () => void;
}) {
  return (
    <div role="status" aria-live="polite">
      {status === "idle" ? null : (
        <div
          className={styles.toast}
          data-tone={status === "copied" ? "success" : "danger"}
        >
          <span className={styles.toastIcon} aria-hidden>
            {status === "copied" ? <Check /> : <X />}
          </span>
          <div className={styles.toastBody}>
            <h2>{status === "copied" ? "Copied" : "Copy unavailable"}</h2>
            <p>
              {status === "copied"
                ? `${subject} copied to your clipboard.`
                : "This browser did not allow clipboard access."}
            </p>
            <button type="button" className={ui.ghost} onClick={onDismiss}>
              <X aria-hidden /> Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
