import { describe, expect, it } from "vitest";
import { CONVERSATION_SKILLS } from "@capiro/meri-contracts/conversation-application";
import {
  artifactStarterMessage,
  artifactStarterProblem,
  continueArtifactStarter,
  continueProfileStarter,
  emptyArtifactStarterDraft,
  meriHandoffDraftLimit,
  profileStarterDuplicate,
  profileStarterMessage,
  profileStarterPreflight,
  profileStarterPreflightProblem,
  profileStarterPreflightUnresolved,
  profileStarterProblem,
  writeStarterDraft,
} from "../src/shared/meri-starters";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";
import { clientHandoff } from "../src/shared/meri-conversations/client-handoff";
import {
  readFirstChatIntent,
  type FirstChatScope,
} from "../src/shared/meri-conversations/first-chat-intent";
import type { ConversationSkillSelection } from "../src/shared/meri-conversations/query-journal";
import {
  clearMeriConversationScope,
  syncMeriTabIdentity,
  tabRecord,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import type { FirstChatV2Request } from "../src/shared/capiro/operations/meri-first-chat";
import { clientSchema } from "../src/shared/session/client-contract";

// Synthetic only. No Core, provider, model or browser call is made here; the starters leave an
// unsent draft behind and the real receivers (client handoff journal, first-chat intent journal)
// are the ones exercised.
const tenantId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const clientId = "33333333-3333-4333-8333-333333333333";
const otherClientId = "44444444-4444-4444-8444-444444444444";
const conversationId = "55555555-5555-4555-8555-555555555555";
const generalScope: FirstChatScope = {
  tenantId,
  actorId,
  scopeKind: "general",
  clientId: null,
};
const resolved = {
  role: "permitted",
  capacity: "allowed",
  duplicate: "clear",
} as const;
const draftContext = {
  tenantId,
  actorId,
  selectedClientId: null,
  conversationId,
  runId: "77777777-7777-4777-8777-777777777777",
};
const submitRequest = {
  requestId: "a0000000-0000-4000-8000-00000000000a",
  prompt: "First question",
};
const catalogueSkill = CONVERSATION_SKILLS[0]!;
const skillSelection: ConversationSkillSelection = {
  skill: {
    skillId: catalogueSkill.skillId,
    skillVersion: catalogueSkill.version,
  },
  windowRequest: {
    basis: "explicit",
    startInclusive: "2026-10-31T04:00:00.000Z",
    endExclusive: "2026-11-02T05:00:00.000Z",
    timezone: "America/New_York",
  },
};

function intentStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

function tabStorage(): TabStorage {
  const values = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  syncMeriTabIdentity("synthetic-session", storage);
  return storage;
}

function generalReceipt(body: FirstChatV2Request) {
  return {
    schemaVersion: 2 as const,
    requestId: body.requestId,
    scopeKind: "general" as const,
    clientId: null,
    conversationId,
    tenantId,
    actorId,
  };
}

describe("artifact starter handoff", () => {
  it("labels the message as an unsent draft rather than a completed generation", () => {
    const message = artifactStarterMessage({
      title: "Weekly brief",
      format: "docx",
      body: "First paragraph",
    });
    expect(message).toContain('Draft a DOCX document titled "Weekly brief"');
    expect(message).toContain("Do not save or file it yet");
    expect(message).toContain("First paragraph");
  });

  it("bounds the whole handed-off draft at the receiver's real limit, not the editor body", () => {
    const base = { title: "Weekly brief", format: "txt" as const };
    const overhead =
      artifactStarterMessage({ ...base, body: "x" }).trim().length - 1;
    const atLimit = {
      ...base,
      body: "x".repeat(meriHandoffDraftLimit - overhead),
    };
    const overLimit = {
      ...base,
      body: "x".repeat(meriHandoffDraftLimit - overhead + 1),
    };
    expect(artifactStarterMessage(atLimit).trim()).toHaveLength(
      meriHandoffDraftLimit,
    );
    expect(artifactStarterProblem(atLimit)).toBeNull();
    expect(artifactStarterProblem(overLimit)).toMatch(/character limit/);

    const written: unknown[] = [];
    expect(() =>
      continueArtifactStarter({
        draft: overLimit,
        clientId,
        writeHandoff: (value) => void written.push(value),
      }),
    ).toThrow();
    expect(written).toEqual([]);
  });

  it("refuses a draft without a title", () => {
    expect(
      artifactStarterProblem({
        ...emptyArtifactStarterDraft(),
        title: "   ",
        body: "Body",
      }),
    ).toBe("Enter a document title.");
  });

  it("writes a client-bound handoff the real receiver admits, and never sends", () => {
    const storage = tabStorage();
    const account = { tenantId, actorId };
    const written: unknown[] = [];
    const handoff = continueArtifactStarter({
      draft: { title: "Weekly brief", format: "docx", body: "Draft body" },
      clientId,
      writeHandoff: (value) => {
        written.push(value);
        clientHandoff(account, storage).write(value);
      },
    });
    expect(written).toEqual([handoff]);
    expect(handoff).toEqual({
      clientId,
      draft: artifactStarterMessage({
        title: "Weekly brief",
        format: "docx",
        body: "Draft body",
      }),
    });
    // The real same-tab receiver reads it back for the same client and retires it for another.
    expect(clientHandoff(account, storage).receive(clientId)).toEqual(handoff);
    expect(
      clientHandoff(account, storage).receive(otherClientId),
    ).toBeUndefined();
  });
});

describe("profile starter preflight", () => {
  it("reports an unresolved owner as unknown instead of a clear preflight", () => {
    const preflight = profileStarterPreflight({
      permitted: true,
      capacity: { ready: false, allowed: false },
      clients: undefined,
      website: "https://acme.test",
    });
    expect(preflight).toEqual({
      role: "permitted",
      capacity: "unknown",
      duplicate: "unknown",
    });
    expect(profileStarterPreflightUnresolved(preflight)).toBe(true);
    // Unknown is not a refusal message; it is an unresolved state that still blocks the handoff.
    expect(profileStarterPreflightProblem(preflight)).toBeNull();
  });

  it("reports the owners' real allowance, denial and duplicate match", () => {
    expect(
      profileStarterPreflight({
        permitted: true,
        capacity: { ready: true, allowed: true },
        clients: [],
        website: "",
      }),
    ).toEqual({ role: "permitted", capacity: "allowed", duplicate: "clear" });
    expect(
      profileStarterPreflight({
        permitted: true,
        capacity: { ready: true, allowed: false },
        clients: [],
        website: "",
      }),
    ).toEqual({ role: "permitted", capacity: "denied", duplicate: "clear" });
    expect(
      profileStarterPreflight({
        permitted: false,
        capacity: { ready: true, allowed: true },
        clients: [],
        website: "",
      }),
    ).toEqual({ role: "denied", capacity: "allowed", duplicate: "clear" });
    expect(
      profileStarterPreflightUnresolved(
        profileStarterPreflight({
          permitted: true,
          capacity: { ready: true, allowed: true },
          clients: [],
          website: "",
        }),
      ),
    ).toBe(false);
  });

  it("compares the bare domain so a scheme, www or path cannot hide a duplicate", () => {
    const clients = [
      clientSchema.parse({
        id: clientId,
        name: "Acme",
        profileStatus: "active",
        status: "active",
        website: "https://www.Acme.test/legal",
      }),
    ];
    expect(profileStarterDuplicate("acme.test", clients)).toBe("possible");
    expect(profileStarterDuplicate("https://other.test", clients)).toBe(
      "clear",
    );
    // No website to compare is clear even before the roster loads; a real one is unknown.
    expect(profileStarterDuplicate("", undefined)).toBe("clear");
    expect(profileStarterDuplicate("https://acme.test", undefined)).toBe(
      "unknown",
    );
  });
});

describe("profile starter handoff", () => {
  it("leaves the message as an unsent draft and never creates the client", async () => {
    const storage = intentStorage();
    const bodies: FirstChatV2Request[] = [];
    const edits: Array<{ id: string; message: string }> = [];
    const seed = { website: "https://acme.test", notes: "Small supplier" };
    const result = await continueProfileStarter({
      seed,
      preflight: resolved,
      scope: generalScope,
      storage,
      signal: new AbortController().signal,
      createOrReuse: async (body) => {
        bodies.push(body);
        return generalReceipt(body);
      },
      editDraft: (id, message) => edits.push({ id, message }),
    });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      schemaVersion: 2,
      scopeKind: "general",
      clientId: null,
    });
    expect(result).toEqual({ conversationId });
    expect(edits).toEqual([
      { id: conversationId, message: profileStarterMessage(seed) },
    ]);
    expect(edits[0]!.message).toContain("Do not create the client yet");
    expect(readFirstChatIntent(generalScope, storage)).toMatchObject({
      state: "confirmed",
      conversationId,
    });
  });

  it("refuses to hand off while the preflight is still unknown", async () => {
    let created = 0;
    await expect(
      continueProfileStarter({
        seed: { notes: "Anything" },
        preflight: {
          role: "permitted",
          capacity: "unknown",
          duplicate: "unknown",
        },
        scope: generalScope,
        storage: intentStorage(),
        signal: new AbortController().signal,
        createOrReuse: async () => {
          created++;
          return {};
        },
        editDraft: () => undefined,
      }),
    ).rejects.toThrow(/still loading/);
    expect(created).toBe(0);
  });

  it("refuses a denial, an empty seed and a client scope before any request", async () => {
    const attempt = (
      overrides: Partial<Parameters<typeof continueProfileStarter>[0]>,
    ) => {
      let created = 0;
      const pending = continueProfileStarter({
        seed: { notes: "Anything" },
        preflight: resolved,
        scope: generalScope,
        storage: intentStorage(),
        signal: new AbortController().signal,
        createOrReuse: async () => {
          created++;
          return {};
        },
        editDraft: () => undefined,
        ...overrides,
      });
      return { pending, created: () => created };
    };
    const denied = attempt({
      preflight: { role: "permitted", capacity: "denied", duplicate: "clear" },
    });
    await expect(denied.pending).rejects.toThrow(/plan does not allow/);
    expect(denied.created()).toBe(0);
    const empty = attempt({ seed: {} });
    await expect(empty.pending).rejects.toThrow(/website or notes/);
    expect(empty.created()).toBe(0);
    const scoped = attempt({
      scope: { tenantId, actorId, clientId },
    });
    await expect(scoped.pending).rejects.toThrow(
      "Profile drafting starts in General scope.",
    );
    expect(scoped.created()).toBe(0);
  });

  it("stops before writing the draft when the pending request is cancelled", async () => {
    const storage = intentStorage();
    const controller = new AbortController();
    const edits: string[] = [];
    await expect(
      continueProfileStarter({
        seed: { notes: "Anything" },
        preflight: resolved,
        scope: generalScope,
        storage,
        signal: controller.signal,
        createOrReuse: async (body) => {
          controller.abort();
          return generalReceipt(body);
        },
        editDraft: (_id, message) => edits.push(message),
      }),
    ).rejects.toThrow();
    expect(edits).toEqual([]);
    // The reserved request identity survives as pending so a retry reuses it.
    expect(readFirstChatIntent(generalScope, storage)).toMatchObject({
      state: "pending",
    });
  });

  it("refuses a cancelled signal before any request is made", async () => {
    const controller = new AbortController();
    controller.abort();
    let created = 0;
    await expect(
      continueProfileStarter({
        seed: { notes: "Anything" },
        preflight: resolved,
        scope: generalScope,
        storage: intentStorage(),
        signal: controller.signal,
        createOrReuse: async () => {
          created++;
          return {};
        },
        editDraft: () => undefined,
      }),
    ).rejects.toThrow();
    expect(created).toBe(0);
  });

  it("refuses a seed with nothing to draft from", () => {
    expect(profileStarterProblem({})).toMatch(/website or notes/);
    expect(profileStarterProblem({ website: "not a website" })).toMatch(
      /valid website/,
    );
    expect(profileStarterProblem({ notes: "Small supplier" })).toBeNull();
  });
});

