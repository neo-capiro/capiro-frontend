import { describe, expect, it } from "vitest";
import {
  ResearchPortfolioCreateIntent,
  ResearchPortfolioCreateStorageError,
  ResearchPortfolioPendingChangeError,
  type ResearchPortfolioCreateDraft,
} from "./create-intent";

const scope = { tenantId: "tenant-1", actorId: "actor-1" };
const draft: ResearchPortfolioCreateDraft = {
  name: "Synthetic portfolio",
  purpose: null,
  mode: "manual",
};
const ids = [
  "10000000-0000-4000-8000-000000000001",
  "10000000-0000-4000-8000-000000000002",
];
function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
}

describe("research portfolio create recovery", () => {
  it("persists before POST, restores the exact draft after reload, and replays a lost response", async () => {
    const storage = memoryStorage();
    let nextId = 0;
    const issueId = () => ids[nextId++]!;
    const first = new ResearchPortfolioCreateIntent(
      scope,
      () => storage,
      issueId,
    );
    const committed = new Map<string, string>();
    const bodies: Array<
      ResearchPortfolioCreateDraft & { idempotencyKey: string }
    > = [];
    let loseResponse = true;
    const send = async (body: (typeof bodies)[number]) => {
      expect(JSON.parse([...storage.entries.values()][0]!)).toMatchObject({
        state: "pending",
        body,
      });
      bodies.push(body);
      if (!committed.has(body.idempotencyKey))
        committed.set(body.idempotencyKey, `portfolio-${committed.size + 1}`);
      if (loseResponse) {
        loseResponse = false;
        throw new Error("Response lost after commit");
      }
      return committed.get(body.idempotencyKey)!;
    };

    await expect(first.submit(draft, send)).rejects.toThrow("Response lost");
    const afterReload = new ResearchPortfolioCreateIntent(
      scope,
      () => storage,
      issueId,
    );
    expect(afterReload.pendingDraft()).toEqual(draft);
    await expect(afterReload.submit(draft, send)).resolves.toBe("portfolio-1");
    expect(bodies).toEqual([
      { ...draft, idempotencyKey: ids[0] },
      { ...draft, idempotencyKey: ids[0] },
    ]);
    expect(committed.size).toBe(1);
    expect(JSON.parse([...storage.entries.values()][0]!).state).toBe(
      "confirmed",
    );
    expect(afterReload.pendingDraft()).toBeNull();
    await afterReload.submit({ ...draft, name: "New" }, send);
    expect(bodies[2]?.idempotencyKey).toBe(ids[1]);
  });

  it("holds changed details while the old result is unknown, then honors explicit abandonment", async () => {
    const storage = memoryStorage();
    let nextId = 0;
    const intent = new ResearchPortfolioCreateIntent(
      scope,
      () => storage,
      () => ids[nextId++]!,
    );
    const bodies: string[] = [];
    await expect(
      intent.submit(draft, async (body) => {
        bodies.push(body.idempotencyKey);
        throw new Error("Unknown result");
      }),
    ).rejects.toThrow("Unknown result");
    await expect(
      intent.submit({ ...draft, name: "Different" }, async () => {
        bodies.push("unexpected POST");
      }),
    ).rejects.toBeInstanceOf(ResearchPortfolioPendingChangeError);
    expect(bodies).toEqual([ids[0]]);
    expect(intent.pendingDraft()).toEqual(draft);
    intent.abandon();
    expect(intent.pendingDraft()).toBeNull();
    await intent.submit({ ...draft, name: "Different" }, async (body) => {
      bodies.push(body.idempotencyKey);
    });
    expect(bodies).toEqual(ids);
  });

  it("reuses the key for trimmed-equivalent or reverted details", async () => {
    const storage = memoryStorage();
    const intent = new ResearchPortfolioCreateIntent(
      scope,
      () => storage,
      () => ids[0]!,
    );
    const bodies: Array<
      ResearchPortfolioCreateDraft & { idempotencyKey: string }
    > = [];
    const lose = async (body: (typeof bodies)[number]) => {
      bodies.push(body);
      throw new Error("Unknown result");
    };
    await expect(
      intent.submit({ ...draft, name: "Acme" }, lose),
    ).rejects.toThrow();
    await expect(
      intent.submit({ ...draft, name: "Acme " }, lose),
    ).rejects.toThrow();
    let edited = { ...draft, name: "Changed" };
    edited = { ...edited, name: "Acme" };
    await intent.submit(edited, async (body) => {
      bodies.push(body);
    });
    expect(bodies).toEqual(
      Array.from({ length: 3 }, () => ({
        ...draft,
        name: "Acme",
        idempotencyKey: ids[0],
      })),
    );
  });

  it("isolates tenant and actor scopes and rejects a mismatched stored record", async () => {
    const storage = memoryStorage();
    const actorA = new ResearchPortfolioCreateIntent(
      scope,
      () => storage,
      () => ids[0]!,
    );
    await expect(
      actorA.submit(draft, async () => {
        throw new Error("Unknown result");
      }),
    ).rejects.toThrow();
    const actorB = new ResearchPortfolioCreateIntent(
      { ...scope, actorId: "actor-2" },
      () => storage,
      () => ids[1]!,
    );
    expect(actorB.pendingDraft()).toBeNull();
    await actorB.submit({ ...draft, name: "Other" }, async (body) => {
      expect(body.idempotencyKey).toBe(ids[1]);
    });
    expect(storage.entries.size).toBe(2);
    const [aKey, bKey] = [...storage.entries.keys()];
    storage.entries.set(bKey!, storage.entries.get(aKey!)!);
    expect(() => actorB.pendingDraft()).toThrow(
      ResearchPortfolioCreateStorageError,
    );
    expect(actorA.pendingDraft()).toEqual(draft);
  });

  it("does not POST when storage is corrupt or cannot verify a write", async () => {
    const storage = memoryStorage();
    const intent = new ResearchPortfolioCreateIntent(
      scope,
      () => storage,
      () => ids[0]!,
    );
    storage.entries.set(
      'capiro-research-portfolio-create-v1:["tenant-1","actor-1"]',
      "{broken",
    );
    let calls = 0;
    await expect(
      intent.submit(draft, async () => {
        calls++;
      }),
    ).rejects.toBeInstanceOf(ResearchPortfolioCreateStorageError);
    expect(calls).toBe(0);

    storage.entries.clear();
    const noWrite = {
      getItem: () => null,
      setItem: () => {},
    };
    const blocked = new ResearchPortfolioCreateIntent(
      scope,
      () => noWrite,
      () => ids[0]!,
    );
    await expect(
      blocked.submit(draft, async () => {
        calls++;
      }),
    ).rejects.toBeInstanceOf(ResearchPortfolioCreateStorageError);
    expect(calls).toBe(0);
  });

  it("blocks a second submit during an in-flight request", async () => {
    const storage = memoryStorage();
    const intent = new ResearchPortfolioCreateIntent(
      scope,
      () => storage,
      () => ids[0]!,
    );
    let resolve!: (value: string) => void;
    const pending = intent.submit(
      draft,
      () => new Promise<string>((done) => (resolve = done)),
    );
    expect(intent.busy).toBe(true);
    await expect(intent.submit(draft, async () => "duplicate")).rejects.toThrow(
      "already pending",
    );
    resolve("created");
    await expect(pending).resolves.toBe("created");
    expect(intent.busy).toBe(false);
  });
});
