import { expect, it } from "vitest";
import {
  createNewsletterSurveyQuestion,
  defaultNewsletterSurveyDefinition,
  type NewsletterSavedSurvey,
} from "@capiro/shared/newsletter";
import {
  appendSurveyQuestion,
  changeQuestionType,
  editSurvey,
  newSurveyForm,
  savedSurveyForm,
} from "./survey-draft";

it("preserves captured saved identity, inert fields and newline-containing choices through local edits", () => {
  const question = createNewsletterSurveyQuestion("radio");
  question.options = ["One\nchoice", "Another"];
  Object.assign(question, { future: { inert: true } });
  const saved: NewsletterSavedSurvey = {
    id: "a1111111-1111-4111-8111-111111111111",
    revision: 4,
    name: "Saved",
    status: "draft",
    updatedAt: "2026-10-26T00:00:00.000Z",
    sourceClientIds: [],
    definition: {
      ...defaultNewsletterSurveyDefinition(),
      questions: [question],
    },
  };
  const next = editSurvey(savedSurveyForm(saved), (value) => {
    value.name = "Edited";
    value.definition.title = "New title";
  });
  expect(next.saved).toEqual(saved);
  expect(saved.name).toBe("Saved");
  expect(next.definition.questions[0]!.options).toEqual([
    "One\nchoice",
    "Another",
  ]);
  expect(next.definition.questions[0]).toHaveProperty("future.inert", true);
});
it("uses canonical new question IDs and preserves legacy introduction until explicit type choice", () => {
  const first = appendSurveyQuestion(newSurveyForm(), "introduction"),
    next = appendSurveyQuestion(first, "text");
  expect(first.definition.questions).toHaveLength(1);
  expect(next.definition.questions[0]!.id).not.toBe(
    next.definition.questions[1]!.id,
  );
  expect(next.definition.questions[0]!.introductionType).toBeNull();
  const legacy = {
    ...next.definition.questions[0]!,
    introductionType: undefined,
  };
  expect(
    changeQuestionType(legacy, "introduction").introductionType,
  ).toBeUndefined();
  expect(changeQuestionType(legacy, "text")).not.toHaveProperty(
    "introductionType",
  );
  expect(
    changeQuestionType(next.definition.questions[1]!, "introduction")
      .introductionType,
  ).toBeNull();
});
