"use client";

import { useId, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@capiro/ui/tooltip";
import styles from "./shell.module.css";

/** Explain an existing disabled action without making that action executable. */
export function UnavailableControlReason({
  label,
  reason,
  children,
}: {
  label: string;
  reason?: string | undefined;
  children?: ReactNode;
}) {
  const reasonId = useId();
  if (!reason) return children;
  return (
    <div
      className={styles.unavailableControl}
      role="group"
      aria-label={label}
      aria-describedby={reasonId}
    >
      {children}
      <span id={reasonId} hidden>
        {reason}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={styles.unavailableInfo}
            aria-label={`${label} unavailable. ${reason}`}
          >
            <Info size={14} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className={styles.unavailableReason}>
          {reason}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
