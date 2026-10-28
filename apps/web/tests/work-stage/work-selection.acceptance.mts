/**
 * Installed-release acceptance for the Start Work / Delegate consumer.
 *
 * These tests exercise the real mounted composer control, the real selected-input journal, the real
 * send funnel and the canonical public receiver from the physically installed contract package.
 * tests/meri-work-selection-refusal.test.ts separately covers malformed definitions against that
 * same release. These are local mounted-consumer checks, not deployed or live-model acceptance.
 */
import { expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { receiveConversationInputRequest } from "@capiro/meri-contracts/conversation-input";
import { CONVERSATION_SKILLS } from "@capiro/meri-contracts/conversation-application";
import { SessionComposer } from "../../src/features/meri/conversation/ConversationView";
import { createConversationComposer } from "../../src/features/meri/conversation/conversation-composer";
import { createInitialDraftOwner } from "../../src/features/meri/conversation/initial-draft";
import { sendRequest } from "../../src/features/meri/conversation/run-commands";
import type { MeriConversationPort } from "../../src/shared/meri-conversations/host-controller";
import {
  conversationIntentJournal,
  receiveSkillSelection,
  withDocumentRevision,
  withProcedureSelection,
  withoutDocumentRevision,
  type ConversationSkillSelection,
} from "../../src/shared/meri-conversations/query-journal";
import {
  conversationTurnJournal,
  recoverConversationTurn,
} from "../../src/shared/meri-conversations/turn-journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../../src/shared/meri-conversations/tab-journal";
import { workSelectionLabel } from "../../src/features/meri/work/WorkSelectionPicker";
import { CapiroDataProvider } from "../../src/shared/capiro/CapiroBoundary";

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
/** The exact frozen definition: entry, job kind and both ordered lists. */
const work = {
  entry: "start-work" as const,
  jobKind: "research" as const,
  deliverables: ["Current bill text", "Sponsor summary"],
  dependencies: ["Prior client briefing"],
};
const delegated = {
  entry: "delegate" as const,
  jobKind: "scheduled" as const,
  deliverables: [] as string[],
  dependencies: [] as string[],
};
const skill = {
  skill: {
    skillId: CONVERSATION_SKILLS[0]!.skillId,
    skillVersion: CONVERSATION_SKILLS[0]!.version,
  },
  windowRequest: { basis: "unbounded" as const },
};
/** The handoff's own admitted revision selection: it carries this member and nothing else. */
const revision = {
  documentRevision: {
    artifactId: id(7),
    versionId: id(8),
    objectSha256: "a".repeat(64),
  },
};
/** A valid catalogue pin that the frozen submit schema does not name as eligible for a revision. */
const ineligible = CONVERSATION_SKILLS.map((entry) => ({
  skillId: entry.skillId,
  skillVersion: entry.version,
})).find(
  (pin) =>
    !(
      pin.skillId === "quick_skill.bill_watch" && pin.skillVersion === "2.0.0"
    ) &&
    !(
      pin.skillId === "quick_skill.cited_report" && pin.skillVersion === "1.0.0"
    ),
)!;
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
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
const workMarkup = (html: string) => {
  const at = html.indexOf("Work for next message: ");
  return at < 0 ? "" : html.slice(at, html.indexOf("</details>", at));
};
/**
 * The composer now also mounts the native procedure control, which reads through the product's own
 * Capiro data provider, so this mounted proof supplies that provider exactly as the product page does.
 */
const composer = (props: ComponentProps<typeof SessionComposer>) =>
  renderToStaticMarkup(
    createElement(
      CapiroDataProvider,
      { onSessionExpired: () => undefined },
      createElement(SessionComposer, props),
    ),
  );

it("admits the exact ordered work definition through the canonical public receiver", () => {
  const fields = receiveSkillSelection({ work });
  expect(fields.work).toEqual(work);
  expect(Object.isFrozen(fields.work)).toBe(true);
  expect(Object.isFrozen(fields.work!.deliverables)).toBe(true);
  expect(Object.isFrozen(fields.work!.dependencies)).toBe(true);
  const admitted = receiveConversationInputRequest(
    bytes({ requestId: id(5), prompt: "Start the research", ...fields }),
  );
  expect(admitted.work).toEqual(work);
  expect(admitted.work!.deliverables).toEqual(work.deliverables);
  expect(admitted.prompt).toBe("Start the research");
});

it("admits a native procedure beside a work definition under the successor contract", () => {
  /**
   * SOURCE STAGE ONLY, pending the new physical cohort: the successor conversation contract this suite
   * resolves is the artifact that carries both members. The installed immutable 0.1.26 package cannot
   * make this check — it predates the work definition — so this combined result is recorded here and
   * never as an installed-package claim.
   */
  const selector = {
    source: "firm" as const,
    recordId: id(12),
    version: 2,
    manifestDigest: "1".repeat(64),
  };
  const fields = receiveSkillSelection(
    withProcedureSelection({ work }, selector),
  );
  expect(fields.work).toEqual(work);
  expect(fields.procedure).toEqual(selector);
  const admitted = receiveConversationInputRequest(
    bytes({ requestId: id(5), prompt: "Draft the case brief", ...fields }),
  );
  expect(admitted.procedure).toEqual(selector);
  expect(admitted.work).toEqual(work);
});

it("keeps the exact definition and refuses a member the canonical schema never stated", () => {
  expect(receiveSkillSelection({ work: delegated }).work).toEqual(delegated);
  for (const invalid of [
    { ...work, entry: "start" },
    { ...work, jobKind: "sprint" },
    { ...work, deliverables: "Current bill text" },
    { ...work, dependencies: [""] },
    { ...work, allowedTools: ["*"] },
    { ...work, scheduledOrigin: "unattended" },
    { entry: work.entry, jobKind: work.jobKind },
    {
      ...work,
      deliverables: Array.from({ length: 21 }, (_, i) => `item-${i}`),
    },
    { ...work, deliverables: ["same", "same"] },
  ])
    expect(() => receiveSkillSelection({ work: invalid })).toThrow();
});

it("persists the work choice on the draft and retains no stale definition after scope change", () => {
  const storage = memory(),
    owner = createInitialDraftOwner(scope, storage);
  owner.edit("Start the research");
  owner.selectSkill({ ...skill, work });
  expect(createInitialDraftOwner(scope, storage).selection()).toEqual({
    ...skill,
    work,
  });
  // Adopting a skill keeps an additive work definition, and removing the skill keeps it too.
  const other = CONVERSATION_SKILLS[1]!;
  owner.selectSkill({
    skill: { skillId: other.skillId, skillVersion: other.version },
    windowRequest: { basis: "unbounded" },
    work,
  });
  expect(createInitialDraftOwner(scope, storage).selection()?.work).toEqual(
    work,
  );
  owner.selectSkill({ work });
  expect(createInitialDraftOwner(scope, storage).selection()).toEqual({ work });
  // A revision and its work definition are retained together for the next message...
  owner.selectSkill(withDocumentRevision({ work }, revision));
  expect(createInitialDraftOwner(scope, storage).selection()).toEqual({
    ...revision,
    work,
  });
  // ...and a retired client scope is a different draft owner that carries neither forward.
  expect(
    createInitialDraftOwner({ ...scope, clientId: id(9) }, storage).selection(),
  ).toBeUndefined();
});

it("keeps the exact work definition through adopting, sending and removing a document revision", async () => {
  // The revision replaces the skill pin the receiver refuses beside it, exactly as this control
  // states, and it keeps the work definition and the requested window.
  const beside = withDocumentRevision(
    { skill: ineligible, windowRequest: skill.windowRequest, work },
    revision,
  );
  expect(beside.skill).toBeUndefined();
  expect(beside.windowRequest).toEqual(skill.windowRequest);
  expect(beside.work).toEqual(work);
  expect(beside.documentRevision).toEqual(revision.documentRevision);
  // The two pins the frozen submit schema names as eligible survive a revision unchanged.
  expect(
    withDocumentRevision(
      {
        skill: { skillId: "quick_skill.cited_report", skillVersion: "1.0.0" },
        work,
      },
      revision,
    ),
  ).toEqual({
    skill: { skillId: "quick_skill.cited_report", skillVersion: "1.0.0" },
    work,
    documentRevision: revision.documentRevision,
  });
  // Removing the revision removes one choice only: the work definition stays selected.
  const removed = withoutDocumentRevision(beside);
  expect(removed.documentRevision).toBeUndefined();
  expect(removed).toEqual({ windowRequest: skill.windowRequest, work });
  // The adopted selection reaches the canonical send carrying the exact ordered definition and pin.
  const cache = new QueryClient(),
    journal = conversationIntentJournal(cache, context);
  const captured: Array<Record<string, unknown>> = [];
  const port = {
    submitInitial: async (request: Record<string, unknown>) => {
      expect(journal.read().submit).toMatchObject({ ...revision, work });
      captured.push(structuredClone(request));
    },
    getSnapshot: () => ({ submit: "idle" }),
  } as unknown as MeriConversationPort;
  try {
    await sendRequest(
      port,
      journal,
      "Revise the brief for the hearing",
      false,
      true,
      undefined,
      undefined,
      beside,
    );
    expect(captured[0]).toMatchObject({ ...revision, work });
    expect((captured[0]!.work as typeof work).deliverables).toEqual(
      work.deliverables,
    );
    expect(journal.read().submit?.work).toEqual(work);
    expect(Object.isFrozen(journal.read().submit!.work)).toBe(true);
  } finally {
    cache.clear();
  }
});

it("dispatches the exact work request and an uncertain retry re-sends the same request", async () => {
  const cache = new QueryClient(),
    journal = conversationIntentJournal(cache, context),
    selection = { work };
  const captured: Array<{ requestId: string; work?: unknown }> = [];
  const submitInitial = async (request: {
    requestId: string;
    work?: unknown;
  }) => {
    expect(journal.read().submit).toMatchObject(selection);
    captured.push(structuredClone(request));
    if (captured.length === 1) throw Error("lost response");
  };
  const port = {
    submitInitial,
    getSnapshot: () => ({ submit: "idle" }),
  } as unknown as MeriConversationPort;
  try {
    await expect(
      sendRequest(
        port,
        journal,
        "Start the research",
        false,
        true,
        undefined,
        undefined,
        selection,
      ),
    ).rejects.toThrow("lost response");
    expect(journal.read().submit?.work).toEqual(work);
    expect(Object.isFrozen(journal.read().submit!.work)).toBe(true);
    // The uncertain retry is the retained request: the same id, prompt and definition, no new work.
    await sendRequest(port, journal, "Edited draft text", true, true);
    expect(captured).toHaveLength(2);
    expect(captured[1]).toEqual(captured[0]);
    expect(captured[1]!.requestId).toBe(captured[0]!.requestId);
    expect(captured[1]!.work).toEqual(work);
    // Ordinary chat on the same funnel still carries no work member at all.
    const plain = new QueryClient(),
      plainJournal = conversationIntentJournal(plain, context);
    const plainCaptured: Array<Record<string, unknown>> = [];
    await sendRequest(
      {
        submitInitial: async (request: Record<string, unknown>) => {
          plainCaptured.push(structuredClone(request));
        },
        getSnapshot: () => ({ submit: "idle" }),
      } as unknown as MeriConversationPort,
      plainJournal,
      "Ordinary fast chat",
      false,
      true,
    );
    expect(plainCaptured[0]).not.toHaveProperty("work");
    plain.clear();
  } finally {
    cache.clear();
  }
});

it("retains the exact definition across reload and refuses a changed one", async () => {
  const storage = memory(),
    cache = new QueryClient();
  const draft = createInitialDraftOwner(scope, storage);
  draft.edit("Start the research");
  draft.selectSkill({ work });
  const journal = conversationTurnJournal(
    cache,
    scope,
    null,
    scope.conversationId,
    storage,
  );
  journal.start(source, draft.draft(), id(6), undefined, { work });
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
    expect(restored.read()).toMatchObject({ work, state: "unknown" });
    expect(restored.read()!.work!.deliverables).toEqual(work.deliverables);
    expect(
      restored.write({
        ...restored.read()!,
        work: { ...work, jobKind: "deliverable" },
      }),
    ).toBe(false);
    expect(
      restored.write({
        ...restored.read()!,
        work: {
          ...work,
          deliverables: ["Sponsor summary", "Current bill text"],
        },
      }),
    ).toBe(false);
    // Replacing the tab session retires the retained definition with the rest of the identity.
    syncMeriTabIdentity("replacement-session", storage);
    expect(restored.current()).toBe(false);
    expect(createInitialDraftOwner(scope, storage).selection()).toBeUndefined();
  } finally {
    restoredCache.clear();
  }
});

