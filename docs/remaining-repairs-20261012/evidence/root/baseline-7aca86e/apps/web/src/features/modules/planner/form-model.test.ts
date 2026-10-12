import { expect, it } from "vitest";
import {
  changeQuestionType,
  visibleFormQuestions,
  type FormQuestion,
} from "./form-model";
it("question type edits preserve compatible task names and clear incompatible settings", () => {
  const name: FormQuestion = {
    id: "name",
    label: "Name",
    type: "text",
    required: true,
    options: [],
    taskField: "name",
    maxLength: 200,
  };
  expect(changeQuestionType(name, "email").taskField).toBe("name");
  const file = changeQuestionType(name, "attachment");
  expect(file.taskField).toBe("attachments");
  expect(file).not.toHaveProperty("maxLength");
  const date = changeQuestionType({ ...file, multiple: true }, "date");
  expect(date.taskField).toBeNull();
  expect(date).not.toHaveProperty("multiple");
});
it("hidden parent branches suppress retained descendant answers", () => {
  const question: FormQuestion = {
    id: "root",
    label: "Root",
    type: "select",
    required: true,
    options: ["yes", "no"],
  };
  const fields = [
    question,
    {
      ...question,
      id: "child",
      showWhen: { questionId: "root", values: ["yes"] },
    },
    {
      ...question,
      id: "grandchild",
      showWhen: { questionId: "child", values: ["yes"] },
    },
  ];
  expect(
    visibleFormQuestions(fields, { root: "yes", child: "yes" }).map(
      (field) => field.id,
    ),
  ).toEqual(["root", "child", "grandchild"]);
  expect(
    visibleFormQuestions(fields, { root: "no", child: "yes" }).map(
      (field) => field.id,
    ),
  ).toEqual(["root"]);
});