// The starter hands the draft to the canonical conversation owner, which now lives in
// shared/meri-conversations/initial-draft.ts. Every case below reads the result back through the
// forwarding feature path the mounted conversation actually uses, so the record shape, the
// forwarding export and the owner's refusal and fence rules are exercised together.
describe("starter draft handoff", () => {
  const scope = { tenantId, actorId, clientId: null, conversationId };

  it("leaves a draft the mounted conversation owner reads back, and sends nothing", () => {
    const storage = tabStorage();
    writeStarterDraft({ scope, draft: "Draft a profile", storage });
    const owner = createInitialDraftOwner(scope, storage);
    expect(owner.draft()).toBe("Draft a profile");
    expect(owner.revision()).toBe(1);
    expect(owner.error()).toBeUndefined();
  });

  it("keeps each conversation's draft on its own record", () => {
    const storage = tabStorage();
    const other = {
      ...scope,
      conversationId: "66666666-6666-4666-8666-666666666666",
    };
    writeStarterDraft({ scope, draft: "First conversation", storage });
    expect(createInitialDraftOwner(other, storage).draft()).toBe("");
    writeStarterDraft({ scope: other, draft: "Second conversation", storage });
    expect(createInitialDraftOwner(scope, storage).draft()).toBe(
      "First conversation",
    );
    expect(createInitialDraftOwner(other, storage).draft()).toBe(
      "Second conversation",
    );
    // A client-scoped conversation is a different record again.
    expect(
      createInitialDraftOwner({ ...scope, clientId }, storage).draft(),
    ).toBe("");
  });

  it("refuses to overwrite a draft the person already started", () => {
    const storage = tabStorage();
    const owner = createInitialDraftOwner(scope, storage);
    owner.edit("Something I typed");
    expect(() =>
      writeStarterDraft({ scope, draft: "Starter message", storage }),
    ).toThrow(/already holds an unsent draft/);
    expect(createInitialDraftOwner(scope, storage).draft()).toBe(
      "Something I typed",
    );
  });

  it("refuses a pending submission and leaves the capture untouched", () => {
    const storage = tabStorage();
    createInitialDraftOwner(scope, storage).begin(
      draftContext,
      submitRequest,
      "First question",
    );
    expect(() =>
      writeStarterDraft({ scope, draft: "Starter message", storage }),
    ).toThrow(/unresolved message/);
    const owner = createInitialDraftOwner(scope, storage);
    expect(owner.hasPending(draftContext)).toBe(true);
    expect(owner.draft()).toBe("");
    expect(owner.revision()).toBe(0);
  });

  it("refuses a reserved next-turn submission and leaves it bindable", () => {
    const storage = tabStorage();
    createInitialDraftOwner(scope, storage).reserve(
      "Next question",
      submitRequest,
    );
    expect(() =>
      writeStarterDraft({ scope, draft: "Starter message", storage }),
    ).toThrow(/unresolved message/);
    const owner = createInitialDraftOwner(scope, storage);
    expect(owner.draft()).toBe("");
    expect(owner.revision()).toBe(0);
    // The reservation still binds its own next turn instead of being replaced by the starter.
    owner.bindNext(draftContext, submitRequest);
    expect(owner.hasPending(draftContext)).toBe(true);
  });

  it("preserves a selection the person already made", () => {
    const storage = tabStorage();
    createInitialDraftOwner(scope, storage).selectSkill(skillSelection);
    const retained = createInitialDraftOwner(scope, storage).selection();
    expect(retained).toBeDefined();
    writeStarterDraft({ scope, draft: "Draft a profile", storage });
    const owner = createInitialDraftOwner(scope, storage);
    expect(owner.draft()).toBe("Draft a profile");
    expect(owner.selection()).toEqual(retained);
  });

  it("refuses a malformed stored record instead of replacing it", () => {
    // A well-formed envelope whose value does not match the owner's record shape.
    const wrongShape = tabStorage();
    tabRecord(scope, "draft", (value) => value, "", wrongShape).write({
      bogus: true,
    });
    // An empty record replaced by bytes that are not a decodable record at all.
    const undecodable = tabStorage();
    tabRecord(scope, "draft", (value) => value, "", undecodable).write({
      draft: "",
      revision: 0,
      pending: null,
      reserved: null,
    });
    const key = [...Array(undecodable.length).keys()]
      .map((index) => undecodable.key(index))
      .find((found) => found?.includes('"draft"'))!;
    expect(key).toBeDefined();
    undecodable.setItem(key, "{");

    for (const storage of [wrongShape, undecodable]) {
      expect(() =>
        writeStarterDraft({ scope, draft: "Starter message", storage }),
      ).toThrow();
      expect(createInitialDraftOwner(scope, storage).error()).toBeDefined();
    }
  });

  it("refuses to recreate a revoked conversation scope from a late write", () => {
    const storage = tabStorage();
    const live = createInitialDraftOwner(scope, storage);
    writeStarterDraft({ scope, draft: "Draft a profile", storage });
    clearMeriConversationScope(scope, storage);
    // The mounted owner that outlived the revocation must never restore the record.
    expect(live.error()).toBeDefined();
    expect(() => live.startUnsentStarter("Second attempt")).toThrow();
    expect(createInitialDraftOwner(scope, storage).draft()).toBe("");
  });

  it("reports an unusable tab instead of silently dropping the draft", () => {
    const refused = {
      get length() {
        return 0;
      },
      key: () => null,
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    } satisfies TabStorage;
    expect(() =>
      writeStarterDraft({ scope, draft: "Draft a profile", storage: refused }),
    ).toThrow();
  });

  it("keeps ordinary draft and recovery behaviour through the forwarding path", () => {
    const storage = tabStorage();
    createInitialDraftOwner(scope, storage).edit("Typed by hand");
    expect(createInitialDraftOwner(scope, storage).draft()).toBe(
      "Typed by hand",
    );
    const live = createInitialDraftOwner(scope, storage);
    live.begin(draftContext, submitRequest, "Typed by hand");
    expect(live.hasPending(draftContext)).toBe(true);
    // An unresolved submit retains the capture; the observed one consumes it exactly once.
    expect(
      live.acknowledge(
        draftContext,
        { ...submitRequest, state: "unknown" },
        "Typed by hand",
      ),
    ).toBe(false);
    expect(live.hasPending(draftContext)).toBe(true);
    expect(
      live.acknowledge(
        draftContext,
        { ...submitRequest, state: "observed" },
        "Typed by hand",
      ),
    ).toBe(true);
    expect(live.hasPending(draftContext)).toBe(false);
    expect(live.draft()).toBe("");
  });
});
