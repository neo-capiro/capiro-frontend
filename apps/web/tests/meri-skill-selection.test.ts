import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { CONVERSATION_SKILLS } from "@capiro/meri-contracts/conversation-application";
import { skillsForScope } from "../src/features/meri/conversation/SkillSelectionPicker";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import {
  conversationIntentJournal,
  type ConversationSkillSelection,
} from "../src/shared/meri-conversations/query-journal";
import {
  conversationTurnJournal,
  recoverConversationTurn,
} from "../src/shared/meri-conversations/turn-journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";
import { sendRequest } from "../src/features/meri/conversation/run-commands";

// Derive every selected identity from the installed public owner, never a second skill catalogue.
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
const skills = CONVERSATION_SKILLS.map((skill) => skill.skillId);
const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const scope = {
  tenantId: "synthetic",
  actorId: "actor",
  clientId: null,
  conversationId: id(1),
};
const context = { ...scope, selectedClientId: null, runId: id(2) };
const source = {
  ...context,
  attemptId: id(3),
  workerId: id(4),
  writerFence: 1,
};
function memory() {
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
const selected = (
  skillId: (typeof skills)[number],
): ConversationSkillSelection => ({
  skill: {
    skillId,
    skillVersion: CONVERSATION_SKILLS.find(
      (skill) => skill.skillId === skillId,
    )!.version,
  },
  windowRequest: {
    basis: "explicit",
    startInclusive: "2026-10-31T04:00:00.000Z",
    endExclusive: "2026-11-02T05:00:00.000Z",
    timezone: "America/New_York",
  },
});

it("covers all fourteen installed public skill identities", () =>
  expect(skills).toHaveLength(14));
it("scope choices cover all fourteen without assigning client tasks to General", () => {
  const client = skillsForScope(id(5)),
    general = skillsForScope(null);
  expect(
    new Set([...client, ...general].map((skill) => skill.skillId)).size,
  ).toBe(14);
  expect(client.every((skill) => skill.subjectKinds.includes("client"))).toBe(
    true,
  );
  expect(
    general.every((skill) =>
      skill.subjectKinds.some(
        (kind) => kind === "personal" || kind === "portfolio",
      ),
    ),
  ).toBe(true);
});
it("retains saved fiscal calendar and week semantics without deriving a replacement", () => {
  const storage = memory(),
    owner = createInitialDraftOwner(scope, storage);
  for (const windowRequest of [
    {
      basis: "fiscal-year" as const,
      year: 2026,
      calendarId: "federal",
      stage: "appropriated" as const,
      revisionId: "revision-one",
      timezone: "America/New_York",
    },
    {
      basis: "calendar-week" as const,
      offset: -1 as const,
      timezone: "America/New_York",
      weekStartsOn: "sunday" as const,
    },
  ]) {
    owner.selectSkill({ ...selected(skills[0]!), windowRequest });
    expect(
      createInitialDraftOwner(scope, storage).selection()?.windowRequest,
    ).toEqual(windowRequest);
  }
});

it.each(skills)(
  "initial %s freezes selection before dispatch and exact retry ignores changed draft options",
  async (skill) => {
    const cache = new QueryClient(),
      journal = conversationIntentJournal(cache, context),
      selection = selected(skill);
    const captured: ConversationSubmitRequest[] = [];
    const submitInitial = vi.fn(async (request: ConversationSubmitRequest) => {
      expect(journal.read().submit).toMatchObject(selection);
      captured.push(structuredClone(request));
      if (captured.length === 1) throw Error("lost response");
    });
    const port = {
      submitInitial,
      getSnapshot: () => ({ submit: "idle" }),
    } as unknown as MeriConversationPort;
    try {
      await expect(
        sendRequest(
          port,
          journal,
          "Explicit selected task",
          false,
          true,
          undefined,
          undefined,
          selection,
        ),
      ).rejects.toThrow("lost response");
      expect(Object.isFrozen(journal.read().submit!.skill)).toBe(true);
      expect(Object.isFrozen(journal.read().submit!.windowRequest)).toBe(true);
      await sendRequest(
        port,
        journal,
        "New draft",
        true,
        true,
        undefined,
        undefined,
        {},
      );
      expect(captured[1]).toEqual(captured[0]);
    } finally {
      cache.clear();
    }
  },
);

it.each(skills)(
  "%s draft and unknown follow-up retain exact version/window across reload and refuse changed intent",
  async (skill) => {
    const storage = memory(),
      cache = new QueryClient(),
      selection = selected(skill);
    const draft = createInitialDraftOwner(scope, storage);
    draft.edit("Unsent selected task");
    draft.selectSkill(selection);
    expect(createInitialDraftOwner(scope, storage).selection()).toEqual(
      selection,
    );
    const journal = conversationTurnJournal(
      cache,
      scope,
      null,
      scope.conversationId,
      storage,
    );
    journal.start(source, draft.draft(), id(5), undefined, selection);
    await expect(
      recoverConversationTurn(journal, async () => {
        throw Error("lost response");
      }),
    ).rejects.toThrow();
    cache.clear();
    const restoredCache = new QueryClient();
    try {
      const restored = conversationTurnJournal(
        restoredCache,
        scope,
        null,
        scope.conversationId,
        storage,
      );
      expect(restored.read()).toMatchObject({ ...selection, state: "unknown" });
      expect(
        restored.write({
          ...restored.read()!,
          skill: { ...selection.skill!, skillVersion: "2.0.0" },
        }),
      ).toBe(false);
      expect(
        restored.write({
          ...restored.read()!,
          windowRequest: { basis: "unbounded" },
        }),
      ).toBe(false);
      syncMeriTabIdentity("replacement-session", storage);
      expect(restored.current()).toBe(false);
      expect(
        createInitialDraftOwner(scope, storage).selection(),
      ).toBeUndefined();
    } finally {
      restoredCache.clear();
    }
  },
);

it("invalid selected identity cannot enter the persisted draft", () => {
  const storage = memory(),
    draft = createInitialDraftOwner(scope, storage);
  expect(() =>
    draft.selectSkill({
      skill: {
        skillId: "invented" as (typeof skills)[number],
        skillVersion: "1.0.0",
      },
      windowRequest: { basis: "unbounded" },
    }),
  ).toThrow();
  expect(createInitialDraftOwner(scope, storage).selection()).toBeUndefined();
});
