import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { useRichDocument } from "../../src/features/modules/workspace/rich-newsletter/use-rich-document";
import type { RichRecoveryIdentity } from "../../src/features/modules/workspace/rich-newsletter/write-recovery";

const h = vi.hoisted(() => ({
  selected: { state: "no-selection" } as {
    state: string;
    client?: { id: string; name: string };
  },
  capture: vi.fn<(value: ReturnType<typeof useRichDocument>) => void>(),
  scope: vi.fn(),
  api: {
    request: vi.fn(async () => ({
      tenant: { id: "tenant" },
      user: { id: "user", clerkUserId: "actor" },
    })),
  },
}));
const queryClient = new QueryClient();
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => queryClient,
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "actor" }) }));
vi.mock("../../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => h.selected,
}));
vi.mock("../../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => h.api,
}));
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/write-recovery",
  async (original) => ({
    ...(await original<
      typeof import("../../src/features/modules/workspace/rich-newsletter/write-recovery")
    >()),
    createRichWriteRecovery: (
      _adapter: unknown,
      resolve: (lifetime: {
        signal: AbortSignal;
        assert: () => void;
      }) => Promise<RichRecoveryIdentity>,
    ) => ({
      hydrate: async () => {
        h.scope(
          await resolve({
            signal: new AbortController().signal,
            assert: () => {},
          }),
        );
        return null;
      },
      dispatch: vi.fn(),
      reconcile: vi.fn(),
      resolve: vi.fn(),
    }),
  }),
);
let root: ReturnType<typeof createRoot>;
function Projection() {
  h.capture(useRichDocument());
  return null;
}
async function render() {
  await act(async () => root.render(createElement(Projection)));
}
afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
  h.capture.mockClear();
  h.scope.mockClear();
});

it("uses authorized client UUIDs, replaces local owners on selection changes, and never uses a display name as scope", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const first = "10000000-0000-4000-8000-000000000001";
  const second = "10000000-0000-4000-8000-000000000002";
  h.selected = {
    state: "authorized-client",
    client: { id: first, name: "Same synthetic name" },
  };
  await render();
  const previous = h.capture.mock.lastCall![0].owner;
  expect(previous.getSnapshot().draft.config.clientId).toBe(first);
  expect(h.scope.mock.lastCall![0].clientId).toBe(first);
  await act(async () =>
    previous.edit((draft) => ({ ...draft, name: "Private local title" })),
  );
  h.selected = {
    state: "authorized-client",
    client: { id: second, name: "Same synthetic name" },
  };
  await render();
  const current = h.capture.mock.lastCall![0];
  expect(current.owner).not.toBe(previous);
  expect(current.state.draft.config.clientId).toBe(second);
  expect(current.state.draft.design.sourceClientIds).toEqual([second]);
  expect(current.state.draft.name).not.toBe("Private local title");
  expect(h.scope.mock.lastCall![0].clientId).toBe(second);
  h.selected = { state: "no-selection" };
  await render();
  expect(h.capture.mock.lastCall![0].state.draft.config.clientId).toBeNull();
  h.selected = { state: "unavailable" };
  await render();
  expect(h.capture.mock.lastCall![0].state.recovery.phase).toBe("blocked");
  expect(h.capture.mock.lastCall![0].state.draft.config.clientId).toBeNull();
});
