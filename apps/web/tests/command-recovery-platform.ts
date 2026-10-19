import { beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";
import { decryptJournal } from "../src/shared/session/recovery/journal-crypto";

const storage = vi.hoisted(() => ({
  records: new Map<string, unknown>(),
  writes: [] as string[],
  beforeRead: undefined as undefined | (() => Promise<void>),
  failWrite: false,
}));
vi.mock("../src/shared/session/recovery/journal-db", () => ({
  readJournalRecord: async (scope: string) => {
    await storage.beforeRead?.();
    return structuredClone(storage.records.get(scope));
  },
  writeJournalRecord: async (scope: string, value: unknown) => {
    if (storage.failWrite) throw new Error("synthetic storage failure");
    storage.writes.push(scope);
    storage.records.set(scope, structuredClone(value));
  },
}));

export const db = storage;

export function barrier() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// Platform-only FIFO scheduling. No journal, request, or disposition logic.
export class LockScheduler {
  tails = new Map<string, Promise<unknown>>();
  events: string[] = [];
  async request<T>(name: string, action: () => Promise<T>): Promise<T> {
    this.events.push(`queued:${name}`);
    const previous = this.tails.get(name) ?? Promise.resolve();
    const turn = previous
      .catch(() => undefined)
      .then(async () => {
        this.events.push(`entered:${name}`);
        try {
          return await action();
        } finally {
          this.events.push(`released:${name}`);
        }
      });
    this.tails.set(name, turn);
    return turn;
  }
}

export const local = new Map<string, string>();
export let locks: LockScheduler;
export const scope = "tenant-a:actor-a:client-a:workspace-copy";
export const id = "a1000000-0000-4000-8000-000000000008";
export const nextId = "a1000000-0000-4000-8000-000000000009";
export const code = "WORKSPACE_BRIEF_STATE_CONFLICT";
export const fenceKey = (value = scope) => `capiro-command-fence-v1:${value}`;
export const executionKey = (value = scope) =>
  `capiro-command-execution-v1:${value}`;
export const data = { requestId: id, body: "synthetic private draft" };
export const contract = {
  schema: z.object({ requestId: z.uuid(), body: z.string() }).strict(),
  requestId: (value: typeof data) => value.requestId,
};
export const current = () => undefined;
export const envelope = () => decryptJournal(scope, db.records.get(scope));

export function installPlatform() {
  beforeEach(() => {
    db.records.clear();
    db.writes = [];
    db.beforeRead = undefined;
    db.failWrite = false;
    local.clear();
    locks = new LockScheduler();
    vi.stubGlobal("navigator", { locks });
    vi.stubGlobal("indexedDB", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => local.set(key, value),
      removeItem: (key: string) => local.delete(key),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
}
