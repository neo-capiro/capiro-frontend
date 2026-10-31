import type { Preparation } from "./schema";
import type { EditPreparation } from "./api";
import { emailEvidenceText } from "./email-evidence";
export const prepFields = {
  summary: "Summary",
  agenda: "Agenda",
  talkingPoints: "Talking points",
  risks: "Watch-outs",
  followUps: "Follow-ups",
  emailEvidence: "Email evidence",
} as const;
export type PrepField = keyof typeof prepFields;
export function itemText(item: Preparation["agenda"][number]) {
  if (typeof item === "string") return item;
  if ("text" in item) return item.text;
  return `${item.title}${item.description ? ` — ${item.description}` : ""}${item.dueDate ? ` (Due ${item.dueDate})` : ""}`;
}
export type PrepEditability = "editable" | "unbound-legacy" | "other-client";
/**
 * Whether the editor may write this stored prep.
 *
 * A prep saved before the client stamp existed carries `clientId: null` while its
 * meeting is client-scoped. The update path preserves the stored stamp, so the
 * mutation receipt can never match the enclosing client: the write commits and the
 * reader reports it invalid (review finding 2). Until the backend establishes the
 * binding, that row is explicitly read-only rather than silently re-stamped here.
 */
export function prepEditability(
  prep: Pick<Preparation, "clientId">,
  meetingClientId: string | null,
): PrepEditability {
  if (prep.clientId === meetingClientId) return "editable";
  if (prep.clientId == null) return "unbound-legacy";
  return "other-client";
}
export function editValues(prep: Preparation): Record<PrepField, string> {
  return {
    summary: prep.summary ?? "",
    agenda: prep.agenda.map(itemText).join("\n"),
    talkingPoints: prep.talkingPoints.map(itemText).join("\n"),
    risks: prep.risks.map(itemText).join("\n"),
    followUps: prep.followUps.map(itemText).join("\n"),
    emailEvidence: prep.emailEvidence.map(emailEvidenceText).join("\n"),
  };
}
function listLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
/**
 * The exact payload a draft represents, normalized the way the save sends it:
 * summary trimmed (or null), list fields trimmed and blank-filtered.
 *
 * Shared by the save and by the readback comparison, so "what we sent" and what the
 * server stored are compared in the same shape instead of raw draft text against a
 * normalized body.
 */
export function normalizedEditBody(
  values: Record<PrepField, string>,
): Required<EditPreparation> {
  return {
    summary: values.summary.trim() || null,
    agenda: listLines(values.agenda),
    talkingPoints: listLines(values.talkingPoints),
    risks: listLines(values.risks),
    followUps: listLines(values.followUps),
    emailEvidence: listLines(values.emailEvidence),
  };
}
// Only changed sections are sent: untouched evidence-linked items retain their shape.
export function editedBody(
  prep: Preparation,
  values: Record<PrepField, string>,
): EditPreparation {
  const prior = editValues(prep);
  const normalized = normalizedEditBody(values);
  const body: EditPreparation = {};
  for (const key of Object.keys(prepFields) as PrepField[]) {
    if (values[key] === prior[key]) continue;
    if (
      key === "emailEvidence" &&
      prep.emailEvidence.some((item) => typeof item !== "string")
    )
      throw new Error(
        "Structured email evidence retains its source attribution and cannot be edited here.",
      );
    if (key !== "summary" && normalized[key].length > 80)
      throw new Error(`${prepFields[key]} must contain at most 80 items.`);
    Object.assign(body, { [key]: normalized[key] });
  }
  return body;
}
export function parseBoards(value: string) {
  const ids = [...new Set(value.split(/[\s,]+/).filter(Boolean))];
  if (ids.length > 20 || ids.some((id) => !/^\d{1,24}$/.test(id)))
    throw new Error("Enter up to 20 board IDs, each containing 1–24 digits.");
  return ids;
}
