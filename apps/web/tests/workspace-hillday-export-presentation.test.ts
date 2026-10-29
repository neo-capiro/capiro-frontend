import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HillDayExport } from "../src/features/modules/workspace/hillday/HillDayExport";

const state = vi.hoisted(() => ({
  known: false,
  error: undefined as string | undefined,
  refresh: vi.fn(),
  generate: vi.fn(),
  controls: [] as { children: ReactNode; onClick?: () => void }[],
}));
vi.mock("../src/features/modules/workspace/hillday/useHillDayExport", () => ({
  useHillDayExport: () => ({ ...state, ready: true, loading: false }),
}));
vi.mock("@/shared/module-ui", () => ({
  ActionButton: (props: { children: ReactNode; onClick?: () => void }) => {
    state.controls.push(props);
    return createElement("button", {}, props.children);
  },
  Field: ({ children }: { children: ReactNode }) => children,
  SelectInput: () => null,
  Modal: ({
    description,
    children,
    footer,
  }: {
    description: string;
    children: ReactNode;
    footer: ReactNode;
  }) => createElement("section", {}, description, children, footer),
}));
const render = () =>
  renderToStaticMarkup(
    createElement(HillDayExport, {
      scope: {
        tenantId: "tenant",
        userId: "user",
        actorId: "actor",
        documentId: "document",
        clientId: "client",
      },
      onClose: vi.fn(),
    }),
  );
beforeEach(() => {
  state.known = false;
  state.error = undefined;
  state.controls = [];
  state.refresh.mockReset();
  state.generate.mockReset();
});
describe("Hill Day PDF request-state presentation", () => {
  it("does not claim a retained request after history fails, and only offers lookup", () => {
    state.error = "Saved history could not be read.";
    const html = render();
    expect(html).toContain("Request retention is not confirmed");
    expect(html).not.toContain("The original request is retained");
    expect(html).not.toContain("This request is retained");
    expect(html).not.toContain("looks up the original request");
    expect(html).not.toContain("Generate PDF");
    const check = state.controls.find(
      (control) => control.children === "Check status",
    );
    expect(check).toBeDefined();
    check!.onClick!();
    expect(state.refresh).toHaveBeenCalledOnce();
    expect(state.generate).not.toHaveBeenCalled();
  });
  it("preserves known-request guidance and the no-replacement fence when its read fails", () => {
    state.known = true;
    state.error = "Request status is unavailable.";
    const html = render();
    expect(html).toContain(
      "This request is retained across closing and reloading",
    );
    expect(html).toContain("looks up the original request");
    expect(html).toContain("Check status");
    expect(html).not.toContain("Generate PDF");
  });
  it("describes future retention before generation without claiming an existing request", () => {
    const html = render();
    expect(html).toContain("After you generate a PDF");
    expect(html).toContain("Generate PDF");
    expect(html).not.toContain("This request is retained");
    expect(html).not.toContain("The original request is retained");
  });
});
