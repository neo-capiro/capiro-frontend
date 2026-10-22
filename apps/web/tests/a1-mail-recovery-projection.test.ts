import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { useSendMail } from "../src/features/portfolio/relationships/email";
import {
  beginMailAttempt,
  mailAttemptKey,
  settleMailAttempt,
} from "../src/features/portfolio/relationships/email/send-attempt";
import {
  MailSendError,
  type SendInput,
} from "../src/features/portfolio/relationships/email/send";

type Effect = () => void | (() => void);
type Dependencies = readonly unknown[] | undefined;
type RecoveryRow = {
  intentId: string;
  requestKey: string;
  state: "pending" | "sending" | "unknown" | "accepted" | "failed";
  ok?: true;
  threadId?: string;
  messageId?: string;
};
const hooks = vi.hoisted(() => ({
  values: [] as unknown[],
  memos: [] as { value: unknown; deps: Dependencies }[],
  refs: [] as { current: unknown }[],
  effects: [] as { deps: Dependencies; cleanup: void | (() => void) }[],
  pending: [] as { index: number; deps: Dependencies; effect: Effect }[],
  stateIndex: 0,
  memoIndex: 0,
  refIndex: 0,
  effectIndex: 0,
  dirty: false,
}));
const harness = vi.hoisted(() => ({
  tenant: "tenant-a",
  actor: "actor-a",
  recovery: undefined as RecoveryRow | undefined,
  request: vi.fn(),
  send: vi.fn(),
  mutation: {
    isPending: false,
    isIdle: false,
    isSuccess: false,
    isError: true,
    status: "error" as "error" | "pending" | "success" | "idle",
    error: null as Error | null,
  },
  mutationFn: undefined as undefined | ((input: SendInput) => Promise<unknown>),
}));
function sameDependencies(a: Dependencies, b: Dependencies) {
  return (
    !!a && !!b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
  );
}
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = hooks.stateIndex++;
    if (index === hooks.values.length) hooks.values.push(initial);
    return [
      hooks.values[index],
      (next: unknown) => {
        if (!Object.is(hooks.values[index], next)) hooks.dirty = true;
        hooks.values[index] = next;
      },
    ];
  },
  useMemo: (factory: () => unknown, deps: Dependencies) => {
    const index = hooks.memoIndex++;
    if (!sameDependencies(hooks.memos[index]?.deps, deps))
      hooks.memos[index] = { value: factory(), deps };
    return hooks.memos[index]!.value;
  },
  useRef: (initial: unknown) => {
    const index = hooks.refIndex++;
    if (index === hooks.refs.length) hooks.refs.push({ current: initial });
    return hooks.refs[index];
  },
  useEffect: (effect: Effect, deps: Dependencies) => {
    const index = hooks.effectIndex++;
    if (!sameDependencies(hooks.effects[index]?.deps, deps))
      hooks.pending.push({ index, deps, effect });
  },
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) =>
    snapshot(),
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => cache,
  useQuery: () => ({ data: harness.recovery }),
  useMutation: (options: {
    mutationFn: (input: SendInput) => Promise<unknown>;
  }) => {
    harness.mutationFn = options.mutationFn;
    return harness.mutation;
  },
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => ({ request: harness.request }),
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({
    data: { tenant: { id: harness.tenant }, user: { id: harness.actor } },
  }),
}));
vi.mock("../src/features/portfolio/relationships/email/authority", () => ({
  useMailAuthority: () => ({ capture: () => () => {} }),
}));
vi.mock(
  "../src/features/portfolio/relationships/email/send",
  async (original) => ({
    ...(await original<
      typeof import("../src/features/portfolio/relationships/email/send")
    >()),
    sendReviewedMail: (...args: unknown[]) => harness.send(...args),
  }),
);

const values = new Map<string, string>();
const capture = vi.fn<(view: ReturnType<typeof useSendMail>) => void>();
const input: SendInput = {
  clientId: "client-a",
  subject: "Synthetic recovery test",
  bodyHtml: "<p>Private draft</p>",
  to: [{ email: "synthetic@example.test" }],
  appendSignature: false,
};
let cache: QueryClient;
let entity: string;
let clientId: string;
let lockBarrier: Promise<void> | undefined;
const currentKey = () =>
  mailAttemptKey(harness.tenant, harness.actor, clientId, entity);
const current = () => capture.mock.lastCall![0];
function Probe() {
  capture(useSendMail(clientId, entity));
  return null;
}
function render() {
  for (let pass = 0; ; pass++) {
    if (pass === 20) throw new Error("Mail hook probe did not settle");
    hooks.stateIndex = hooks.memoIndex = hooks.refIndex = hooks.effectIndex = 0;
    hooks.pending = [];
    hooks.dirty = false;
    renderToStaticMarkup(createElement(Probe));
    if (!hooks.dirty) break;
  }
  for (const change of hooks.pending) hooks.effects[change.index]?.cleanup?.();
  for (const change of hooks.pending)
    hooks.effects[change.index] = {
      deps: change.deps,
      cleanup: change.effect(),
    };
}
async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
  render();
}
async function reserve() {
  const token = await beginMailAttempt(cache, currentKey(), input);
  await settleMailAttempt(cache, currentKey(), token, harness.mutation.error);
  render();
  return token;
}
function accepted(requestKey: string): RecoveryRow {
  return {
    intentId: "10000000-0000-4000-8000-000000000001",
    requestKey,
    state: "accepted",
    ok: true,
    threadId: "10000000-0000-4000-8000-000000000002",
    messageId: "10000000-0000-4000-8000-000000000003",
  };
}
beforeEach(() => {
  values.clear();
  hooks.values = [];
  hooks.memos = [];
  hooks.refs = [];
  hooks.effects = [];
  hooks.pending = [];
  entity = "person:synthetic";
  clientId = "client-a";
  harness.tenant = "tenant-a";
  harness.actor = "actor-a";
  harness.recovery = undefined;
  harness.request.mockReset();
  harness.send.mockReset();
  harness.mutation.error = new MailSendError(
    "Uncertain original dispatch",
    true,
  );
  harness.mutation.isPending = false;
  harness.mutation.isSuccess = false;
  harness.mutation.isError = true;
  harness.mutation.status = "error";
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  lockBarrier = undefined;
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal("navigator", {
    locks: {
      request: async (_key: string, run: () => unknown) => {
        await lockBarrier;
        return run();
      },
    },
  });
});

