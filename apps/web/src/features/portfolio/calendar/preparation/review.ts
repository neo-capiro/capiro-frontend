import type { Preparation } from "./schema";

/** Check saved structured evidence only; free-form caveats are never adjudicated here. */
export function preparationReview(prep: Preparation) {
  const briefing = prep.generatedFrom?.briefing;
  if (
    !briefing ||
    briefing === true ||
    prep.generatedFrom?.grounding?.contentEdited
  )
    return { issues: [], hasLimitations: false };
  const facts = new Set(briefing.facts.map((fact) => fact.id));
  const items = [
    ...briefing.takeaways,
    ...Object.values(briefing.sections).flatMap((section) => section.items),
  ];
  const issues: string[] = [];
  if (
    items.some(
      (item) =>
        item.factIds.length === 0 || item.factIds.some((id) => !facts.has(id)),
    )
  )
    issues.push("Some statements have missing saved evidence references.");
  if (
    Object.values(briefing.sections).some(
      (section) => section.status === "no_evidence" && section.items.length > 0,
    )
  )
    issues.push(
      "A section marked as having no evidence also contains populated statements.",
    );
  return { issues, hasLimitations: briefing.limitations.length > 0 };
}
