import { describe, expect, it, vi } from "vitest";
import {
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OutreachWorkflowFrame } from "../src/features/modules/engagement/outreach/OutreachWorkflowFrame";
import {
  CampaignDirection,
  CampaignSetup,
} from "../src/features/modules/engagement/outreach/CampaignSetup";
import { newCampaign } from "../src/features/modules/engagement/outreach/campaign-model";
import { CampaignTemplates } from "../src/features/modules/engagement/outreach/CampaignTemplates";
const boundary = vi.hoisted(() => ({ api: { request: vi.fn() } }));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => boundary.api,
}));

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}
function frame(
  overrides: Partial<Parameters<typeof OutreachWorkflowFrame>[0]> = {},
) {
  return OutreachWorkflowFrame({
    title: "Synthetic campaign",
    step: 2,
    busy: false,
    saved: false,
    fenced: false,
    readOnly: false,
    onExit: vi.fn(),
    onStep: vi.fn(),
    onSave: vi.fn(),
    children: createElement("p", null, "Synthetic step content"),
    ...overrides,
  });
}
function rail(tree: ReactNode) {
  const nav = elements(tree).find((element) => element.type === "nav");
  if (!nav) throw new Error("Missing ordered step navigation");
  return elements(nav).filter(
    (element) =>
      element.props["aria-current"] !== undefined ||
      (typeof element.props.onClick === "function" &&
        element.props.children !== undefined),
  );
}

describe("existing workflow with an ordered rail and progress footer", () => {
  it("keeps exit in the heading and back, save, progress and continuation in the workbench footer", () => {
    const onExit = vi.fn(),
      onSave = vi.fn(),
      onStep = vi.fn();
    const footer = elements(frame({ onExit, onSave, onStep })).find(
      (element) => element.type === "footer",
    );
    const controls = elements(footer).filter(
      (element) => typeof element.props.onClick === "function",
    );
    expect(controls.map((element) => element.props.children)).toEqual([
      "Back",
      "Save draft",
      "Continue",
    ]);
    for (const control of controls) (control.props.onClick as () => void)();
    const tree = frame({ onExit });
    const header = elements(tree).find((element) => element.props.actions);
    const exit = elements(header?.props.actions as ReactNode).find(
      (element) => element.props.onClick === onExit,
    );
    expect(exit?.props.disabled).toBe(false);
    (exit?.props.onClick as () => void)();
    expect(onExit).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
    expect(onStep.mock.calls).toEqual([[1], [3]]);
  });
  it("lets the send owner place its review action in the same footer, without a second continuation", () => {
    const review = createElement("button", { disabled: true }, "Review send");
    const markup = renderToStaticMarkup(
      frame({
        step: 7,
        renderFinalStep: (footer) =>
          createElement("div", null, "Saved message review", footer(review)),
      }),
    );
    expect(markup.match(/<footer/g)).toHaveLength(1);
    expect(markup).toContain("Review send");
    expect(markup).not.toContain(">Continue<");
    expect(markup.indexOf("Saved message review")).toBeLessThan(
      markup.indexOf("<footer"),
    );
  });
  it("renders all seven steps and only one current step in an accessible named navigation", () => {
    const markup = renderToStaticMarkup(frame());
    expect(markup).toContain('aria-label="Outreach steps"');
    expect(markup).toContain("<ol>");
    expect(markup.match(/aria-current="step"/g)).toHaveLength(1);
    for (const label of [
      "Direction",
      "Campaign setup",
      "Recipients",
      "Context plan",
      "Context builder",
      "Generate &amp; review",
      "Send",
    ])
      expect(markup).toContain(label);
    expect(markup).toContain('aria-label="Campaign progress"');
    expect(markup).toContain('value="2" max="7"');
  });
  it("keeps sequential admission and invokes the owner's step callback", () => {
    const onStep = vi.fn();
    const steps = rail(frame({ onStep }));
    expect(steps).toHaveLength(7);
    expect(steps.map((step) => Boolean(step.props.disabled))).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
      true,
    ]);
    const next = steps[2]?.props.onClick;
    if (typeof next !== "function")
      throw new Error("Missing recipient step callback");
    next();
    expect(onStep).toHaveBeenCalledWith(3);
  });
  it.each(["busy", "fenced"] as const)(
    "keeps every step disabled while %s",
    (flag) => {
      expect(
        rail(frame({ [flag]: true })).every((step) => step.props.disabled),
      ).toBe(true);
    },
  );
  it.each([
    {},
    { busy: true },
    { fenced: true },
    { readOnly: true },
    { nextDisabled: "Name your campaign." },
    { step: 6 as const },
  ])(
    "keeps mobile navigation aligned with desktop admission: %j",
    (overrides) => {
      const onStep = vi.fn();
      const tree = frame({ ...overrides, onStep });
      const mobile = elements(tree).find(
        (element) => element.props["aria-label"] === "Outreach step",
      );
      expect(mobile).toBeDefined();
      const options = mobile!.props.options as {
        value: string;
        disabled: boolean;
      }[];
      expect(
        options.map((option) =>
          Boolean(mobile!.props.disabled || option.disabled),
        ),
      ).toEqual(rail(tree).map((item) => Boolean(item.props.disabled)));
      (mobile!.props.onValueChange as (value: string) => void)("3");
      expect(onStep).toHaveBeenCalledExactlyOnceWith(3);
    },
  );
  it("does not admit forward navigation when the owner reports missing required input", () => {
    const steps = rail(frame({ nextDisabled: "Name your campaign." }));
    expect(steps.map((step) => Boolean(step.props.disabled))).toEqual([
      false,
      false,
      true,
      true,
      true,
      true,
      true,
    ]);
    const markup = renderToStaticMarkup(
      frame({ nextDisabled: "Name your campaign." }),
    );
    expect(markup).toContain("Name your campaign.");
  });
  it("preserves read-only history navigation without offering a save", () => {
    expect(
      rail(frame({ readOnly: true })).every((step) => !step.props.disabled),
    ).toBe(true);
    const save = elements(frame({ readOnly: true })).find(
      (element) => element.props.children === "Save draft",
    );
    expect(save?.props.disabled).toBe(true);
  });
  it("continues showing an unsupported API error without presenting a success", () => {
    const markup = renderToStaticMarkup(
      frame({ error: "Campaign unavailable." }),
    );
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Campaign unavailable.");
    expect(markup).not.toContain("Your draft is saved");
  });
});

