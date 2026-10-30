import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

/**
 * Runs the REAL useClientImport + importClientSelection + import-request-intent
 * + attempt-journal modules over a micro hook runtime and inert transport.
 * Only React, the attempt/lower-record hook adapters and CapiroApiError are
 * replaced; the ordering, guards, storage and chunk logic are production bytes.
 */

const root = process.cwd();
const dir = fs.mkdtempSync(path.join(root, "tests", ".production-flow-"));

const stub = (name: string, body: string) =>
  fs.writeFileSync(path.join(dir, name), body);

const rewrite = (code: string) =>
  code
    .replaceAll('"react"', '"./react-stub.mjs"')
    .replaceAll('"./use-onboard-attempt"', '"./attempt-stub.mjs"')
    .replaceAll('"./use-local-record"', '"./local-record-stub.mjs"')
    .replaceAll(
      '"./import-client-selection"',
      '"./import-client-selection.mjs"',
    )
    .replaceAll('"./import-request-intent"', '"./import-request-intent.mjs"')
    .replaceAll('"./attempt-journal"', '"./attempt-journal.mjs"')
    .replaceAll('"@/shared/capiro/http"', '"./capiro-http.mjs"');

const compile = (rel: string, out: string) => {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  const code = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: rel,
  }).outputText;
  fs.writeFileSync(path.join(dir, out), rewrite(code));
};

let hook: typeof import("../src/features/onboard/lib/use-client-import");
let reactStub: { __reset: () => void; __render: () => void };
let attemptStub: { __reset: () => void; __records: () => unknown[] };

beforeAll(async () => {
  stub(
    "react-stub.mjs",
    `let slots = [];
let cursor = 0;
export function __reset(){ slots = []; cursor = 0; }
export function __render(){ cursor = 0; }
export function useRef(initial){ const i = cursor++; if(!(i in slots)) slots[i] = { current: initial }; return slots[i]; }
export function useState(initial){ const i = cursor++; if(!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
  const set = (next) => { slots[i] = typeof next === "function" ? next(slots[i]) : next; };
  return [slots[i], set]; }
export function useCallback(fn){ const i = cursor++; if(!(i in slots)) slots[i] = fn; return slots[i]; }
export function useEffect(fn){ cursor++; fn(); }
export function __slots(){ return slots; }`,
  );
  stub(
    "capiro-http.mjs",
    `export class CapiroApiError extends Error {
  constructor(message, status){ super(message); this.status = status; this.name = "CapiroApiError"; }
}`,
  );
  stub(
    "local-record-stub.mjs",
    `const store = new Map();
export function useLocalOnboardRecord(name){
  return [store.get(name), (value) => store.set(name, value)];
}
export function __reset(){ store.clear(); }`,
  );
  stub(
    "attempt-stub.mjs",
    `import { QueryClient } from "@tanstack/react-query";
import { createOnboardAttempt } from "./attempt-journal.mjs";
const cache = new QueryClient();
const instances = new Map();
export function useOnboardAttempt(api, name, current){
  let attempt = instances.get(name);
  if(!attempt){ attempt = createOnboardAttempt(cache, name, current); attempt.mount(); instances.set(name, attempt); }
  return { ...attempt, record: attempt.read(), locked: attempt.blocked() };
}
export function __reset(){ instances.clear(); cache.clear(); }
export function __records(){ return [...instances.values()].map((a) => a.read()); }`,
  );
  compile("src/features/onboard/lib/attempt-journal.ts", "attempt-journal.mjs");
  compile(
    "src/features/onboard/lib/import-request-intent.ts",
    "import-request-intent.mjs",
  );
  compile(
    "src/features/onboard/lib/import-client-selection.ts",
    "import-client-selection.mjs",
  );
  compile("src/features/onboard/lib/use-client-import.ts", "hook.mjs");
  hook = await import(path.join(dir, "hook.mjs"));
  reactStub = await import(path.join(dir, "react-stub.mjs"));
  attemptStub = await import(path.join(dir, "attempt-stub.mjs"));
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  reactStub.__reset();
  attemptStub.__reset();
  (globalThis as { window?: unknown }).window = {
    sessionStorage: memoryStorage(),
  };
});

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

