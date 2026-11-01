import { describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CampaignGenerationBrief } from "../src/features/modules/engagement/outreach/CampaignGenerationBrief";
import { newCampaign } from "../src/features/modules/engagement/outreach/campaign-model";
import type { OutreachCampaignState } from "../src/shared/capiro/operations/outreach-campaign-schemas";

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}
const valid = {
  ...newCampaign(),
  title: "Synthetic outreach",
  mainIdea: "Ask for a meeting on the synthetic proposal.",
  recipients: [
    {
      id: "a",
      name: "Alex",
      email: "alex@example.test",
      kind: "individual" as const,
      role: "to" as const,
    },
  ],
};
function brief(state: OutreachCampaignState = valid, disabled = false) {
  const onStep = vi.fn();
  const tree = CampaignGenerationBrief({ state, disabled, onStep });
  return { tree, onStep, markup: renderToStaticMarkup(tree) };
}
describe("generation brief explains missing input and preserves carried context", () => {
  it.each<[OutreachCampaignState, string, number]>([
    [{ ...valid, title: "" }, "Name your campaign.", 2],
    [{ ...valid, recipients: [] }, "Add at least one To recipient.", 3],
    [{ ...valid, mainIdea: "" }, "Add the main idea for this campaign.", 4],
  ])("routes missing details to their owning step", (state, message, step) => {
    const { tree, markup, onStep } = brief(state);
    expect(markup).toContain(message);
    const button = elements(tree).find(
      (row) => row.props.children === "Complete required details",
    );
    expect(button?.props.disabled).toBe(false);
    (button?.props.onClick as () => void)();
    expect(onStep).toHaveBeenCalledWith(step);
  });
  it("displays the retained decision plan and source counts without claiming resolution", () => {
    const { markup } = brief({
      ...valid,
      decisions: {
        goal: "Retained goal",
        objective: "Retained objective",
        topic: "Topic",
        whyNow: "Timing",
        campaignAngle: "Angle",
      },
      contextItems: [
        {
          id: "note-a",
          kind: "note",
          scope: "campaign",
          customNoteText: "A fact",
        },
      ],
      contextSelections: [{ targetKey: "a", locator: { id: "synthetic" } }],
    });
    for (const text of [
      "Retained goal",
      "Retained objective",
      "Timing",
      "Angle",
      "1 selected sources or notes",
      "1 carried sources",
      "checked again before generation",
    ])
      expect(markup).toContain(text);
    expect(markup).not.toContain("Complete required details");
  });
  it("accepts a carried goal when the legacy main idea is empty", () => {
    const { markup } = brief({
      ...valid,
      mainIdea: "",
      decisions: {
        goal: "Carried goal",
        objective: "",
        topic: "",
        whyNow: "",
        campaignAngle: "",
      },
    });
    expect(markup).toContain("Carried goal");
    expect(markup).not.toContain("Complete required details");
  });
  it("fences all brief navigation while the owner is busy, pending or read-only", () => {
    const { tree } = brief({ ...valid, title: "" }, true);
    const buttons = elements(tree).filter(
      (row) => typeof row.props.onClick === "function",
    );
    expect(buttons).toHaveLength(3);
    expect(buttons.every((row) => row.props.disabled)).toBe(true);
  });
});
