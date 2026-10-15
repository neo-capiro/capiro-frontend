"use client";
import type { ReactNode } from "react";
import { Confirmation } from "@capiro/ui/confirmation";
import panel from "../../ui/panel.module.css";

export type ProposalOutcome = "pending" | "approved" | "rejected";

const confirmationStates = {
  pending: { state: "approval-requested", approved: undefined },
  approved: { state: "output-available", approved: true },
  rejected: { state: "output-denied", approved: false },
} as const;

/** Adopted AI Elements Confirmation bound to one immutable proposal and its displayed outcome. */
export function ProposalConfirmation({
  id,
  outcome,
  label,
  tone = "card",
  narrow = false,
  children,
}: {
  id: string;
  outcome: ProposalOutcome;
  label: string;
  tone?: "card" | "muted";
  narrow?: boolean;
  children: ReactNode;
}) {
  const { state, approved } = confirmationStates[outcome];
  return (
    <Confirmation
      state={state}
      approval={approved === undefined ? { id } : { id, approved }}
      role="region"
      aria-label={label}
      className={`${panel.panel} ${narrow ? panel.narrow : ""}`}
      data-tone={tone}
    >
      {children}
    </Confirmation>
  );
}
