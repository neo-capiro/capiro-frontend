"use client";
import { useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { StatusPill, type StatusTone } from "./StatusPill";
import ui from "./meri-ui.module.css";
import styles from "./toast.module.css";

/** Dismissible outcome notification (Figma 3.4 Sonner overlays) for an already-recorded result. */
export function OutcomeToast({
  title,
  detail,
  status,
  tone,
  success = false,
  action,
  dismissLabel,
}: {
  title: string;
  detail: string;
  status: string;
  tone: StatusTone;
  success?: boolean;
  action: ReactNode;
  /** Optional labelled dismiss control, e.g. "Keep paused". */
  dismissLabel?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {open && (
        <section className={styles.toast} aria-label={title}>
          {success && (
            <span className={styles.icon} aria-hidden>
              <Check />
            </span>
          )}
          <div className={styles.content}>
            <h2>{title}</h2>
            <p>{detail}</p>
            <StatusPill tone={tone}>{status}</StatusPill>
            {action}
            {dismissLabel && (
              <button
                type="button"
                className={ui.outline}
                onClick={() => setOpen(false)}
              >
                {dismissLabel}
              </button>
            )}
          </div>
          <button
            type="button"
            className={ui.ghost}
            aria-label={`Dismiss ${title}`}
            onClick={() => setOpen(false)}
          >
            <X aria-hidden />
          </button>
        </section>
      )}
    </div>
  );
}
