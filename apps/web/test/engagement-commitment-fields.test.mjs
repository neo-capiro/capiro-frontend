import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  commitmentDueDay,
  commitmentFields,
} from "../src/features/modules/engagement/commitment-fields.ts";

const draft = {
  title: "Updated follow-up",
  description: "Reviewed text",
  due: "2026-10-20",
};
for (const dueDate of ["2026-10-20T08:15:00.000Z", "2026-10-20T23:45:00-07:00"])
  test(`title-only Commitment edit preserves the saved instant ${dueDate}`, () => {
    assert.deepEqual(
      commitmentFields(
        { ...draft, due: commitmentDueDay(dueDate) },
        { dueDate },
      ),
      {
        title: draft.title,
        description: draft.description,
      },
    );
  });

test("Commitment editor and unchanged patch use the viewer's calendar day across time zones", () => {
  const moduleUrl = new URL(
    "../src/features/modules/engagement/commitment-fields.ts",
    import.meta.url,
  ).href;
  for (const [zone, dueDate, expectedDay] of [
    ["Pacific/Kiritimati", "2026-10-19T22:00:00.000Z", "2026-10-20"],
    ["America/Los_Angeles", "2026-10-21T06:45:00.000Z", "2026-10-20"],
    ["UTC", "2026-10-19T22:00:00.000Z", "2026-10-19"],
  ]) {
    const script = `
      import { commitmentDueDay, commitmentFields } from ${JSON.stringify(moduleUrl)};
      const saved = ${JSON.stringify(dueDate)};
      const due = commitmentDueDay(saved);
      console.log(JSON.stringify({
        due,
        displayed: new Date(saved).toLocaleDateString("en-US"),
        patch: commitmentFields({ title: "Edited", description: "Text", due }, { dueDate: saved }),
      }));
    `;
    const result = JSON.parse(
      execFileSync(process.execPath, ["--input-type=module", "-e", script], {
        env: { ...process.env, TZ: zone },
        encoding: "utf8",
      }),
    );
    assert.equal(result.due, expectedDay, zone);
    assert.equal(
      result.displayed,
      new Date(dueDate).toLocaleDateString("en-US", {
        timeZone: zone,
      }),
      zone,
    );
    assert.deepEqual(
      result.patch,
      { title: "Edited", description: "Text" },
      zone,
    );
  }
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
