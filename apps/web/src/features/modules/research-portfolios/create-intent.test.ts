import { describe, expect, it } from "vitest";
import {
  ResearchPortfolioCreateIntent,
  type ResearchPortfolioCreateDraft,
} from "./create-intent";

const draft: ResearchPortfolioCreateDraft = {
  name: "Synthetic portfolio",
  purpose: null,
  mode: "manual",
};

describe("research portfolio create intent", () => {
  it("replays one committed create after a lost response, including after dialog close and reopen", async () => {
    let keyCount = 0;
    const intent = new ResearchPortfolioCreateIntent(() => `key-${++keyCount}`);
    const committed = new Map<string, string>();
    const bodies: Array<
      ResearchPortfolioCreateDraft & { idempotencyKey: string }
    > = [];
    let loseResponse = true;
    const send = async (body: (typeof bodies)[number]) => {
      bodies.push(body);
      if (!committed.has(body.idempotencyKey))
        committed.set(body.idempotencyKey, `portfolio-${committed.size + 1}`);
      if (loseResponse) {
        loseResponse = false;
        throw new Error("Response lost after commit");
      }
      return committed.get(body.idempotencyKey);
    };

    await expect(intent.submit(draft, send)).rejects.toThrow("Response lost");
    expect(intent.busy).toBe(false);
    // Closing and reopening an idle dialog does not change the pending intent.
    await expect(intent.submit(draft, send)).resolves.toBe("portfolio-1");
    expect(bodies).toEqual([
      { ...draft, idempotencyKey: "key-1" },
      { ...draft, idempotencyKey: "key-1" },
    ]);
    expect(committed.size).toBe(1);
    expect(keyCount).toBe(1);
  });

  it("keeps the key for trimmed-equivalent names and an edit reverted before retry", async () => {
    let keyCount = 0;
    const intent = new ResearchPortfolioCreateIntent(() => `key-${++keyCount}`);
    const bodies: Array<
      ResearchPortfolioCreateDraft & { idempotencyKey: string }
    > = [];
    const loseResponse = async (body: (typeof bodies)[number]) => {
      bodies.push(body);
      throw new Error("Response lost");
    };
    await expect(
      intent.submit({ ...draft, name: "Acme" }, loseResponse),
    ).rejects.toThrow("Response lost");
    await expect(
      intent.submit({ ...draft, name: "Acme " }, loseResponse),
    ).rejects.toThrow("Response lost");
    let edited = { ...draft, name: "Changed" };
    edited = { ...edited, name: "Acme" };
    await intent.submit(edited, async (body) => {
      bodies.push(body);
      return "created";
    });
    expect(bodies).toEqual(
      Array.from({ length: 3 }, () => ({
        ...draft,
        name: "Acme",
        idempotencyKey: "key-1",
      })),
    );
    expect(keyCount).toBe(1);
  });

  it("rotates when the submitted normalized body changes and after success", async () => {
    let keyCount = 0;
    const intent = new ResearchPortfolioCreateIntent(() => `key-${++keyCount}`);
    const keys: string[] = [];
    const fail = async (body: { idempotencyKey: string }) => {
      keys.push(body.idempotencyKey);
      throw new Error("Unknown result");
    };

    await expect(intent.submit(draft, fail)).rejects.toThrow("Unknown result");
    await intent.submit({ ...draft, name: "Changed" }, async (body) => {
      keys.push(body.idempotencyKey);
      return "created";
    });
    await intent.submit({ ...draft, name: "Next" }, async (body) => {
      keys.push(body.idempotencyKey);
      return "created again";
    });
    expect(keys).toEqual(["key-1", "key-2", "key-3"]);
  });

  it("holds the in-flight intent against a second submit", async () => {
    const intent = new ResearchPortfolioCreateIntent(() => "key-1");
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
