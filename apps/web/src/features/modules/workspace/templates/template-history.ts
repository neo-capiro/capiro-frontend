import type { OutreachTemplateSpec } from "../../../../shared/capiro/operations/outreach-template-schemas";
import { templateFieldLabels } from "./template-model";

const label = (key: string) =>
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
function display(value: unknown): string {
  if (value === null || value === undefined) return "Not set";
  if (value === "") return "Empty text";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value))
    return value.length ? value.map(display).join("\n") : "None";
  return Object.entries(value)
    .map(([key, item]) => `${label(key)}: ${display(item)}`)
    .join("; ");
}

/** Display only the canonical template spec; no hash, publication or causal inference. */
export function templateSnapshot(spec: OutreachTemplateSpec) {
  const rows: Array<{
    key: string;
    label: string;
    value: string;
    serialized: string | undefined;
  }> = [];
  const add = (
    key: string,
    name: string,
    value: unknown,
    shown = display(value),
  ) =>
    rows.push({
      key,
      label: name,
      value: shown,
      serialized: JSON.stringify(value),
    });
  for (const key of [
    "goal",
    "objective",
    "topic",
    "desiredOutcome",
    "whyNow",
  ] as const)
    add(key, templateFieldLabels[key], spec.goal[key]);
  add(
    "ask",
    "Ask",
    spec.goal.ask,
    `${spec.goal.ask.mode}: ${spec.goal.ask.text ?? "Not set"}`,
  );
  add("sponsor", "Sponsor", spec.sponsor);
  add("targeting", "Audience criteria", spec.targeting.criteria);
  add("delivery", "Delivery pattern", spec.delivery.pattern);
  add("personalization", "Personalization", spec.delivery.personalization);
  for (const key of ["campaignAngle", "tone", "length"] as const)
    add(key, templateFieldLabels[key], spec.strategy[key]);
  add(
    "customLength",
    "Custom length instruction",
    spec.strategy.customLengthInstruction,
  );
  add("samples", "Style samples", spec.styleSamples);
  add("skeleton", "Content outline", spec.contentSkeleton);
  add("variables", "Questions and variables", spec.variables);
  for (const [key, value] of Object.entries(spec.defaultsPolicy))
    add(
      "policy." + key,
      `${templateFieldLabels[key as keyof typeof templateFieldLabels]} policy`,
      value,
    );
  for (const [key, value] of Object.entries(spec.guidance))
    add("guidance." + key, "Guidance · " + label(key), value);
  for (const [key, value] of Object.entries(spec.guardrails))
    add("guardrail." + key, "Guardrail · " + label(key), value);
  return rows;
}

export function compareTemplates(
  before: OutreachTemplateSpec,
  after: OutreachTemplateSpec,
) {
  const previous = new Map(
    templateSnapshot(before).map((row) => [row.key, row]),
  );
  return templateSnapshot(after).flatMap((row) =>
    previous.get(row.key)?.serialized === row.serialized
      ? []
      : [{ ...row, before: previous.get(row.key)?.value ?? "Not set" }],
  );
}
