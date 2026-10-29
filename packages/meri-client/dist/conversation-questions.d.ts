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
import type { ConversationLifecycleControlRequest } from "@capiro/meri-contracts/conversation-lifecycle";
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
/** One submitted answer: the chosen label, typed text, or the offered labels of a multi-select question. The tuple
 * forms are the wire contract's own bounds (one to four options), so no cast is needed at the client boundary. */
export type QuestionAnswerValue = string | [string] | [string, string] | [string, string, string] | [string, string, string, string];
type Event = {
    readonly type: string;
    readonly data?: unknown;
    readonly sequence?: number;
};
/** The outcome recorded for one question id, from its own durable resolution event. */
export declare function questionOutcome(events: readonly Event[], questionId: string): QuestionOutcome;
/** The question this conversation is waiting on, or null when nothing is open.
 * The most recent `question.pending` without a resolution event wins; an answered or cancelled question stays closed. */
export declare function pendingQuestion(events: readonly Event[]): PendingQuestion | null;
/** Build the submitted answers record for one question set.
 * Every question must be answered; a label that was not offered is kept only when the user typed it as free text,
 * so an answer always names the question it belongs to. */
export declare function questionAnswers(pending: PendingQuestion, selection: QuestionSelection, freeText?: Readonly<Record<string, string>>): Record<string, QuestionAnswerValue>;
/** The one lifecycle control a browser submits for an answer. The id makes the submission idempotent per attempt. */
export declare function answerControl(questionId: string, answers: Readonly<Record<string, QuestionAnswerValue>>, controlId: string): Extract<ConversationLifecycleControlRequest, {
    intent: "answer";
}>;
export {};