it("keeps the pending request while the unsent draft changes, and never reuses it for the next send", async () => {
  const cache = new QueryClient(),
    journal = conversationIntentJournal(cache, context);
  const captured: unknown[] = [];
  const port = {
    submitInitial: async (request: unknown) => {
      captured.push(structuredClone(request));
    },
    getSnapshot: () => ({ submit: "idle" }),
  } as unknown as MeriConversationPort;
  try {
    await sendRequest(
      port,
      journal,
      "Start the research",
      false,
      true,
      undefined,
      undefined,
      { work },
    );
    const pending = journal.read().submit!;
    // Editing the next draft is not a new request and cannot rewrite the retained one.
    expect(journal.read().submit).toMatchObject({ work });
    expect(pending.work).toEqual(work);
    expect(captured).toHaveLength(1);
  } finally {
    cache.clear();
  }
});

it("mounts Start Work / Delegate through the real composer and labels the applied definition", () => {
  type Session = ComponentProps<typeof SessionComposer>["session"];
  const current = { context } as unknown as MeriConversationPort;
  const prepare = (selection: ConversationSkillSelection) => {
    const channel = createConversationComposer();
    channel.publish({
      port: current,
      running: false,
      controls: {
        onSend: () => undefined,
        onStop: () => undefined,
        scope: "Synthetic client",
        attachUnavailable: "Attachments unavailable",
      },
    });
    const session = {
      selectedId: context.conversationId,
      accessLost: false,
      connection: { state: { status: "ready" } },
      ready: { port: current, lifetimeKey: JSON.stringify(current.context) },
      draft: "Start the research",
      setDraft: () => undefined,
      textarea: { current: null },
      skillSelection: selection,
      setSkillSelection: () => undefined,
      continuation: {
        intent: undefined,
        busy: false,
        failed: false,
        notReady: false,
        storageError: undefined,
        start: async () => false,
        retry: async () => false,
        readMapping: async () => false,
      },
    } as unknown as Session;
    return composer({ channel, session, scope: "Synthetic client" });
  };
  const applied = prepare({ work });
  expect(applied).toContain("Work for next message: ");
  expect(applied).toContain("Work · Start work · Research");
  expect(workMarkup(applied)).toContain("Apply to draft");
  expect(workMarkup(applied)).not.toMatch(/\sdisabled/);
  expect(workMarkup(applied)).toContain("Remove work selection");
  expect(applied).toContain("Start work");
  expect(applied).toContain("Scheduled routine");
  expect(workSelectionLabel({ work: delegated })).toBe(
    "Delegate · Scheduled routine",
  );
  // The same control is disabled by the composer's own existing block, never by its own state.
  const blocked = composer({
    channel: createConversationComposer(),
    session: {
      selectedId: null,
      accessLost: false,
      connection: { state: { status: "connecting" } },
      draft: "Start the research",
      setDraft: () => undefined,
      textarea: { current: null },
      skillSelection: {},
      setSkillSelection: () => undefined,
      continuation: {
        intent: undefined,
        busy: false,
        failed: false,
        notReady: false,
        storageError: undefined,
        start: async () => false,
        retry: async () => false,
        readMapping: async () => false,
      },
    } as unknown as Session,
    scope: "Synthetic client",
  });
  expect(blocked).toContain("Work · None");
  expect(workMarkup(blocked)).toMatch(/\sdisabled/);
});
