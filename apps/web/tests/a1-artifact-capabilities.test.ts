import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  Children,
  createElement,
  isValidElement,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { MeetingArtifacts } from "../src/features/portfolio/calendar/MeetingArtifacts";
import type { ArtifactChange } from "../src/features/portfolio/calendar/artifacts/contracts";
import {
  acceptanceArtifact,
  acceptanceMeeting,
} from "./browser/acceptance-meeting-artifacts-data";

type DialogProps = { open: boolean; title: string; children: ReactNode };
const observed = vi.hoisted(() => ({
  cache: undefined as QueryClient | undefined,
  guard: undefined as ((change: ArtifactChange) => void) | undefined,
  state: [] as unknown[],
  stateIndex: 0,
  dialogs: [] as DialogProps[],
  mutate: vi.fn(),
}));
const queryKey = ["synthetic-artifact-capability-read"];
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: <T>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] => {
    const index = observed.stateIndex++;
    if (!(index in observed.state))
      observed.state[index] =
        typeof initial === "function" ? (initial as () => T)() : initial;
    return [
      observed.state[index] as T,
      (next) => {
        observed.state[index] =
          typeof next === "function"
            ? (next as (previous: T) => T)(observed.state[index] as T)
            : next;
      },
    ];
  },
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => observed.cache,
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  canAdminister: () => false,
  useIdentity: () => ({
    data: {
      tenant: { id: "synthetic-tenant" },
      user: { id: "synthetic-actor" },
      role: "standard_user",
    },
    isSuccess: true,
    isPending: false,
    isFetching: false,
  }),
}));
vi.mock("../src/features/portfolio/calendar/queries", () => ({
  useMeetingNotes: () => ({
    queryKey: ["synthetic-artifact-capability-read"],
    isSuccess: true,
    isFetching: false,
  }),
}));
vi.mock(
  "../src/features/portfolio/calendar/artifacts/useArtifactMutation",
  () => ({
    useArtifactMutation: (
      _meeting: unknown,
      _kind: unknown,
      _actor: unknown,
      guard: (change: ArtifactChange) => void,
    ) => {
      observed.guard = guard;
      return {
        attempt: { status: "idle" },
        isPending: false,
        uncertain: false,
        mutate: observed.mutate,
      };
    },
  }),
);
vi.mock("../src/shared/portfolio/ui/Dialog", () => ({
  Dialog: (props: DialogProps) => {
    observed.dialogs.push(props);
    return null;
  },
}));
vi.mock("../src/shared/portfolio/ui/QueryState", () => ({
  QueryState: () => null,
}));
vi.mock("../src/features/portfolio/calendar/debrief/public", () => ({
  DebriefGeneration: () => null,
}));
vi.mock("../src/features/portfolio/calendar/documents/public", () => ({
  SavedMeetingDocumentPreview: () => null,
}));

type Capabilities = {
  edit: boolean;
  approve: boolean;
  share: boolean;
  unshare: boolean;
};
const allowed: Capabilities = {
  edit: true,
  approve: true,
  share: true,
  unshare: true,
};
function publish(capabilities: Capabilities | undefined = allowed) {
  observed.cache!.setQueryData(queryKey, [
    {
      ...acceptanceArtifact("notes"),
      status: "approved",
      sharingKnown: true,
      sharedAt: "2026-10-22T12:00:00Z",
      capabilities,
    },
  ]);
}
function render() {
  observed.stateIndex = 0;
  observed.dialogs = [];
  renderToStaticMarkup(
    createElement(MeetingArtifacts, {
      meeting: acceptanceMeeting(),
      kind: "notes",
    }),
  );
}
function dialog(title: string) {
  const found = observed.dialogs.find((item) => item.title === title);
  if (!found) throw new Error(`Missing actual ${title} dialog`);
  return found;
}
function buttonClick(children: ReactNode): (() => void) | undefined {
  for (const child of Children.toArray(children)) {
    if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(child))
      continue;
    if (child.type === "button") return child.props.onClick;
    const nested = buttonClick(child.props.children);
    if (nested) return nested;
  }
}
beforeEach(() => {
  observed.cache = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });
  observed.guard = undefined;
  observed.state = [];
  observed.mutate.mockClear();
  publish();
});
afterEach(() => observed.cache?.clear());

const changes: Array<[keyof Capabilities, ArtifactChange]> = [
  [
    "edit",
    {
      action: "save",
      id: "artifact-one",
      body: "Retained local text",
      confidential: false,
    },
  ],
  ["approve", { action: "approve", id: "artifact-one" }],
  ["share", { action: "share", id: "artifact-one" }],
  ["unshare", { action: "unshare", id: "artifact-one" }],
];
it.each(changes)(
  "rechecks refreshed %s refusal in the actual current-command predicate",
  (capability, change) => {
    render();
    const guard = observed.guard!;
    expect(() => guard(change)).not.toThrow();
    // Refresh the real query cache without re-rendering: an old command closure must see the refusal.
    publish({ ...allowed, [capability]: false });
    expect(() => guard(change)).toThrow("Refresh the saved artifacts");
    expect(observed.mutate).not.toHaveBeenCalled();
    publish();
    expect(() => guard(change)).not.toThrow();
  },
);
it.each(changes)(
  "preserves compatibility when %s capabilities are absent",
  (_capability, change) => {
    publish(undefined);
    // Explicit undefined bypasses the fixture default to model an older response.
    observed.cache!.setQueryData<Array<Record<string, unknown>>>(
      queryKey,
      (rows) => rows?.map(({ capabilities: _capabilities, ...row }) => row),
    );
    render();
    expect(() => observed.guard!(change)).not.toThrow();
  },
);
it("conceals the open edit dialog on refreshed edit refusal and retains its local draft", () => {
  const draft = {
    id: "artifact-one",
    body: "Retained local text",
    confidential: false,
  };
  observed.state = [draft];
  render();
  expect(dialog("Edit note").open).toBe(true);
  publish({ ...allowed, edit: false });
  render();
  expect(dialog("Edit note").open).toBe(false);
  expect(observed.state[0]).toEqual(draft);
  publish();
  render();
  expect(dialog("Edit note").open).toBe(true);
});
it("conceals an open share dialog and refuses its retained click after a capability refresh", () => {
  observed.state = [undefined, "artifact-one"];
  render();
  const share = dialog("Share note");
  expect(share.open).toBe(true);
  const click = buttonClick(share.children);
  expect(click).toBeTypeOf("function");
  publish({ ...allowed, share: false });
  click!();
  expect(observed.mutate).not.toHaveBeenCalled();
  render();
  expect(dialog("Share note").open).toBe(false);
  publish();
  click!();
  expect(observed.mutate).toHaveBeenCalledExactlyOnceWith(
    { action: "share", id: "artifact-one" },
    expect.any(Function),
  );
});
