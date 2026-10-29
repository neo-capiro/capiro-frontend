const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function questionData(value) {
    if (!record(value))
        return null;
    const { questionId, expiresAt, questions } = value;
    if (typeof questionId !== "string" || typeof expiresAt !== "string" || !Array.isArray(questions))
        return null;
    const normalized = [];
    for (const raw of questions) {
        if (!record(raw) || typeof raw.question !== "string" || typeof raw.header !== "string" || typeof raw.multiSelect !== "boolean")
            return null;
        if (!Array.isArray(raw.options))
            return null;
        const options = [];
        for (const option of raw.options) {
            if (!record(option) || typeof option.label !== "string" || typeof option.description !== "string")
                return null;
            options.push({ label: option.label, description: option.description });
        }
        normalized.push({ question: raw.question, header: raw.header, options, multiSelect: raw.multiSelect });
    }
    return { questionId, expiresAt, questions: normalized };
}
/** The outcome recorded for one question id, from its own durable resolution event. */
export function questionOutcome(events, questionId) {
    let outcome = null;
    for (const event of events) {
        if (event.type !== "question.answered" || !record(event.data))
            continue;
        if (event.data.questionId !== questionId)
            continue;
        const value = event.data.outcome;
        outcome = value === "answered" || value === "cancelled" ? value : outcome;
    }
    return outcome;
}
/** The question this conversation is waiting on, or null when nothing is open.
 * The most recent `question.pending` without a resolution event wins; an answered or cancelled question stays closed. */
export function pendingQuestion(events) {
    const open = new Map();
    for (const event of events) {
        if (event.type === "question.pending") {
            const value = questionData(event.data);
            if (value)
                open.set(value.questionId, value);
            continue;
        }
        if (event.type === "question.answered" && record(event.data) && typeof event.data.questionId === "string")
            open.delete(event.data.questionId);
    }
    let latest = null;
    for (const value of open.values())
        latest = value;
    return latest;
}
/** Build the submitted answers record for one question set.
 * Every question must be answered; a label that was not offered is kept only when the user typed it as free text,
 * so an answer always names the question it belongs to. */
export function questionAnswers(pending, selection, freeText = {}) {
    const answers = {};
    for (const question of pending.questions) {
        const typed = freeText[question.question]?.trim();
        if (typed) {
            answers[question.question] = typed;
            continue;
        }
        const value = selection[question.question];
        if (value === undefined)
            throw new Error("QUESTION_UNANSWERED");
        if (Array.isArray(value)) {
            if (!question.multiSelect)
                throw new Error("QUESTION_SELECTION_INVALID");
            const labels = question.options.map((option) => option.label);
            const unique = [...new Set(value)];
            if (!unique.length || unique.some((label) => !labels.includes(label)))
                throw new Error("QUESTION_SELECTION_INVALID");
            answers[question.question] = labelsTuple(unique);
            continue;
        }
        if (typeof value !== "string" || !value.trim())
            throw new Error("QUESTION_SELECTION_INVALID");
        if (question.multiSelect) {
            answers[question.question] = [value];
            continue;
        }
        answers[question.question] = value;
    }
    return answers;
}
const labelsTuple = (labels) => {
    if (labels.length === 1)
        return [labels[0]];
    if (labels.length === 2)
        return [labels[0], labels[1]];
    if (labels.length === 3)
        return [labels[0], labels[1], labels[2]];
    if (labels.length === 4)
        return [labels[0], labels[1], labels[2], labels[3]];
    throw new Error("QUESTION_SELECTION_INVALID");
};
/** The one lifecycle control a browser submits for an answer. The id makes the submission idempotent per attempt. */
export function answerControl(questionId, answers, controlId) {
    return { controlId, intent: "answer", questionId, answers: { ...answers } };
}
