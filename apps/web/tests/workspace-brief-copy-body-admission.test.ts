import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { briefCopyBodySchema } from "../src/shared/capiro/operations/workspace-brief-copy";
const projected = vi.hoisted(
  () => new Map<string, (content: string) => void>(),
);
vi.mock(
  "../src/features/modules/workspace/rich-document/SectionEditor",
  () => ({
    SectionEditor: ({
      name,
      onChange,
    }: {
      name: string;
      onChange: (content: string) => void;
    }) => {
      projected.set(name, onChange);
      return null;
    },
  }),
);
import { CopyBodyEditor } from "../src/features/modules/workspace/brief-copy/CopyBodyEditor";

it("keeps a rejected section fenced when another section emits a valid edit", () => {
  projected.clear();
  const input = {
    blocks: [
      { id: "a", type: "section" as const, title: "A", content: "A" },
      { id: "b", type: "section" as const, title: "B", content: "B" },
    ],
    retainedRichPayload: "",
  };
  input.retainedRichPayload = "x".repeat(
    3_999_950 - new TextEncoder().encode(JSON.stringify(input)).length,
  );
  const body = briefCopyBodySchema.parse(input);
  const changed = vi.fn();
  const blocked = vi.fn();
  renderToStaticMarkup(
    createElement(CopyBodyEditor, {
      body,
      disabled: false,
      onChange: changed,
      onDraftBlocked: blocked,
    }),
  );
  projected.get("A")!("x".repeat(500));
  expect(changed).not.toHaveBeenCalled();
  expect(blocked).toHaveBeenLastCalledWith(true);
  projected.get("B")!("C");
  expect(changed).toHaveBeenCalledTimes(1);
  expect(blocked).toHaveBeenLastCalledWith(true);
  projected.get("A")!("D");
  expect(blocked).toHaveBeenLastCalledWith(false);
  expect(changed).toHaveBeenCalledTimes(2);
});