const receipt = (n: number, jobId: string) => ({
  created: n,
  items: [],
  skipped: [],
  job: { id: jobId, requestId: `req-${jobId}`, status: "completed" },
});

const renderHook = (
  api: Parameters<typeof hook.useClientImport>[0],
  scope: { orgId: string | null; userId: string },
) => {
  reactStub.__render();
  return hook.useClientImport(api, scope);
};

const scopeA = { orgId: "org-a", userId: "user-1" };
const scopeB = { orgId: "org-b", userId: "user-1" };

describe("useClientImport production dispatch ordering", () => {
  it("dispatches the FIRST valid import exactly once", async () => {
    const calls: Array<{ ids: number[]; requestId: string }> = [];
    const api = {
      importClientChunk: async (ids: number[], requestId: string) => {
        calls.push({ ids, requestId });
        return receipt(ids.length, "job-1");
      },
    } as never;
    const importer = renderHook(api, scopeA);
    const result = await importer.run([11, 22]);
    expect(result.created).toBe(2);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.ids).toEqual([11, 22]);
    expect(calls[0]!.requestId).toMatch(/[0-9a-f-]{36}/);
    // Re-invoking the hook observes the committed state slot.
    const after = renderHook(api, scopeA);
    expect(after.lastJob?.id).toBe("job-1");
  });

  it("suppresses a late answer and the next chunk after an account switch", async () => {
    let release!: (value: unknown) => void;
    const calls: number[][] = [];
    const api = {
      importClientChunk: (ids: number[]) => {
        calls.push(ids);
        return new Promise((resolve) => {
          release = resolve;
        });
      },
    } as never;
    const ids = Array.from({ length: 150 }, (_, i) => i + 1);
    const importerA = renderHook(api, scopeA);
    const pending = importerA.run(ids);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    // Same component re-renders under account B while the chunk is in flight.
    const importerB = renderHook(api, scopeB);
    release(receipt(calls[0]!.length, "job-a"));
    await expect(pending).rejects.toMatchObject({
      name: "InterruptedImport",
      unknownRequestId: expect.any(String),
    });
    // The unacknowledged first chunk cannot be followed by the second chunk.
    expect(calls).toHaveLength(1);
    expect(importerB.lastJob).toBeNull();
    expect(importerB.retained?.requestId ?? null).toBeNull();
  });

  it("refuses dispatch with zero POST when identity cannot be retained", async () => {
    const importClientChunk = vi.fn(async () => receipt(1, "job-1"));
    const api = { importClientChunk } as never;
    (
      globalThis as { window?: { sessionStorage: Storage } }
    ).window!.sessionStorage.setItem = () => {
      throw new Error("quota");
    };
    const importer = renderHook(api, scopeA);
    await expect(importer.run([11])).rejects.toThrow(
      /could not retain the import request identity/,
    );
    expect(importClientChunk).not.toHaveBeenCalled();
    expect(attemptStub.__records()).toContainEqual(
      expect.objectContaining({ phase: "rejected" }),
    );
  });

  it("keeps an acknowledged first chunk when a later chunk is lost", async () => {
    const calls: number[][] = [];
    const api = {
      importClientChunk: async (ids: number[]) => {
        calls.push(ids);
        if (calls.length === 2) throw new Error("network lost");
        return receipt(ids.length, "job-1");
      },
    } as never;
    const ids = Array.from({ length: 150 }, (_, i) => i + 1);
    const importer = renderHook(api, scopeA);
    await expect(importer.run(ids)).rejects.toMatchObject({
      name: "InterruptedImport",
    });
    expect(calls).toHaveLength(2);
    const after = renderHook(api, scopeA);
    expect(after.lastJob?.id).toBe("job-1");
    expect(after.evidence?.unknownIds).toHaveLength(50);
    expect(after.retained?.ids).toHaveLength(50);
  });
});
