import assert from "node:assert/strict";
import test from "node:test";
import { commitmentFields } from "../src/features/modules/engagement/commitment-fields.ts";

const draft = {
  title: "Updated follow-up",
  description: "Reviewed text",
  due: "2026-10-20",
};
for (const dueDate of ["2026-10-20T08:15:00.000Z", "2026-10-20T23:45:00-07:00"])
  test(`title-only Commitment edit preserves the saved instant ${dueDate}`, () => {
    assert.deepEqual(commitmentFields(draft, { dueDate }), {
      title: draft.title,
      description: draft.description,
    });
  });
test("clearing an existing Commitment date sends null; an unchanged unset date sends no patch", () => {
  assert.deepEqual(
    commitmentFields(
      { ...draft, due: "" },
      { dueDate: "2026-10-20T08:15:00Z" },
    ),
    { title: draft.title, description: draft.description, dueDate: null },
  );
  assert.equal(
    Object.hasOwn(
      commitmentFields({ ...draft, due: "" }, { dueDate: null }),
      "dueDate",
    ),
    false,
  );
});
test("a deliberately changed Commitment date retains the existing local-noon policy", () => {
  assert.deepEqual(
    commitmentFields(draft, { dueDate: "2026-10-19T08:15:00Z" }),
    {
      title: draft.title,
      description: draft.description,
      dueDate: new Date("2026-10-20T12:00:00").toISOString(),
    },
  );
});
test("creating a Commitment without a due date omits the optional field", () => {
  assert.deepEqual(commitmentFields({ ...draft, due: "" }), {
    title: draft.title,
    description: draft.description,
  });
});
