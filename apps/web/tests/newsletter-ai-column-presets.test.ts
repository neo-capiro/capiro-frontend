import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { AIColumnPresets } from "../src/features/modules/workspace/rich-newsletter/providers/AIColumnPresets";
import { newRichDraft } from "../src/features/modules/workspace/rich-newsletter/draft";
import {
  createNewsletterBlock,
  createNewsletterSection,
} from "@capiro/shared/newsletter";

const h = vi.hoisted(() => ({
  states: [] as unknown[],
  refs: [] as { current: unknown }[],
  index: 0,
  refIndex: 0,
  buttons: [] as {
    children: ReactNode;
    disabled?: boolean;
    onClick: () => void;
  }[],
  fields: [] as {
    id: string;
    value: string;
    onChange?: (event: { target: { value: string } }) => void;
  }[],
  run: vi.fn(),
  available: true,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = h.index++;
    if (index === h.states.length)
      h.states.push(typeof initial === "function" ? initial() : initial);
    return [
      h.states[index],
      (next: unknown) => {
        h.states[index] =
          typeof next === "function" ? next(h.states[index]) : next;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = h.refIndex++;
    if (index === h.refs.length) h.refs.push({ current: initial });
    return h.refs[index];
  },
  useEffect: (callback: () => void) => callback(),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroMutation: () => ({ run: h.run, pending: false }),
  useCapiroQuery: () => ({
    data: { ai: { available: h.available } },
    loading: false,
    reload: vi.fn(),
  }),
}));
vi.mock("../src/shared/module-ui", () => ({
  ActionButton: (props: { children: ReactNode; onClick: () => void }) => {
    h.buttons.push(props);
    return createElement("button", null, props.children);
  },
  TextArea: (props: { id: string; value: string }) => {
    h.fields.push(props);
    return null;
  },
  Field: ({ children }: { children: ReactNode }) => children,
  Panel: ({ children }: { children: ReactNode }) => children,
  Modal: ({
    open,
    children,
    footer,
  }: {
    open: boolean;
    children: ReactNode;
    footer: ReactNode;
  }) => (open ? createElement("div", null, children, footer) : null),
}));
const change = vi.fn();
const draft = newRichDraft();
let scope = "draft-1";
const render = () => {
  h.index = 0;
  h.refIndex = 0;
  h.buttons = [];
  h.fields = [];
  return renderToStaticMarkup(
    createElement(AIColumnPresets, {
      documentId: "a1111111-1111-4111-8111-111111111111",
      design: draft.design,
      proposalScope: scope,
      change,
    }),
  );
};
const click = (label: string) =>
  h.buttons.find((button) => button.children === label)!.onClick();
const prepare = () => {
  render();
  click("Article summary");
  render();
  h.fields.find((field) => field.id.endsWith("-source"))!.onChange!({
    target: { value: "Supplied source" },
  });
  render();
  render();
};
beforeEach(() => {
  h.states = [];
  h.refs = [];
  h.index = 0;
  h.refIndex = 0;
  h.available = true;
  h.run.mockReset().mockResolvedValue({ text: "Reviewed update" });
  change.mockReset();
  scope = "draft-1";
});

it("opens preset instructions without generating and inserts only after explicit review", async () => {
  prepare();
  expect(h.fields.find((field) => field.id.endsWith("-prompt"))!.value).toBe(
    "Write a concise article summary for a government affairs client newsletter.",
  );
  expect(h.run).not.toHaveBeenCalled();
  expect(change).not.toHaveBeenCalled();
  click("Generate");
  await Promise.resolve();
  await Promise.resolve();
  render();
  expect(h.run).toHaveBeenCalledWith({
    params: { id: "a1111111-1111-4111-8111-111111111111" },
    body: {
      text: "Supplied source",
      prompt:
        "Write a concise article summary for a government affairs client newsletter.",
      kind: "paragraph",
    },
  });
  expect(change).not.toHaveBeenCalled();
  click("Use text");
  expect(change).toHaveBeenCalledOnce();
  expect(change.mock.lastCall![0]).toMatchObject({
    type: "insertBlock",
    block: {
      kind: "columns",
      columns: [[{ text: "Reviewed update", html: "" }], []],
    },
  });
});

it("invalidates a late provider proposal when the editor draft changes", async () => {
  let resolve!: (result: { text: string }) => void;
  h.run.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  prepare();
  click("Generate");
  scope = "draft-2";
  render();
  render();
  resolve({ text: "Old proposal" });
  await Promise.resolve();
  await Promise.resolve();
  const html = render();
  expect(html).toContain("content changed");
  expect(h.buttons.some((button) => button.children === "Use text")).toBe(
    false,
  );
  expect(change).not.toHaveBeenCalled();
});

it("holds uncertain provider results and unavailable capability without a second request", async () => {
  prepare();
  h.available = false;
  render();
  click("Generate");
  expect(h.run).not.toHaveBeenCalled();
  h.available = true;
  render();
  h.run.mockRejectedValue(new Error("Unknown"));
  click("Generate");
  await Promise.resolve();
  await Promise.resolve();
  render();
  expect(
    h.buttons
      .filter((button) =>
        [
          "Article summary",
          "Upcoming event",
          "Legislative update",
          "People update",
        ].includes(String(button.children)),
      )
      .every((button) => button.disabled),
  ).toBe(true);
  click("Generate");
  expect(h.run).toHaveBeenCalledOnce();
  expect(change).not.toHaveBeenCalled();
});

it("does not offer provider generation when the target cannot fit the proposed columns", () => {
  const full = {
    ...draft.design,
    sections: [
      createNewsletterSection(
        "Body",
        Array.from({ length: 200 }, () => createNewsletterBlock("paragraph")),
      ),
    ],
  };
  const html = renderToStaticMarkup(
    createElement(AIColumnPresets, {
      documentId: "a1111111-1111-4111-8111-111111111111",
      design: full,
      proposalScope: "full",
      change,
    }),
  );
  expect(html).toContain("200 blocks");
  expect(html).not.toContain("Article summary");
  expect(h.run).not.toHaveBeenCalled();
  expect(change).not.toHaveBeenCalled();
});
