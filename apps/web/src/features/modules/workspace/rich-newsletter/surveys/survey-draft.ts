import {
  createNewsletterSurveyQuestion,
  defaultNewsletterSurveyDefinition,
  type NewsletterSavedSurvey,
  type NewsletterSurveyDefinition,
  type NewsletterSurveyQuestion,
  type NewsletterSurveySectionType,
} from "@capiro/shared/newsletter";

export type SurveyForm = {
  name: string;
  definition: NewsletterSurveyDefinition;
  saved?: NewsletterSavedSurvey;
};
export const newSurveyForm = (): SurveyForm => ({
  name: "",
  definition: defaultNewsletterSurveyDefinition(),
});
export const savedSurveyForm = (saved: NewsletterSavedSurvey): SurveyForm => ({
  name: saved.name,
  definition: structuredClone(saved.definition),
  saved,
});
export function editSurvey(
  form: SurveyForm,
  change: (next: SurveyForm) => void,
) {
  const next = structuredClone(form);
  change(next);
  return next;
}
/** Type changes preserve all other fields, including inert unknown JSON. */
export function changeQuestionType(
  question: NewsletterSurveyQuestion,
  type: NewsletterSurveySectionType,
) {
  const next = structuredClone(question);
  next.type = type;
  if (type === "introduction") {
    if (question.type !== "introduction") next.introductionType = null;
  } else delete next.introductionType;
  return next;
}
export function appendSurveyQuestion(
  form: SurveyForm,
  type: NewsletterSurveySectionType,
) {
  return editSurvey(form, (next) => {
    if (next.definition.questions.length < 30)
      next.definition.questions.push(createNewsletterSurveyQuestion(type));
  });
}
