/**
 * Clarifying questions in the conversation surface: what is still pending, how a selection becomes an answer, and the
 * exact control the browser submits.
 *
 * The pending question is read from the run's own durable events (`question.pending` / `question.answered`), so a
 * refresh or reconnect re-derives the same card from the same history — no client-side question store. Nothing here
 * grants authority: the answer is one lifecycle control, Core keeps the current tenant/actor/access checks, and the
 * worker refuses a stale, duplicate or cross-tenant answer.
 *
 * The submitted `answers` record is keyed by the asked question text. Multi-select selections stay arrays here and are
 * comma-joined only at the native SDK boundary inside the worker.
 */
export interface ConversationQuestionOption {
  readonly label: string;
  readonly description: string;
}
export interface ConversationQuestion {
  readonly question: string;
  readonly header: string;
  readonly options: readonly ConversationQuestionOption[];
  readonly multiSelect: boolean;
}
export interface PendingQuestion {
  readonly questionId: string;
  readonly expiresAt: string;
  readonly questions: readonly ConversationQuestion[];
}
export type QuestionOutcome = "answered" | "cancelled" | null;
export type QuestionSelection = Readonly<Record<string, string | readonly string[]>>;

type Event = { readonly type: string; readonly data?: unknown; readonly sequence?: number };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function questionData(value: unknown): PendingQuestion | null {
  if (!record(value)) return null;
  const { questionId, expiresAt, questions } = value;
  if (typeof questionId !== "string" || typeof expiresAt !== "string" || !Array.isArray(questions)) return null;
  const normalized: ConversationQuestion[] = [];
  for (const raw of questions) {
    if (!record(raw) || typeof raw.question !== "string" || typeof raw.header !== "string" || typeof raw.multiSelect !== "boolean") return null;
    if (!Array.isArray(raw.options)) return null;
    const options: ConversationQuestionOption[] = [];
    for (const option of raw.options) {
      if (!record(option) || typeof option.label !== "string" || typeof option.description !== "string") return null;
      options.push({ label: option.label, description: option.description });
    }
    normalized.push({ question: raw.question, header: raw.header, options, multiSelect: raw.multiSelect });
  }
  return { questionId, expiresAt, questions: normalized };
}

/** The outcome recorded for one question id, from its own durable resolution event. */
export function questionOutcome(events: readonly Event[], questionId: string): QuestionOutcome {
  let outcome: QuestionOutcome = null;
  for (const event of events) {
    if (event.type !== "question.answered" || !record(event.data)) continue;
    if (event.data.questionId !== questionId) continue;
    const value = event.data.outcome;
    outcome = value === "answered" || value === "cancelled" ? value : outcome;
  }
  return outcome;
}

/** The question this conversation is waiting on, or null when nothing is open.
 * The most recent `question.pending` without a resolution event wins; an answered or cancelled question stays closed. */
export function pendingQuestion(events: readonly Event[]): PendingQuestion | null {
  const open = new Map<string, PendingQuestion>();
  for (const event of events) {
    if (event.type === "question.pending") {
      const value = questionData(event.data);
      if (value) open.set(value.questionId, value);
      continue;
    }
    if (event.type === "question.answered" && record(event.data) && typeof event.data.questionId === "string")
      open.delete(event.data.questionId);
  }
  let latest: PendingQuestion | null = null;
  for (const value of open.values()) latest = value;
  return latest;
}

/** Build the submitted answers record for one question set.
 * Every question must be answered; a label that was not offered is kept only when the user typed it as free text,
 * so an answer always names the question it belongs to. */
export function questionAnswers(
  pending: PendingQuestion,
  selection: QuestionSelection,
  freeText: Readonly<Record<string, string>> = {},
): Record<string, string | string[]> {
  const answers: Record<string, string | string[]> = {};
  for (const question of pending.questions) {
    const typed = freeText[question.question]?.trim();
    if (typed) {
      answers[question.question] = typed;
      continue;
    }
    const value = selection[question.question];
    if (value === undefined) throw new Error("QUESTION_UNANSWERED");
    if (Array.isArray(value)) {
      if (!question.multiSelect) throw new Error("QUESTION_SELECTION_INVALID");
      const labels = question.options.map((option) => option.label);
      const unique = [...new Set(value)];
      if (!unique.length || unique.some((label) => !labels.includes(label))) throw new Error("QUESTION_SELECTION_INVALID");
      answers[question.question] = unique;
      continue;
    }
    if (typeof value !== "string" || !value.trim()) throw new Error("QUESTION_SELECTION_INVALID");
    if (question.multiSelect) {
      answers[question.question] = [value];
      continue;
    }
    answers[question.question] = value;
  }
  return answers;
}

/** The one lifecycle control a browser submits for an answer. The id makes the submission idempotent per attempt. */
export function answerControl(
  questionId: string,
  answers: Readonly<Record<string, string | string[]>>,
  controlId: string,
): { controlId: string; intent: "answer"; questionId: string; answers: Record<string, string | string[]> } {
  return { controlId, intent: "answer", questionId, answers: { ...answers } };
}
