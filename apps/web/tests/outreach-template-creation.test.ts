import { describe, expect, it, vi } from "vitest";
import { createCapiroApi } from "../src/shared/capiro/http";
import { capiroOperations } from "../src/shared/capiro/registry";
import {
  classicOutreachTemplate,
  createClassicTemplateInput,
  createdClassicTemplate,
} from "../src/shared/capiro/operations/outreach-template-catalog";
import {
  createTemplateCreationOwner,
  templateCreationKey,
  type TemplateCreationState,
} from "../src/features/modules/engagement/outreach/template-creation";

const id = "10000000-0000-4000-8000-000000000001";
const input = {
  name: "Synthetic custom",
  prompt: "Use only the supplied synthetic context.",
  category: "general",
  tone: "professional",
  description: "Synthetic",
};
const row = {
  id,
  source: "user" as const,
  ...input,
  samplePreview: null,
  usageCount: 0,
};
const key = templateCreationKey("synthetic-tenant", "synthetic-user");
function store(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(key, initial);
  return {
    data,
    getItem: vi.fn((name: string) => data.get(name) ?? null),
    setItem: vi.fn((name: string, value: string) => {
      data.set(name, value);
    }),
    removeItem: vi.fn((name: string) => {
      data.delete(name);
    }),
  };
}
function setup(
  reply: (operation: string, options?: RequestInit) => Promise<Response>,
  storage = store(),
  ownerKey = key,
) {
  const calls: { operation: string; options?: RequestInit }[] = [];
  const fetcher = (async (url, options) => {
    const operation = String(url).split("/").at(-1)!.split("?")[0]!;
    calls.push({ operation, options });
    return reply(operation, options);
  }) as typeof fetch;
  const api = createCapiroApi(capiroOperations, { fetcher });
  const states: TemplateCreationState[] = [];
  const confirmed = vi.fn();
  const owner = createTemplateCreationOwner(
    api,
    storage,
    ownerKey,
    (state) => states.push(state),
    confirmed,
  );
  return { owner, calls, states, confirmed, storage, api };
}
const success = async (operation: string) =>
  Response.json(
    operation.endsWith(".create")
      ? { id, tenantId: "omitted", userId: "omitted", metadata: null }
      : [row],
  );
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("Classic contracts are distinct and bounded", () => {
  it("retains literal prompt/sample fields and accepts string system IDs", () => {
    const result = classicOutreachTemplate.parse({
      ...row,
      id: "system-policy",
      source: "system",
      samplePreview: "<script>inert</script>",
    });
    expect(result.prompt).toBe(input.prompt);
    expect(result.samplePreview).toBe("<script>inert</script>");
  });
  it("receives raw CREATE without fabricating source or retaining tenant/user/private extras", () => {
    expect(
      createdClassicTemplate.parse({
        id,
        tenantId: "private",
        userId: "private",
        metadata: { private: true },
      }),
    ).toEqual({ id });
    expect(classicOutreachTemplate.safeParse({ id }).success).toBe(false);
  });
  it.each([
    { source: "unknown" },
    { usageCount: -1 },
    { prompt: null },
    { samplePreview: 42 },
    { id: "" },
  ])("refuses malformed catalog fields %j", (patch) => {
    expect(
      classicOutreachTemplate.safeParse({ ...row, ...patch }).success,
    ).toBe(false);
  });
  it.each([
    { name: " " },
    { prompt: " " },
    { name: "x".repeat(121) },
    { prompt: "x".repeat(5001) },
    { description: "x".repeat(501) },
    { category: "x".repeat(51) },
    { tone: "x".repeat(51) },
    { tenantId: "forged" },
    { clientId: id },
    { requestKey: id },
  ])("rejects invalid or unauthorized input %j", (patch) => {
    expect(
      createClassicTemplateInput.safeParse({ ...input, ...patch }).success,
    ).toBe(false);
  });
  it("keeps Core's one-character prompt contract separate from the editor's guidance", () => {
    expect(
      createClassicTemplateInput.parse({ ...input, prompt: " x " }).prompt,
    ).toBe("x");
  });
});

