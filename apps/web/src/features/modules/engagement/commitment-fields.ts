/** A date-only editor must not rewrite an unchanged saved timestamp. */
type Draft = { title: string; description: string; due: string };
type Fields = Pick<Draft, "title" | "description">;
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
  if (original && draft.due === (original.dueDate?.slice(0, 10) ?? ""))
    return fields;
  if (!draft.due) return original ? { ...fields, dueDate: null } : fields;
  return {
    ...fields,
    dueDate: new Date(`${draft.due}T12:00:00`).toISOString(),
  };
}
