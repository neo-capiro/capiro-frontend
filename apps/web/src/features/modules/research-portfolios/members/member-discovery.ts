import type {
  MemberAwards,
  MemberSearch,
} from "../../../../shared/capiro/operations/research-member-discovery";
import type { ResearchBillSearchResponse } from "../../../../shared/capiro/operations/research-bills";
import type { ResearchMember } from "../../../../shared/capiro/operations/research-schemas";

export type MemberTarget = {
  kind: ResearchMember["targetKind"];
  id: string;
  label: string;
  detail: string;
};

/** Search identities are canonical only for these four domain families. */
export function researchTargets(
  search: MemberSearch | undefined,
  kind: MemberTarget["kind"],
): MemberTarget[] {
  const targets = new Map<string, MemberTarget>();
  for (const hit of [
    ...(search?.exact.items ?? []),
    ...(search?.capability.items ?? []),
  ]) {
    if (
      hit.subject.type !== kind ||
      !["program", "program_element", "project", "budget_line"].includes(kind)
    )
      continue;
    if (
      kind !== "program_element" &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        hit.subject.id,
      )
    )
      continue;
    if (!targets.has(hit.subject.id))
      targets.set(hit.subject.id, {
        kind,
        id: hit.subject.id,
        label: hit.subject.label,
        detail: [
          hit.secondaryLabel,
          hit.matchKind.replaceAll("_", " "),
          hit.availability,
          hit.explanation.rationale,
        ]
          .filter(Boolean)
          .join(" · "),
      });
  }
  return [...targets.values()];
}

export function awardTargets(awards: MemberAwards | undefined): MemberTarget[] {
  return (awards?.rows ?? []).map((row) => ({
    kind: "award",
    id: row.id,
    label: row.contractorName || row.piid || "Federal award",
    detail: [row.piid, row.awardingAgency, row.description]
      .filter(Boolean)
      .join(" · "),
  }));
}

export function unresolvedMember(member: ResearchMember) {
  return member.disposition === "unresolved" || member.unresolvedInput != null;
}

/**
 * Bills come from their own legislative catalog, not from the corpus search, so the
 * picker maps them separately. The detail string is what lets a user tell two
 * identically numbered bills apart before adding one: jurisdiction and session are
 * always shown, because the number alone is not an identity.
 */
export function billTargets(
  search: ResearchBillSearchResponse | undefined,
  kind: MemberTarget["kind"],
): MemberTarget[] {
  if (kind !== "federal_bill" && kind !== "state_bill") return [];
  const targets = new Map<string, MemberTarget>();
  for (const hit of search?.items ?? []) {
    if (hit.targetKind !== kind || !hit.targetId) continue;
    if (targets.has(hit.targetId)) continue;
    targets.set(hit.targetId, {
      kind,
      id: hit.targetId,
      label: `${hit.identifier} — ${hit.title}`.slice(0, 500),
      detail: [
        hit.jurisdiction,
        hit.session ? `session ${hit.session}` : null,
        hit.status,
        hit.latestActionDate,
        hit.matchReason.replaceAll("_", " "),
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }
  return [...targets.values()];
}

/** True for the picker kinds served by the bill catalog rather than the corpus. */
export function isBillTargetKind(kind: MemberTarget["kind"]): boolean {
  return kind === "federal_bill" || kind === "state_bill";
}
