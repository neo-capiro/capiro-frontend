/**
 * QuickActions rollout gate for the composer's skill selection.
 *
 * Core owns the rollout (env kill-switch AND tenant cohort AND tenant flag `meriv3.quickActionSkills`);
 * this module only translates that read into "which typed skills may be newly selected right now".
 * The typed contract from `@capiro/meri-contracts` stays authoritative for ids, versions, subject
 * kinds and window bases — Core's rows are metadata and are used here for their ids alone.
 *
 * Two deliberate rules:
 *  - the fourteen Core quick actions are matched through an explicit `quick_skill.` mapping, never a
 *    name coincidence;
 *  - `quick_skill.cited_report` is NOT a Core quick action. It is the existing native report /
 *    document-revision skill, so it is never gated by this catalog, and it is never dropped to make
 *    the list count fourteen.
 */

/** Core's fourteen `quickAction: true` registry ids (packages/shared/src/meri-skills.ts). */
export const CORE_QUICK_ACTION_IDS = [
  "research_company",
  "relationship_brief",
  "client_changes",
  "portfolio_changes",
  "portfolio_overlap",
  "mail_history",
  "meeting_prep",
  "commitments_audit",
  "funding_opportunity_match",
  "pe_deep_dive",
  "bill_watch",
  "hearing_watch",
  "representation_lookup",
  "regulatory_docket_brief",
] as const;

/** Bundled typed ids carry this prefix; the mapping below is explicit rather than string-guessed. */
export const QUICK_SKILL_PREFIX = "quick_skill.";

/** Native typed skills that the Core quick-action catalog never governs. */
export const UNGATED_SKILL_IDS = ["quick_skill.cited_report"] as const;

const ungated = new Set<string>(UNGATED_SKILL_IDS);

/** `quick_skill.<coreId>` for exactly the fourteen Core quick actions. */
export const gatedSkillIds = new Set<string>(
  CORE_QUICK_ACTION_IDS.map((id) => `${QUICK_SKILL_PREFIX}${id}`),
);

/** Every typed id this client knows: the fourteen gated actions plus the ungated native skills. */
export const ALL_TYPED_SKILL_IDS: ReadonlySet<string> = new Set<string>([
  ...gatedSkillIds,
  ...UNGATED_SKILL_IDS,
]);

export type QuickActionGate =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "off" }
  | { status: "on"; available: ReadonlySet<string> };

export type QuickActionCatalogRead = {
  pending: boolean;
  failed: boolean;
  enabled?: boolean;
  ids?: readonly string[];
};

/**
 * Map the Core read onto the gate. Any state that is not a confirmed, enabled catalog keeps every
 * gated skill out of new selections; the ungated native skills stay available in all states.
 */
export function quickActionGate(read: QuickActionCatalogRead): QuickActionGate {
  if (read.failed) return { status: "unavailable" };
  if (read.pending) return { status: "loading" };
  if (!read.enabled) return { status: "off" };
  const available = new Set<string>(ungated);
  for (const id of read.ids ?? []) {
    const typed = `${QUICK_SKILL_PREFIX}${id}`;
    if (gatedSkillIds.has(typed)) available.add(typed);
  }
  return { status: "on", available };
}

/**
 * Whether a NEW intent may select this skill. Historical selections are never rewritten: an already
 * applied skill keeps its exact typed id/version/window in the draft (and in any retained or
 * unknown-ACK request bytes) even when the rollout is later switched off.
 */
export function newSelectionAllowed(
  gate: QuickActionGate,
  skillId: string,
): boolean {
  if (!gatedSkillIds.has(skillId)) return true;
  return gate.status === "on" && gate.available.has(skillId);
}

/** Every skill this gate may offer as a new selection. */
export function offeredSkillIds(gate: QuickActionGate): ReadonlySet<string> {
  return gate.status === "on" ? gate.available : ungated;
}

/** One user-facing line when a gated skill cannot be offered; empty when nothing is restricted. */
export function gateMessage(gate: QuickActionGate): string | undefined {
  if (gate.status === "loading") return "Checking which quick actions are available…";
  if (gate.status === "unavailable")
    return "Quick actions are unavailable right now. Other skills still work.";
  if (gate.status === "off")
    return "Quick actions are turned off for this workspace.";
  return undefined;
}

/**
 * Refusal for a NEW first submission or next turn that would carry a gated skill while the current
 * rollout read is loading, unavailable, off or does not list that id.
 *
 * This is deliberately the same decision as `newSelectionAllowed`: an applied-but-never-submitted
 * draft is not an unknown external effect, so it gets no recovery exemption. An already submitted
 * request keeps its exact bytes on its own retention/readback path — this refusal is evaluated only
 * when a new intent is about to be recorded or dispatched.
 */
export function newIntentRefusal(
  gate: QuickActionGate,
  selection:
    | { skill?: { skillId?: string; [key: string]: unknown } | undefined }
    | null
    | undefined,
): string | undefined {
  const skillId = selection?.skill?.skillId;
  if (!skillId) return undefined;
  if (newSelectionAllowed(gate, skillId)) return undefined;
  return (
    gateMessage(gate) ??
    "This quick action is not available for a new message right now."
  );
}
