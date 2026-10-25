"use client";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { MeriDialog } from "../../ui/MeriDialog";
import { StatusPill } from "../../ui/StatusPill";
import { ScopeChoice, type ScopeOption } from "./ScopeChoice";
import ui from "../../ui/meri-ui.module.css";

export type ScopeView = {
  options: readonly ScopeOption[];
  /** Scope currently applied to the conversation; choosing another stays local. */
  appliedId: string;
  /** Search text the picker opens with (01.03A shows a search with no permitted match). */
  initialQuery?: string;
};

/** 01.03 Choose client and data scope (and 01.03A no matches): permitted scopes only; applying needs the trusted service. */
export function ScopeScreen({
  view,
  unavailable,
}: {
  view: ScopeView;
  unavailable: string;
}) {
  const [open, setOpen] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  const applied = view.options.find((option) => option.id === view.appliedId);
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="A workspace for your work"
        description="Choose the scope for this conversation."
      />
      {open ? null : (
        <div className={ui.row}>
          <button
            type="button"
            className={ui.outline}
            ref={trigger}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            <ChevronDown aria-hidden /> {applied?.name ?? "Choose a scope"}
          </button>
          <StatusPill>Your authorized data</StatusPill>
        </div>
      )}
      <MeriDialog
        open={open}
        onOpenChange={setOpen}
        returnFocus={trigger}
        title="Choose a scope"
        description="Only clients and sources available to your account appear here."
        width="default"
      >
        <ScopeChoice
          options={view.options}
          appliedId={view.appliedId}
          initialQuery={view.initialQuery ?? ""}
          onCancel={() => setOpen(false)}
          apply={(choice) => (
            <button
              type="button"
              className={ui.primary}
              disabled
              title={unavailable}
            >
              Use {choice?.name ?? "scope"}
            </button>
          )}
        />
      </MeriDialog>
    </div>
  );
}
