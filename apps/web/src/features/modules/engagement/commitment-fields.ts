/** A date-only editor must not rewrite an unchanged saved timestamp. */
type Draft = { title: string; description: string; due: string };
type Fields = Pick<Draft, "title" | "description">;

/** The date input shows the same local calendar day as the Commitment list. */
export function commitmentDueDay(value: string | null | undefined) {
  if (!value) return "";
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return "";
  const year = String(instant.getFullYear()).padStart(4, "0");
  const month = String(instant.getMonth() + 1).padStart(2, "0");
  const day = String(instant.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function commitmentFields(draft: Draft): Fields & { dueDate?: string };
export function commitmentFields(
  draft: Draft,
  original: { dueDate: string | null },
): Fields & { dueDate?: string | null };
export function commitmentFields(
  draft: Draft,
  original?: { dueDate: string | null },
) {
  const fields = { title: draft.title, description: draft.description };
  if (original && draft.due === commitmentDueDay(original.dueDate))
    return fields;
  if (!draft.due) return original ? { ...fields, dueDate: null } : fields;
  return {
    ...fields,
    dueDate: new Date(`${draft.due}T12:00:00`).toISOString(),
  };
}
