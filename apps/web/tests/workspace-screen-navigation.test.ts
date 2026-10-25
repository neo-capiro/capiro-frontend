import { beforeEach, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceScreen } from "../src/features/modules/workspace/WorkspaceScreen";
import { draft, otherId, prospectId } from "./prospect-resources-fixtures";

const h = vi.hoisted(() => ({
  query: "",
  push: vi.fn(),
  draft: vi.fn(),
  hillday: vi.fn(),
  wizard: vi.fn(),
  newsletter: vi.fn(),
  prospect: vi.fn(),
  rich: vi.fn(),
  copy: vi.fn(),
  library: vi.fn(),
  buttons: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(h.query),
  useRouter: () => ({ push: h.push }),
}));
vi.mock("../src/features/modules/workspace/WorkspaceDraft", () => ({
  WorkspaceDraft: (props: unknown) => {
    h.draft(props);
    return null;
  },
}));
vi.mock("../src/features/modules/workspace/hillday/HillDayEditor", () => ({
  HillDayEditor: (props: unknown) => {
    h.hillday(props);
    return null;
  },
}));
vi.mock("../src/features/modules/workspace/hillday/HillDayWizard", () => ({
  HillDayWizard: (props: unknown) => {
    h.wizard(props);
    return null;
  },
}));
vi.mock(
  "../src/features/modules/workspace/newsletter/NewsletterWorkflow",
  () => ({
    NewsletterWorkflow: (props: unknown) => {
      h.newsletter(props);
      return null;
    },
  }),
);
vi.mock(
  "../src/features/modules/workspace/prospects/ProspectWorkspace",
  () => ({
    ProspectWorkspace: (props: unknown) => {
      h.prospect(props);
      return null;
    },
  }),
);
vi.mock(
  "../src/features/modules/workspace/rich-newsletter/RichNewsletterEditor",
  () => ({
    RichNewsletterEditor: (props: unknown) => {
      h.rich(props);
      return null;
    },
  }),
);
vi.mock("../src/features/modules/workspace/brief-copy/BriefCopyRoute", () => ({
  BriefCopyRoute: () => {
    h.copy();
    return null;
  },
}));
vi.mock("../src/features/modules/workspace/templates/TemplateStudio", () => ({
  TemplateStudio: () => null,
}));
vi.mock("../src/features/modules/workspace/WorkspaceShares", () => ({
  WorkspaceShares: () => null,
}));
vi.mock("../src/features/modules/workspace/WorkspaceLibrary", () => ({
  WorkflowCards: () => null,
  DocumentsLibrary: (props: unknown) => {
    h.library(props);
    return null;
  },
}));
vi.mock("../src/shared/module-ui", () => ({
  ActionButton: (props: { children: ReactNode }) => {
    h.buttons(props);
    return createElement("button", null, props.children);
  },
  Modal: () => null,
}));
const render = (query = "") => {
  h.query = query;
  return renderToStaticMarkup(createElement(WorkspaceScreen));
};
beforeEach(() => {
  vi.clearAllMocks();
  h.query = "";
});

it("opens each library resource using its canonical kind and keeps the selected client", () => {
  render(`clientId=${otherId}`);
  const open = h.library.mock.lastCall![0].onOpen;
  open({ kind: "draft", id: draft.id, route: "https://untrusted.invalid" });
  expect(h.push).toHaveBeenLastCalledWith(
    `/modules/workspace?clientId=${otherId}&draftId=${draft.id}`,
  );
  open({ kind: "hillday", id: draft.id, route: "javascript:untrusted()" });
  expect(h.push).toHaveBeenLastCalledWith(
    `/modules/workspace?clientId=${otherId}&view=hillday&hilldayId=${draft.id}`,
  );
});

