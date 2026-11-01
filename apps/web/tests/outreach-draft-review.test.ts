import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { OutreachDraftArtifact } from "../src/shared/capiro/operations/outreach-campaign-schemas";
import { newCampaign } from "../src/features/modules/engagement/outreach/campaign-model";
import { CampaignDrafts } from "../src/features/modules/engagement/outreach/CampaignDrafts";

// A synchronous hook harness tests owner callbacks; this is not live acceptance.
const selected = vi.hoisted(() => ({ key: "" }));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState(initial: unknown) {
    return [
      selected.key || initial,
      (value: string) => {
        selected.key = value;
      },
    ];
  },
}));
vi.mock("../src/shared/capiro/queries", () => ({ useCapiroQuery: () => ({}) }));
type Owner = Parameters<typeof CampaignDrafts>[0]["owner"];
function owner(overrides: Partial<Owner> = {}): Owner {
  return {
    state: {
      ...newCampaign(),
      title: "Synthetic outreach",
      mainIdea: "Request a meeting",
      recipients: [
        {
          id: "a",
          name: "Alex",
          email: "alex@example.test",
          kind: "individual",
          role: "to",
        },
        {
          id: "b",
          name: "Blair",
          email: "blair@example.test",
          kind: "individual",
          role: "to",
        },
      ],
    },
    drafts: [],
    saved: null,
    pending: null,
    job: null,
    receipt: null,
    busy: false,
    readOnly: false,
    navigate: vi.fn(),
    generate: vi.fn(),
    ...overrides,
  } as Owner;
}
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}
beforeEach(() => {
  selected.key = "";
});
describe("recipient review keeps selection separate from generation and delivery", () => {
  it("switches the preview recipient without generating or sending", () => {
    const model = owner();
    const buttons = elements(CampaignDrafts({ owner: model })).filter(
      (row) => row.props["aria-pressed"] !== undefined,
    );
    expect(buttons.map((row) => row.props["aria-pressed"])).toEqual([
      true,
      false,
    ]);
    (buttons[1]?.props.onClick as () => void)();
    const next = CampaignDrafts({ owner: model });
    expect(
      elements(next).find((row) => row.props.title === "Draft for Blair"),
    ).toBeDefined();
    expect(renderToStaticMarkup(next)).toContain("blair@example.test");
    expect(model.generate).not.toHaveBeenCalled();
  });
  it("starts only the existing owner generation action with exact unit keys", () => {
    const model = owner();
    const button = elements(CampaignDrafts({ owner: model })).find(
      (row) => row.props.children === "Generate drafts",
    );
    expect(button?.props.disabled).toBe(false);
    (button?.props.onClick as () => void)();
    expect(model.generate).toHaveBeenCalledExactlyOnceWith(
      ["individual:a", "individual:b"],
      "generate",
    );
  });
  it.each(["busy", "readOnly"] as const)(
    "keeps generation fenced when %s",
    (flag) => {
      const button = elements(
        CampaignDrafts({ owner: owner({ [flag]: true }) }),
      ).find((row) => row.props.children === "Generate drafts");
      expect(button?.props.disabled).toBe(true);
    },
  );
  it("does not count removed recipients' saved drafts as current campaign progress", () => {
    const removed = {
      generationKey: "individual:removed",
      current: { sendable: true },
    } as OutreachDraftArtifact;
    const markup = renderToStaticMarkup(
      CampaignDrafts({ owner: owner({ drafts: [removed] }) }),
    );
    expect(markup).toContain("0 of 2 saved.");
    expect(markup).not.toContain("1 of 2 saved.");
  });
  it.each(["save", "send"] as const)(
    "keeps generation disabled while a %s result is unresolved",
    (pending) => {
      const button = elements(
        CampaignDrafts({ owner: owner({ pending }) }),
      ).find((row) => row.props.children === "Generate drafts");
      expect(button?.props.disabled).toBe(true);
    },
  );
  it("preserves unknown-result reconciliation and never offers a fresh generate action", () => {
    const model = owner({
      pending: "generation",
      job: {
        job: { status: "running" },
        items: [{ id: "a", recipientKey: "individual:a", status: "unknown" }],
      } as Owner["job"],
    });
    const tree = CampaignDrafts({ owner: model });
    expect(renderToStaticMarkup(tree)).toContain(
      "request will not be repeated automatically",
    );
    expect(
      elements(tree).find((row) => row.props.children === "Generate drafts"),
    ).toBeUndefined();
    expect(
      elements(tree).find((row) => row.props.children === "Review drafts"),
    ).toBeUndefined();
    expect(model.generate).not.toHaveBeenCalled();
  });
});
