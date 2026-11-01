import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createNewsletterBlock } from "@capiro/shared/newsletter";
import { RichBlockControls } from "../../src/features/modules/workspace/rich-newsletter/RichBlockControls";
import { newRichDraft } from "../../src/features/modules/workspace/rich-newsletter/draft";
import type { useProviderProposal } from "../../src/features/modules/workspace/rich-newsletter/providers/use-provider-proposal";

const h = vi.hoisted(() => ({
  api: {},
  proposal: undefined as
    | ReturnType<typeof useProviderProposal<string>>
    | undefined,
}));
vi.mock("../../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => h.api,
}));
// Keep the real inspector, BlockProviderTools scope/key and proposal hook. Only
// substitute inert leaf UI/transport so no provider, credentials or browser is used.
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/providers/WritingTool",
  async () => {
    const { useProviderProposal } =
      await import("../../src/features/modules/workspace/rich-newsletter/providers/use-provider-proposal");
    return {
      WritingTool: ({
        documentId,
        block,
      }: {
        documentId: string;
        block: { id: string; text: string };
      }) => {
        h.proposal = useProviderProposal<string>(
          JSON.stringify([documentId, block.id, block.text]),
        );
        return createElement(
          "output",
          {
            "data-phase": h.proposal.phase,
            "data-blocked": String(h.proposal.blocked),
          },
          h.proposal.result,
        );
      },
    };
  },
);
vi.mock("../../src/shared/module-ui", () => ({
  ActionButton: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick: () => void;
  }) => createElement("button", { onClick }, children),
  Field: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  TextArea: () => null,
}));
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/RichText",
  () => ({ RichText: () => null }),
);
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/content/BlockPlacement",
  () => ({ BlockPlacement: () => null }),
);
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/content/StyleFields",
  () => ({ BlockStyles: () => createElement("p", null, "Style controls") }),
);

let root: ReturnType<typeof createRoot>;
let props: Parameters<typeof RichBlockControls>[0];
beforeEach(async () => {
  h.api = {};
  h.proposal = undefined;
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  props = {
    documentId: "synthetic-document",
    block: createNewsletterBlock("paragraph", { text: "Synthetic source" }),
    design: newRichDraft().design,
    structure: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  await render();
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
});
async function render() {
  await act(async () => root.render(createElement(RichBlockControls, props)));
}
async function tab(name: string) {
  const button = Array.from(document.querySelectorAll("button")).find(
    (item) => item.textContent === name,
  )!;
  await act(async () => button.click());
}
function deferred() {
  let resolve!: (value: string) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<string>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it("retains a pending owner and its proposed result across same-block tab switches", async () => {
  const request = deferred();
  const dispatch = vi.fn(() => request.promise);
  let run!: Promise<void>;
  await act(async () => {
    run = h.proposal!.run(dispatch);
  });
  await tab("Styles");
  expect(document.querySelector("output")!.closest("[hidden]")).not.toBeNull();
  await tab("Content");
  expect(h.proposal!.phase).toBe("pending");
  expect(h.proposal!.blocked).toBe(true);
  await act(async () => {
    await h.proposal!.run(dispatch);
  });
  expect(dispatch).toHaveBeenCalledOnce();
  await act(async () => {
    request.resolve("Synthetic proposal");
    await run;
  });
  await tab("Styles");
  await tab("Content");
  expect(h.proposal!.phase).toBe("proposed");
  expect(h.proposal!.result).toBe("Synthetic proposal");
  const apply = vi.fn();
  await act(async () => {
    expect(h.proposal!.useResult(apply)).toBe(true);
  });
  await act(async () => {
    expect(h.proposal!.useResult(apply)).toBe(false);
  });
  expect(apply).toHaveBeenCalledExactlyOnceWith("Synthetic proposal");
});

it("retains the unknown fence without retry or discard after a same-block tab round trip", async () => {
  const dispatch = vi.fn(async () => {
    throw new Error("Synthetic uncertain result");
  });
  await act(async () => {
    await h.proposal!.run(dispatch);
  });
  expect(h.proposal!.phase).toBe("unknown");
  await tab("Styles");
  await tab("Content");
  expect(h.proposal!.phase).toBe("unknown");
  expect(h.proposal!.blocked).toBe(true);
  await act(async () => {
    h.proposal!.discard();
    await h.proposal!.run(dispatch);
  });
  expect(h.proposal!.phase).toBe("unknown");
  expect(dispatch).toHaveBeenCalledOnce();
});

it("invalidates a proposal when source changes rather than applying stale content", async () => {
  await act(async () => {
    await h.proposal!.run(async () => "Old proposal");
  });
  await tab("Styles");
  props = { ...props, block: { ...props.block, text: "Changed source" } };
  await render();
  await tab("Content");
  expect(h.proposal!.phase).toBe("stale");
  const apply = vi.fn();
  expect(h.proposal!.useResult(apply)).toBe(false);
  expect(apply).not.toHaveBeenCalled();
});

it.each(["api", "document", "block"])(
  "preserves genuine %s scope replacement and ignores the old pending result",
  async (scope) => {
    const request = deferred();
    let run!: Promise<void>;
    await act(async () => {
      run = h.proposal!.run(() => request.promise);
    });
    await tab("Styles");
    if (scope === "api") h.api = {};
    if (scope === "document")
      props = { ...props, documentId: "different-synthetic-document" };
    if (scope === "block")
      props = {
        ...props,
        block: createNewsletterBlock("paragraph", {
          text: "Different synthetic block",
        }),
      };
    await render();
    expect(h.proposal!.phase).toBe("idle");
    await act(async () => {
      request.resolve("Old scope result");
      await run;
    });
    expect(h.proposal!.phase).toBe("idle");
    expect(h.proposal!.result).toBeUndefined();
  },
);
