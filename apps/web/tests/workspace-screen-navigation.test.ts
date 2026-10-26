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
  create: vi.fn(),
  update: vi.fn(),
  meetings: vi.fn(),
  resolution: vi.fn(),
  context: vi.fn(),
  generation: vi.fn(),
  values: [] as unknown[],
  index: 0,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = h.index++;
    if (index === h.values.length) h.values.push(initial);
    return [
      h.values[index],
      (next: unknown) => {
        h.values[index] =
          typeof next === "function" ? next(h.values[index]) : next;
      },
    ];
  },
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
vi.mock("../src/features/modules/workspace/hillday/HillDayMeetings", () => ({
  HillDayMeetings: (props: unknown) => {
    h.meetings(props);
    return null;
  },
}));
vi.mock("../src/features/modules/workspace/hillday/HillDayResolution", () => ({
  HillDayResolution: (props: unknown) => {
    h.resolution(props);
    return null;
  },
}));
vi.mock("../src/features/modules/workspace/hillday/HillDayContext", () => ({
  HillDayContext: (props: unknown) => {
    h.context(props);
    return null;
  },
}));
vi.mock("../src/features/modules/workspace/hillday/HillDayGeneration", () => ({
  HillDayGeneration: (props: unknown) => {
    h.generation(props);
    return null;
  },
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({
    data: { blueprints: [], items: [] },
    loading: false,
    reload: vi.fn(),
  }),
  useCapiroMutation: (key: string) => ({
    run: key === "workspace.hillday.create" ? h.create : h.update,
    pending: false,
  }),
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
  Field: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  StatusPanel: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  TextInput: () => null,
}));
const render = (query = "") => {
  h.index = 0;
  h.query = query;
  return renderToStaticMarkup(createElement(WorkspaceScreen));
};
beforeEach(() => {
  vi.clearAllMocks();
  h.query = "";
  h.values = [];
  h.index = 0;
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
  h.wizard.mock.lastCall![0].onCreated({ id: draft.id, clientId: otherId });
  expect(h.push).toHaveBeenCalledWith(
    `/modules/workspace?clientId=${otherId}&view=hillday&hilldayId=${draft.id}`,
  );
});

it.each([
  { label: "same sponsor", sponsor: otherId, pendingSponsor: otherId },
  { label: "changed sponsor", sponsor: prospectId, pendingSponsor: prospectId },
  {
    label: "input changes while creation is pending",
    sponsor: prospectId,
    pendingSponsor: otherId,
  },
])(
  "opens the acknowledged Hill Day client when $label",
  async ({ sponsor, pendingSponsor }) => {
    render(`view=hillday&clientId=${otherId}`);
    const props = h.wizard.mock.lastCall![0];
    const { HillDayWizard } = await vi.importActual<
      typeof import("../src/features/modules/workspace/hillday/HillDayWizard")
    >("../src/features/modules/workspace/hillday/HillDayWizard");
    // Begin at the existing sponsor step with a selected authorized sponsor.
    // All transitions after this use the real Wizard callbacks and create receipt.
    h.values = [
      1,
      "synthetic-blueprint",
      sponsor,
      "Synthetic created schedule",
      undefined,
      [],
      "",
    ];
    const renderWizard = () => {
      h.index = 0;
      h.buttons.mockClear();
      renderToStaticMarkup(createElement(HillDayWizard, props));
    };
    let resolveCreate!: (value: unknown) => void;
    h.create.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderWizard();
    const pending = h.buttons.mock.calls
      .find(([button]) => button.children === "Open calendar →")![0]
      .onClick();
    expect(h.create).toHaveBeenCalledWith({
      body: expect.objectContaining({ clientId: sponsor }),
    });
    // Sponsor input can change before creation is acknowledged; it must not
    // replace the canonical client returned for the created document.
    h.values[2] = pendingSponsor;
    resolveCreate({
      id: draft.id,
      name: "Synthetic created schedule",
      status: "draft",
      client: { id: sponsor, name: "Synthetic sponsor" },
      timeZone: "UTC",
      lookbackDays: 30,
    });
    await pending;
    renderWizard();
    h.meetings.mock.lastCall![0].onSaved([]);
    renderWizard();
    h.resolution.mock.lastCall![0].onContinue();
    renderWizard();
    h.context.mock.lastCall![0].onContinue();
    renderWizard();
    h.generation.mock.lastCall![0].onOpen();
    const destination = new URL(
      h.push.mock.lastCall![0],
      "https://synthetic.invalid",
    );
    expect(destination.searchParams.get("hilldayId")).toBe(draft.id);
    expect(destination.searchParams.get("clientId")).toBe(sponsor);
    render(destination.searchParams.toString());
    expect(h.hillday.mock.lastCall![0]).toMatchObject({
      id: draft.id,
      expectedClientId: sponsor,
    });
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(h.update).not.toHaveBeenCalled();
  },
);

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
