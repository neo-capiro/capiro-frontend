import type { StatusTone } from "../../ui/StatusPill";

/** Phases that show one proposal revision (05.06 and 05.10–05.14, 05.17, 05.18, 05.20). */
export type ProposalPhase =
  | "draft"
  | "submitting"
  | "pending"
  | "rejected"
  | "changes-requested"
  | "revised"
  | "submission-error"
  | "status-uncertain"
  | "changed";

/** Phases of the proposal queue that never show proposal content (05.15, 05.16, 05.19). */
export type QueuePhase = "loading" | "load-error" | "restricted";

/**
 * What the browser may do in each phase. Only an unsubmitted draft is editable;
 * submitted, reviewed, stale and uncertain revisions are read-only, and an
 * in-flight read or write disables every action instead of repeating it.
 */
export const phaseRules: Readonly<
  Record<ProposalPhase | QueuePhase, { editable: boolean; busy: boolean }>
> = {
  draft: { editable: true, busy: false },
  submitting: { editable: false, busy: true },
  pending: { editable: false, busy: false },
  rejected: { editable: false, busy: false },
  "changes-requested": { editable: false, busy: false },
  revised: { editable: true, busy: false },
  "submission-error": { editable: true, busy: false },
  "status-uncertain": { editable: false, busy: false },
  changed: { editable: false, busy: false },
  loading: { editable: false, busy: true },
  "load-error": { editable: false, busy: false },
  restricted: { editable: false, busy: false },
};

/** Navigation when href is set; otherwise a disabled control (a write or read with no connected service). */
export type ProposalAction = { label: string; href?: string | undefined };

export type ProposalContent = {
  currentFact: string;
  proposedFact: string;
  owner: string;
  visibility: string;
  reason: string;
};

type ProposalFrame = {
  heading: string;
  description: string;
  title: string;
  context: string;
  /** Lifecycle status beside the dialog title; the first draft has none. */
  status?: { label: string; tone: StatusTone };
  /** Meri/Memory proposal feedback: what happened and what stays canonical. */
  feedback?: { tone: StatusTone; title: string; lines: readonly string[] };
  footnote: string;
  secondary: ProposalAction;
  primary: ProposalAction;
};

export type MemoryProposalView = ProposalFrame &
  ({ phase: ProposalPhase; content: ProposalContent } | { phase: QueuePhase });
