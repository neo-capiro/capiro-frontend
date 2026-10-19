export type FormQuestion = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  taskField?: string | null;
  multiple?: boolean;
  maxLength?: number;
  showWhen?: { questionId: string; values: string[] };
};
export function formQuestions(value: unknown): FormQuestion[] {
  return Array.isArray(value)
    ? value.filter(
        (field): field is FormQuestion =>
          !!field &&
          typeof field === "object" &&
          typeof field.id === "string" &&
          typeof field.label === "string" &&
          typeof field.type === "string",
      )
    : [];
}
/** Keep compatible task mappings; remove settings that the new question type cannot use. */
export function changeQuestionType(
  field: FormQuestion,
  type: string,
): FormQuestion {
  const compatible: Record<string, readonly string[]> = {
    name: ["text", "email"],
    description: ["text", "paragraph", "email"],
    startOn: ["date"],
    dueOn: ["date"],
    estimateMinutes: ["number"],
    priority: ["select"],
  };
  const next = {
    ...field,
    type,
    options: ["select", "multi_select"].includes(type) ? field.options : [],
    taskField:
      type === "attachment"
        ? "attachments"
        : compatible[field.taskField ?? ""]?.includes(type)
          ? field.taskField
          : null,
  };
  if (type !== "attachment") delete next.multiple;
  if (!["text", "paragraph", "email"].includes(type)) delete next.maxLength;
  if (next.taskField !== "custom" && "customFieldId" in next)
    delete next.customFieldId;
  return next;
}
export function visibleFormQuestions(
  fields: readonly FormQuestion[],
  answers: Record<string, string | number | string[]>,
) {
  const visible = new Set<string>();
  return fields.filter((field) => {
    const condition = field.showWhen;
    if (
      condition &&
      (!visible.has(condition.questionId) ||
        !condition.values.some((value) =>
          Array.isArray(answers[condition.questionId])
            ? (answers[condition.questionId] as string[]).includes(value)
            : answers[condition.questionId] === value,
        ))
    )
      return false;
    visible.add(field.id);
    return true;
  });
}
