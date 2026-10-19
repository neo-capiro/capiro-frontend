"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { ToastCard, ToastRegion } from "../../ui/ToastCard";
import ui from "../../ui/meri-ui.module.css";
import type { SettingsOutcome } from "./settings-view";

/** Figma 3.4 Settings outcome overlay (Sonner success): a recorded result with a labelled dismiss. */
export function SettingsToast({ outcome }: { outcome: SettingsOutcome }) {
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);
  return (
    <ToastRegion>
      {open ? (
        <ToastCard
          title={outcome.title}
          detail={outcome.detail}
          icon="success"
          onDismiss={close}
        >
          <button type="button" className={ui.ghost} onClick={close}>
            <X aria-hidden /> Dismiss
          </button>
        </ToastCard>
      ) : null}
    </ToastRegion>
  );
}
