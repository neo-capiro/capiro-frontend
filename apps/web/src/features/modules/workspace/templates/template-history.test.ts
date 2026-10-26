import { describe, expect, it } from "vitest";
import { blankTemplate } from "./template-model";
import { compareTemplates, templateSnapshot } from "./template-history";

describe("saved campaign template comparison", () => {
  it("compares exact known defaults, including nested variables and retained policy, without mutating either version", () => {
    const before = blankTemplate();
    const after = structuredClone(before);
    after.strategy.tone = "Direct";
    after.goal.ask = { mode: "explicit", text: "Request a briefing" };
    after.guardrails.followUpRequired = true;
    after.variables = [
      {
        key: "topic",
        label: "Topic",
        question: null,
        type: "text",
        choices: null,
        required: true,
        defaultValue: null,
        resolutionPolicy: "user_must_confirm",
        scope: "public",
        appliesTo: ["topic"],
      },
    ];
    const original = JSON.stringify({ before, after });
    expect(compareTemplates(before, after).map((row) => row.key)).toEqual([
      "ask",
      "tone",
      "variables",
      "guardrail.followUpRequired",
    ]);
    expect(
      compareTemplates(before, after).find((row) => row.key === "tone"),
    ).toMatchObject({ before: "Not set", value: "Direct" });
    expect(JSON.stringify({ before, after })).toBe(original);
  });
  it("does not confuse an unset value with actual text that reads Not set or an empty value", () => {
    const before = blankTemplate();
    const after = structuredClone(before);
    after.goal.topic = "Not set";
    after.goal.ask.text = "Not set";
    after.strategy.tone = "";
    expect(compareTemplates(before, after).map((row) => row.key)).toEqual([
      "topic",
      "ask",
      "tone",
    ]);
    expect(
      templateSnapshot(after).find((row) => row.key === "tone")?.value,
    ).toBe("Empty text");
    expect(compareTemplates(after, structuredClone(after))).toEqual([]);
  });
});