describe("one explicit create and canonical catalog confirmation", () => {
  it("writes uncertainty before one POST, reads returned ID, selects only current user catalog row, and drops no secret fields into storage", async () => {
    const storage = store();
    const s = setup(async (operation) => {
      if (operation.endsWith(".create"))
        expect(JSON.parse(storage.data.get(key)!)).toEqual({
          version: 1,
          status: "unknown",
        });
      return success(operation);
    }, storage);
    await s.owner.create(input);
    expect(s.calls.map((call) => call.operation)).toEqual([
      "engagement.campaign.template.create",
      "engagement.campaign.templates",
    ]);
    expect(JSON.parse(String(s.calls[0]!.options!.body))).toEqual({
      body: input,
    });
    expect(s.confirmed).toHaveBeenCalledExactlyOnceWith(row);
    expect(s.states.at(-1)?.status).toBe("confirmed");
    expect(storage.data.size).toBe(0);
    expect(
      storage.setItem.mock.calls.every(
        ([, value]) =>
          !value.includes(input.prompt) && !value.includes(input.name),
      ),
    ).toBe(true);
    await s.owner.create(input);
    expect(s.calls).toHaveLength(2);
  });
  it("fences simultaneous submits even while the first response is unresolved", async () => {
    const held = deferred<Response>();
    const s = setup((operation) =>
      operation.endsWith(".create") ? held.promise : success(operation),
    );
    const running = s.owner.create(input);
    await s.owner.create(input);
    expect(s.calls).toHaveLength(1);
    held.resolve(Response.json({ id }));
    await running;
    expect(s.calls).toHaveLength(2);
  });
  it("does not dispatch invalid input", async () => {
    const s = setup(success);
    await s.owner.create({ ...input, name: "" });
    expect(s.calls).toHaveLength(0);
    expect(s.storage.data.size).toBe(0);
  });
  it.each(
    [
      [],
      [{ ...row, id: "20000000-0000-4000-8000-000000000002" }],
      [row, row],
      [{ ...row, source: "system" }],
      [row, { ...row, source: "system" }],
    ].map((catalog) => ({ catalog })),
  )(
    "retains the created ID without selecting a missing/wrong/ambiguous catalog result",
    async ({ catalog }) => {
      const s = setup(async (operation) =>
        Response.json(operation.endsWith(".create") ? { id } : catalog),
      );
      await s.owner.create(input);
      expect(s.states.at(-1)?.status).toBe("created");
      expect(s.confirmed).not.toHaveBeenCalled();
      expect(JSON.parse(s.storage.data.get(key)!)).toEqual({
        version: 1,
        status: "created",
        id,
      });
      await s.owner.create(input);
      expect(
        s.calls.filter((c) => c.operation.endsWith(".create")),
      ).toHaveLength(1);
    },
  );
  it("explicitly rechecks a known ID after reload using GET only", async () => {
    const s = setup(
      success,
      store(JSON.stringify({ version: 1, status: "created", id })),
    );
    expect(s.calls).toHaveLength(0);
    await s.owner.check();
    expect(s.calls.map((c) => c.operation)).toEqual([
      "engagement.campaign.templates",
    ]);
    expect(s.confirmed).toHaveBeenCalledOnce();
  });
  it.each(["transport", "malformed", "server500"])(
    "preserves %s uncertainty across close/reload and never recreates or guesses by name",
    async (failure) => {
      const storage = store();
      const s = setup(async () => {
        if (failure === "transport") throw new Error("Synthetic lost response");
        return failure === "malformed"
          ? Response.json({ id: "bad" })
          : Response.json(
              { message: "Synthetic uncertain server error" },
              { status: 500 },
            );
      }, storage);
      await s.owner.create(input);
      s.owner.dispose();
      const reopened = setup(success, storage);
      await reopened.owner.create(input);
      await reopened.owner.check();
      expect(reopened.states.at(-1)?.status).toBe("unknown");
      expect(reopened.calls).toHaveLength(0);
      expect(reopened.confirmed).not.toHaveBeenCalled();
    },
  );
  it("refuses definite authorization failure without treating it as a committed write or auto-retrying", async () => {
    const s = setup(async () =>
      Response.json({ message: "Denied" }, { status: 403 }),
    );
    await s.owner.create(input);
    expect(s.states.at(-1)?.status).toBe("ready");
    expect(s.storage.data.size).toBe(0);
    expect(s.calls).toHaveLength(1);
  });
  it("keeps known creation during readback failure, then performs only manual GET", async () => {
    let reads = 0;
    const s = setup(async (operation) =>
      operation.endsWith(".create")
        ? Response.json({ id })
        : ++reads === 1
          ? Response.json({ message: "Offline" }, { status: 503 })
          : Response.json([row]),
    );
    await s.owner.create(input);
    expect(s.states.at(-1)?.status).toBe("created");
    await s.owner.check();
    expect(s.confirmed).toHaveBeenCalledOnce();
    expect(s.calls.filter((c) => c.operation.endsWith(".create"))).toHaveLength(
      1,
    );
  });
  it.each(["post", "readback"])(
    "fences old actor completion during %s and retains its nonsecret marker",
    async (stage) => {
      const held = deferred<Response>();
      const s = setup(async (operation) =>
        (stage === "post" && operation.endsWith(".create")) ||
        (stage === "readback" && !operation.endsWith(".create"))
          ? held.promise
          : success(operation),
      );
      const running = s.owner.create(input);
      await vi.waitFor(() =>
        expect(s.calls).toHaveLength(stage === "post" ? 1 : 2),
      );
      s.owner.dispose();
      const before = s.states.length;
      held.resolve(Response.json(stage === "post" ? { id } : [row]));
      await running;
      expect(s.confirmed).not.toHaveBeenCalled();
      expect(s.states).toHaveLength(before);
      expect(s.storage.data.has(key)).toBe(true);
      const next = setup(
        success,
        s.storage,
        templateCreationKey("other-tenant", "other-user"),
      );
      expect(next.states.at(-1)?.status).toBe("ready");
      expect(next.calls).toHaveLength(0);
    },
  );
  it.each([
    "null",
    "{}",
    '{"version":2,"status":"unknown"}',
    '{"version":1,"status":"created","id":"bad"}',
    '{"version":1,"status":"unknown","extra":true}',
  ])("fails closed on malformed local marker %s", async (marker) => {
    const s = setup(success, store(marker));
    await s.owner.create(input);
    expect(s.states.at(-1)?.status).toBe("blocked");
    expect(s.calls).toHaveLength(0);
  });
  it("refuses creation when durable intent cannot be saved", async () => {
    const storage = store();
    storage.setItem.mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    const s = setup(success, storage);
    await s.owner.create(input);
    expect(s.calls).toHaveLength(0);
    expect(s.states.at(-1)?.status).toBe("blocked");
  });
});