it("mounts direct draft and Hill Day receivers and closes into the same client library", () => {
  render(`draftId=${draft.id}&clientId=${otherId}`);
  expect(h.draft.mock.lastCall![0]).toMatchObject({
    id: draft.id,
    expectedClientId: otherId,
  });
  h.draft.mock.lastCall![0].onClose();
  expect(h.push).toHaveBeenLastCalledWith(
    `/modules/workspace?clientId=${otherId}`,
  );
  render(`view=hillday&hilldayId=${draft.id}&clientId=${otherId}`);
  expect(h.hillday.mock.lastCall![0]).toMatchObject({
    id: draft.id,
    expectedClientId: otherId,
  });
  expect(h.wizard).not.toHaveBeenCalled();
  h.hillday.mock.lastCall![0].onClose();
  expect(h.push).toHaveBeenLastCalledWith(
    `/modules/workspace?clientId=${otherId}`,
  );
});

it("routes acknowledged Hill Day creation to a durable editor URL", () => {
  render(`view=hillday&clientId=${otherId}`);
  h.wizard.mock.lastCall![0].onCreated(draft.id);
  expect(h.push).toHaveBeenCalledWith(
    `/modules/workspace?clientId=${otherId}&view=hillday&hilldayId=${draft.id}`,
  );
});

it("restores each current URL without navigating or mounting another receiver", () => {
  render(`draftId=${draft.id}`);
  render("view=newsletter");
  render(`view=hillday&hilldayId=${otherId}`);
  render();
  expect(h.draft).toHaveBeenCalledTimes(1);
  expect(h.newsletter).toHaveBeenCalledTimes(1);
  expect(h.hillday.mock.lastCall![0].id).toBe(otherId);
  expect(h.library).toHaveBeenCalledTimes(1);
  expect(h.push).not.toHaveBeenCalled();
});

it("retains exact prospect navigation and the brief-copy owner", () => {
  render(`prospectId=${prospectId}&clientId=${otherId}`);
  h.prospect.mock.lastCall![0].onOpen(draft.id);
  expect(h.push).toHaveBeenLastCalledWith(
    `/modules/workspace?clientId=${otherId}&draftId=${draft.id}&prospectId=${prospectId}`,
  );
  render(`prospectId=${prospectId}&draftId=${draft.id}&clientId=${otherId}`);
  h.draft.mock.lastCall![0].onClose();
  expect(h.push).toHaveBeenLastCalledWith(
    `/modules/workspace?clientId=${otherId}&prospectId=${prospectId}`,
  );
  render(`prospectId=${prospectId}&briefSource=encoded`);
  expect(h.copy).toHaveBeenCalledTimes(1);
});

it("makes explicit template and rich-library entry actions durable", () => {
  render(`clientId=${otherId}`);
  h.buttons.mock.calls
    .find(([props]) => props.children === "Meri files")![0]
    .onClick();
  expect(h.push).toHaveBeenLastCalledWith(`/meri/files?clientId=${otherId}`);
  h.buttons.mock.calls
    .find(([props]) => props.children === "Template Studio")![0]
    .onClick();
  expect(h.push).toHaveBeenLastCalledWith(
    `/modules/workspace?clientId=${otherId}&view=templates`,
  );
  h.buttons.mock.calls
    .find(([props]) => props.children === "Rich newsletter preview")![0]
    .onClick();
  expect(h.push).toHaveBeenLastCalledWith(
    `/modules/workspace?clientId=${otherId}&view=rich-newsletter`,
  );
});

it.each([
  "draftId=invalid",
  `draftId=${draft.id}&view=rich-newsletter`,
  `draftId=${draft.id}&draftId=${otherId}`,
  `view=hillday&hilldayId=${draft.id}&draftId=${otherId}`,
])("rejects %s before mounting any receiver or issuing navigation", (query) => {
  expect(render(query)).toContain('role="alert"');
  for (const receiver of [
    h.draft,
    h.hillday,
    h.wizard,
    h.newsletter,
    h.prospect,
    h.rich,
    h.copy,
    h.library,
    h.push,
  ])
    expect(receiver).not.toHaveBeenCalled();
});
