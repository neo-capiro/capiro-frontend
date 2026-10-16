"use client";
import { useState, type ReactNode } from "react";
import { StatusPill, type StatusTone } from "./StatusPill";
import { ToastCard, ToastRegion } from "./ToastCard";
import ui from "./meri-ui.module.css";

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
  const close = () => setOpen(false);
  return (
    <ToastRegion>
      {open ? (
        <ToastCard
          title={title}
          detail={detail}
          icon={success ? "success" : undefined}
          onDismiss={close}
        >
          <StatusPill tone={tone}>{status}</StatusPill>
          {action}
          {dismissLabel ? (
            <button type="button" className={ui.outline} onClick={close}>
              {dismissLabel}
            </button>
          ) : null}
        </ToastCard>
      ) : null}
    </ToastRegion>
  );
}