it("a second tab's new rejected token cannot revive the previous accepted result", async () => {
  const first = await reserve();
  harness.recovery = accepted(first);
  render();
  await flush();
  expect(current().isSuccess).toBe(true);
  const second = await beginMailAttempt(cache, currentKey(), input);
  expect(second).not.toBe(first);
  harness.recovery = undefined;
  render();
  expect(current().isSuccess).toBe(false);
  harness.recovery = { ...accepted(second), state: "failed" };
  render();
  await flush();
  expect(cache.getQueryData(currentKey())).toBeNull();
  expect(current().isSuccess).toBe(false);
  expect(current().error).toMatchObject({ uncertain: false });
  expect(current().error?.message).toContain("rejected without delivery");
  expect(harness.send).not.toHaveBeenCalled();
});
afterEach(() => {
  for (const effect of hooks.effects) effect.cleanup?.();
  cache.clear();
  vi.unstubAllGlobals();
});

describe("accepted mail recovery projection", () => {
  it("clears the mounted caller's uncertain error and shows success for the exact accepted reservation", async () => {
    const token = await reserve();
    expect(current().error).toBe(harness.mutation.error);
    expect(current().isSuccess).toBe(false);
    harness.recovery = accepted(token);
    render();
    await flush();
    expect(cache.getQueryData(currentKey())).toBeNull();
    expect(values.size).toBe(0);
    expect(current()).toMatchObject({
      error: null,
      isPending: false,
      isSuccess: true,
      isError: false,
      status: "success",
    });
    expect(harness.send).not.toHaveBeenCalled();
  });
  it.each(["unknown", "pending", "sending", "accepted"] as const)(
    "keeps %s or incomplete acceptance fenced with its existing error",
    async (state) => {
      const token = await reserve();
      harness.recovery = {
        intentId: accepted(token).intentId,
        requestKey: token,
        state,
      };
      render();
      await flush();
      expect(cache.getQueryData(currentKey())).toMatchObject({ token });
      expect(current().error).toBe(harness.mutation.error);
      expect(current().isSuccess).toBe(false);
      expect(values.size).toBe(1);
      expect(harness.send).not.toHaveBeenCalled();
    },
  );
  it("does not apply a different token's accepted result", async () => {
    const token = await reserve();
    harness.recovery = accepted("20000000-0000-4000-8000-000000000001");
    render();
    await flush();
    expect(cache.getQueryData(currentKey())).toMatchObject({ token });
    expect(current().error).toBe(harness.mutation.error);
    expect(current().isSuccess).toBe(false);
  });
});

describe("accepted mail recovery lifetime", () => {
  it.each(["entity", "client", "tenant", "actor"])(
    "does not project an old accepted result into another %s",
    async (field) => {
      const token = await reserve();
      let release!: () => void;
      lockBarrier = new Promise<void>((resolve) => {
        release = resolve;
      });
      harness.recovery = accepted(token);
      render();
      if (field === "entity") entity = "person:other";
      if (field === "client") clientId = "client-b";
      if (field === "tenant") harness.tenant = "tenant-b";
      if (field === "actor") harness.actor = "actor-b";
      harness.recovery = undefined;
      render();
      release();
      await flush();
      expect(current().isSuccess).toBe(false);
      expect(harness.send).not.toHaveBeenCalled();
    },
  );
  it("a later explicit send gets its own uncertain error instead of the previous recovered success", async () => {
    const token = await reserve();
    harness.recovery = accepted(token);
    render();
    await flush();
    expect(current().isSuccess).toBe(true);
    const nextError = new MailSendError("Next dispatch uncertain", true);
    harness.send.mockRejectedValue(nextError);
    await expect(harness.mutationFn!(input)).rejects.toBe(nextError);
    render();
    await flush();
    expect(cache.getQueryData(currentKey())).not.toMatchObject({ token });
    expect(current().error).toBe(nextError);
    expect(current().isSuccess).toBe(false);
    expect(harness.send).toHaveBeenCalledTimes(1);
  });
  it("does not revive a completed recovery after leaving and returning to its scope", async () => {
    const token = await reserve();
    harness.recovery = accepted(token);
    render();
    await flush();
    expect(current().isSuccess).toBe(true);
    entity = "person:other";
    harness.recovery = undefined;
    render();
    entity = "person:synthetic";
    render();
    expect(current().isSuccess).toBe(false);
  });
});
