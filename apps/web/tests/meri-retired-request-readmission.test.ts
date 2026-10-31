import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import type { Page, Route } from "@playwright/test";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import { conversationIntentJournal } from "../src/shared/meri-conversations/query-journal";
import { clearMeriConversationRecovery } from "../src/shared/meri-conversations/conversation-recovery";
import { createInitialDraftOwner } from "../src/shared/meri-conversations/initial-draft";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { useRunCommands } from "../src/features/meri/conversation/useRunCommands";
import { composerAvailability } from "../src/features/meri/conversation/MeriLiveConversation";
import { turnFromObservation } from "../src/features/meri/conversation/conversation-view";
import { installInitialInput } from "../test/browser/meri-initial-input-fixtures";
import { context } from "../test/browser/meri-conversation-fixtures";

const scope = { ...context, clientId: context.selectedClientId };
const cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup.splice(0).forEach((dispose) => dispose());
  vi.unstubAllGlobals();
});
function memoryStorage(): TabStorage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

/** Existing canonical synthetic service handlers, exercised through the actual public SDK. */
async function service(running: boolean) {
  const handlers = new Map<string, (route: Route) => unknown>();
  const native = await installInitialInput(
    {
      route: async (url: string, handle: (route: Route) => unknown) => {
        handlers.set(url.replace("**", ""), handle);
      },
    } as unknown as Page,
    running,
  );
  let denied = false;
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    const operation = String(url);
    calls.push(operation);
    if (denied)
      return Response.json(
        { error: { code: "SESSION_REFUSED" } },
        { status: 403 },
      );
    const handler = handlers.get(operation);
    if (!handler)
      throw new Error(`Unexpected synthetic operation ${operation}`);
    let response: Response | undefined;
    await handler({
      request: () => ({
        postData: () => String(init?.body),
        postDataJSON: () => JSON.parse(String(init?.body)),
      }),
      fulfill: async (value: Parameters<Route["fulfill"]>[0]) => {
        if (!value) throw new Error("Missing fixture fulfillment");
        response = new Response(value.body as string, {
          status: value.status ?? 200,
          headers: { "content-type": value.contentType ?? "application/json" },
        });
      },
    } as unknown as Route);
    if (!response) throw new Error("Missing synthetic response");
    return response;
  };
  return {
    native,
    fetchImpl,
    calls,
    deny: (value: boolean) => {
      denied = value;
    },
  };
}

function portFor(fetchImpl: typeof fetch, onAccessLost: () => void) {
  const sdk = createMeriConversation({
    context,
    credential: `action_session_${"s".repeat(43)}`,
    expiresAtMs: Date.now() + 60_000,
    signal: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost,
    fetchImpl,
  });
  cleanup.push(() => sdk.dispose());
  return { ...sdk, context } as MeriConversationPort;
}
function mount(cache: QueryClient, port: MeriConversationPort) {
  let commands!: ReturnType<typeof useRunCommands>;
  const alive = { current: true };
  const observation = { observe: vi.fn(), stop: vi.fn(), restart: vi.fn() };
  function Probe() {
    commands = useRunCommands(port, undefined, alive, observation);
    return null;
  }
  const render = () =>
    renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(Probe),
      ),
    );
  render();
  return {
    get commands() {
      return commands;
    },
    render,
    alive,
    observation,
  };
}

it.each([false, true])(
  "first manual send, access loss and exact reauthorization only recover after completed history (running=%s)",
  async (running) => {
    const storage = memoryStorage(),
      cache = new QueryClient();
    cleanup.push(() => cache.clear());
    syncMeriTabIdentity("synthetic-retirement-session", storage);
    vi.stubGlobal("window", { sessionStorage: storage });
    const native = await service(running);
    const oldPort = portFor(native.fetchImpl, () =>
      clearMeriConversationRecovery(cache, scope, storage),
    );
    const old = mount(cache, oldPort);
    const draft = createInitialDraftOwner(scope, storage);
    draft.edit("Synthetic first manual message");
    await old.commands.submitInitial(draft.draft(), (request) =>
      draft.begin(context, request, draft.draft()),
    );
    expect(native.native.calls.allocate).toHaveLength(1);
    expect(native.native.calls.admit).toHaveLength(1);
    expect(native.native.calls.submit).toHaveLength(1);
    const retiredOwner = conversationIntentJournal(cache, context, storage);
    native.deny(true);
    await expect(oldPort.history({ after: 0, limit: 100 })).rejects.toThrow();
    expect(retiredOwner.current()).toBe(false);
    old.alive.current = false;
    native.deny(false);
    const recoveryCalls = native.calls.length;
    const port = portFor(native.fetchImpl, () =>
      clearMeriConversationRecovery(cache, scope, storage),
    );
    const fresh = mount(cache, port);
    expect(fresh.commands.storageError).toContain(
      "This tab could not safely save or recover",
    );
    await fresh.commands.history();
    fresh.render();
    expect(native.calls.slice(recoveryCalls)).toEqual([
      "/api/conversations/history",
    ]);
    expect(native.native.calls.allocate).toHaveLength(1);
    expect(native.native.calls.admit).toHaveLength(1);
    expect(native.native.calls.submit).toHaveLength(1);
    expect(native.native.calls.cancel).toBe(0);
    const view = turnFromObservation(
      port.getSnapshot().observation!,
      context.runId,
    );
    const availability = composerAvailability(
      {
        ...fresh.commands,
        snapshot: port.getSnapshot(),
        observing: "idle",
        refreshRunStatus: vi.fn(),
        refreshAfterDecision: vi.fn(),
        suspendObservation: vi.fn(),
        reconnect: vi.fn(),
      },
      view,
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      !running,
      false,
    );
    if (running) {
      expect(fresh.commands.storageError).toContain(
        "This tab could not safely save or recover",
      );
      expect(fresh.commands.intent).toEqual({});
      expect(availability.readyForNext).toBe(false);
    } else {
      expect(fresh.commands.storageError).toBeUndefined();
      expect(fresh.commands.intent.submit?.state).toBe("observed");
      expect(fresh.commands.intent.submit?.requestId).toBe(
        port.getSnapshot().acceptedRequest?.requestId,
      );
      expect(availability.sendBlocked).toBeUndefined();
      expect(availability.readyForNext).toBe(true);
      expect(createInitialDraftOwner(scope, storage).draft()).toBe("");
    }
    expect(retiredOwner.current()).toBe(false);
    expect(() => retiredOwner.write({})).toThrow();
  },
);
