/** The question card's real component and its real phase reducer, with no browser and no transport.
 *
 * Rendered through react-dom/server so the state → UI contract is the component's own markup: what is editable, what
 * is locked, and which explanation the user sees. The hook's durable-state derivation and its phase transitions are
 * driven directly, because those are the decisions that used to leave a card permanently dead.
 */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuestionCard } from "../src/features/meri/conversation/QuestionCard";
import {
  questionCardState,
  questionPhase,
  type QuestionPhase,
} from "../src/features/meri/conversation/useRunQuestion";
import type { PendingQuestion } from "@capiro/meri-client/conversation";

const question: PendingQuestion = {
  questionId: "00000009-0000-4000-8000-000000000000",
  expiresAt: "2026-10-29T18:00:00.000Z",
  questions: [
    {
      question: "How should I format the output?",
      header: "Format",
      multiSelect: false,
      options: [
        { label: "Summary", description: "Brief" },
        { label: "Detailed", description: "Full" },
      ],
    },
  ],
};

const render = (state: Parameters<typeof QuestionCard>[0]["state"], error: string | null = null) =>
  renderToStaticMarkup(createElement(QuestionCard, { question, state, error, onSubmit: () => {} }));

const sendButton = (html: string) => {
  const start = html.lastIndexOf("<button", html.indexOf("Send answer"));
  return html.slice(start, html.indexOf("</button>", start));
};

describe("question card states", () => {
  it("stays editable while a selection is still being made", () => {
    const html = render("open");
    expect(html).toContain("Waiting for you");
    expect(html).toContain("type=\"radio\"");
    expect(sendButton(html)).not.toContain('disabled=""');
  });

  it("locks the card while the answer is being delivered", () => {
    const html = render("waiting");
    expect(html).toContain("Sending answer");
    expect(sendButton(html)).toContain('disabled=""');
  });

  it("keeps a correctable local selection failure editable and says nothing was sent", () => {
    const html = render("local", "Choose one answer for every question, or type your own. Nothing was sent.");
    expect(html).toContain("Choose an answer");
    expect(html).toContain("Nothing was sent");
    expect(sendButton(html)).not.toContain('disabled=""');
  });

  it("lets the user correct and resend after the run refuses an answer", () => {
    const html = render("rejected", "The run did not accept that answer.");
    expect(html).toContain("Not accepted");
    expect(html).toContain("The run did not accept that answer.");
    expect(sendButton(html)).not.toContain('disabled=""');
  });

  it("does not resend an answer whose delivery is unknown", () => {
    const html = render("unknown", "The answer may not have arrived.");
    expect(html).toContain("Delivery unconfirmed");
    expect(sendButton(html)).toContain('disabled=""');
  });

  it("never offers an editor for a question that can no longer reach its run", () => {
    const html = render("unavailable", "This run is no longer waiting for an answer, so the question can no longer reach it.");
    expect(html).toContain("No longer answerable");
    // The options stay visible so the user can see what was asked, but the whole fieldset is inert.
    expect(html).toMatch(/<fieldset[^>]*disabled=""/);
    expect(sendButton(html)).toContain('disabled=""');
  });
});

describe("question phase transitions", () => {
  const run = (actions: readonly Parameters<typeof questionPhase>[1][]): QuestionPhase =>
    actions.reduce<QuestionPhase>(questionPhase, "open");

  it("returns to an answerable phase after a correctable or refused attempt", () => {
    expect(run([{ type: "invalid" }])).toBe("local");
    expect(run([{ type: "submitted" }, { type: "refused" }])).toBe("rejected");
    // A rejected answer is not a dead end: the next attempt starts from a fresh submission.
    expect(run([{ type: "submitted" }, { type: "refused" }, { type: "submitted" }])).toBe("waiting");
  });

  it("latches on an unknown delivery instead of retrying it under a new control id", () => {
    expect(run([{ type: "submitted" }, { type: "receipt", state: "UNKNOWN" }])).toBe("unknown");
    // An unrelated local action does move the phase (it is a different attempt on the same card) — that is not a latch
    // proof. The latch is only released by a new question, which is what reset does. The no-blind-resend guarantee itself
    // is proven on the real command path in answer-command.test.ts (a single control per attempt).
    expect(q(questionPhase("unknown", { type: "invalid" }), question)).toBe("local");
    expect(q(questionPhase("unknown", { type: "reset" }), question)).toBe("open");
  });

  it("treats a pending or applied receipt as still waiting for the durable record", () => {
    expect(run([{ type: "submitted" }, { type: "receipt", state: "PENDING" }])).toBe("waiting");
    expect(run([{ type: "submitted" }, { type: "receipt", state: "APPLIED" }])).toBe("waiting");
  });

  it("resets to an answerable phase for a different question", () => {
    expect(run([{ type: "submitted" }, { type: "receipt", state: "UNKNOWN" }, { type: "reset" }])).toBe("open");
  });
});

describe("question card availability", () => {
  it("locks a question whose run settled or whose deadline passed", () => {
    expect(questionCardState("open", { pending: question, terminal: true, expired: false })).toBe("unavailable");
    expect(questionCardState("open", { pending: question, terminal: false, expired: true })).toBe("unavailable");
    expect(questionCardState("open", { pending: null, terminal: false, expired: false })).toBe("unavailable");
  });

  it("keeps the live question's own phase while the run is current", () => {
    expect(questionCardState("rejected", { pending: question, terminal: false, expired: false })).toBe("rejected");
  });
});

/** Small helper so the latch assertion reads as what it is: an unknown or settled question is never answerable. */
function q(phase: QuestionPhase, pending: PendingQuestion): ReturnType<typeof questionCardState> {
  return questionCardState(phase, { pending, terminal: false, expired: false });
}
