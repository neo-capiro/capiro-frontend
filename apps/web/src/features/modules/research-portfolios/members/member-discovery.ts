import type {
  MemberAwards,
  MemberSearch,
} from "../../../../shared/capiro/operations/research-member-discovery";
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