describe("Direction and template gallery preserve existing input contracts", () => {
  it("continues from Direction through the existing footer callback without changing inputs", () => {
    const onStep = vi.fn();
    const tree = frame({ step: 1, onStep });
    const next = elements(tree).find(
      (element) => element.props.children === "Continue",
    );
    expect(next?.props.disabled).toBe(false);
    (next?.props.onClick as () => void)();
    expect(onStep).toHaveBeenCalledExactlyOnceWith(2);
  });
  it("explains three recipient modes without promising automatic sending", () => {
    const markup = renderToStaticMarkup(
      createElement(CampaignDirection, {
        state: newCampaign(),
        update: vi.fn(),
        disabled: false,
        clients: [],
      }),
    );
    expect(markup).toContain('aria-label="Recipient options"');
    for (const label of [
      "Individual",
      "List",
      "Group",
      "Review each draft before sending",
      "Client context",
      "To clients",
    ])
      expect(markup).toContain(label);
  });
  it("keeps fixed client context disabled", () => {
    const tree = CampaignDirection({
      state: newCampaign("synthetic-client"),
      update: vi.fn(),
      disabled: false,
      fixedClient: true,
      clients: [],
    });
    const client = elements(tree).find(
      (element) => element.props.id === "outreach-client",
    );
    expect(client?.props.disabled).toBe(true);
    expect(client?.props.value).toBe("synthetic-client");
  });
  it("offers scratch and the wired custom editor when no templates are returned", () => {
    const markup = renderToStaticMarkup(
      createElement(CampaignSetup, {
        state: newCampaign(),
        update: vi.fn(),
        disabled: false,
        templates: [],
      }),
    );
    expect(markup).toContain("Start from scratch");
    expect(markup).toContain("Create custom template");
    expect(markup.match(/type="radio"/g)).toHaveLength(1);
  });
  it("passes selection to the existing owner and clears obsolete version hints for the versionless Classic catalog", () => {
    const update = vi.fn();
    const tree = CampaignSetup({
      state: {
        ...newCampaign(),
        templateId: "template-a",
        templateVersionId: "version-a",
      },
      update,
      disabled: false,
      templates: [
        {
          id: "template-a",
          name: "Synthetic template",
          description: "Synthetic description",
          source: "user",
          category: "general",
          prompt: "Synthetic prompt",
          samplePreview: null,
          tone: "professional",
          usageCount: 0,
        },
      ],
    });
    const gallery = elements(tree).find(
      (element) => element.type === CampaignTemplates,
    );
    expect(gallery?.props.selectedId).toBe("template-a");
    const action = gallery?.props.onSelect;
    if (typeof action !== "function")
      throw new Error("Missing template selection");
    action("template-a");
    action(null);
    expect(update.mock.calls).toEqual([
      [{ templateId: "template-a", templateVersionId: null }],
      [{ templateId: null, templateVersionId: null }],
    ]);
  });
  it("disables the gallery with the existing pending/read-only fence", () => {
    const tree = CampaignSetup({
      state: newCampaign(),
      update: vi.fn(),
      disabled: true,
      templates: [],
    });
    expect(
      elements(tree).find((element) => element.type === CampaignTemplates)
        ?.props.disabled,
    ).toBe(true);
    expect(
      elements(tree).find((element) => element.props.id === "outreach-name")
        ?.props.disabled,
    ).toBe(true);
  });
});
