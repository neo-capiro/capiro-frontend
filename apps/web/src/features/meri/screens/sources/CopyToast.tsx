"use client";
import { useCallback, useEffect, useState } from "react";
import { ToastCard, ToastRegion } from "../../ui/ToastCard";

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
    <ToastRegion>
      {status === "idle" ? null : (
        <ToastCard
          title={status === "copied" ? "Copied" : "Copy unavailable"}
          detail={
            status === "copied"
              ? `${subject} copied to your clipboard.`
              : "This browser did not allow clipboard access."
          }
          icon={status === "copied" ? "success" : "danger"}
          onDismiss={onDismiss}
        />
      )}
    </ToastRegion>
  );
}
