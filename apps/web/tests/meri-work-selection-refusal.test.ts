/**
 * Installed-contract acceptance for the canonical Start Work / Delegate definition — Wave5 W4 cohort.
 *
 * The physically installed, immutable @capiro/meri-contracts 0.1.27 on this base carries the
 * canonical closed `work` member (conversation-application 0.4 / conversation-input 1.3), so a
 * well-formed definition is admitted at the real receiver, retained by the selected-input shell and
 * dispatched through the one send funnel. Under the previous 0.1.26 cohort this file was the
 * counter-test that asserted the installed package refused every work-bearing submit; that evidence
 * is kept here against the member's own contract, because the installed package still refuses every
 * non-canonical one: an unknown entry or job kind, a missing member, an authority-bearing extra
 * member, a repeated, blank or over-long list entry, and a work member that is not an object. A
 * refused proposal is never saved, journaled or dispatched.
 */
import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { receiveConversationInputRequest } from "@capiro/meri-contracts/conversation-input";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";
import { sendRequest } from "../src/features/meri/conversation/run-commands";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import {
  conversationIntentJournal,
  receiveSkillSelection,
  type ConversationSkillSelection,
  type SelectedWork,
} from "../src/shared/meri-conversations/query-journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const scope = {
  tenantId: "synthetic",
  actorId: "actor",
  clientId: null,
  conversationId: id(1),
};
const context = { ...scope, selectedClientId: null, runId: id(2) };
/** The canonical definition itself, typed by the installed contract's own selected-work shape. */
const work: SelectedWork = {
  entry: "start-work",
  jobKind: "research",
  deliverables: ["Current bill text", "Sponsor summary"],
  dependencies: ["Prior client briefing"],
};
/** The same shape, but a definition the canonical receiver refuses: one deliverable listed twice. */
const repeatedDeliverable: SelectedWork = {
  ...work,
  deliverables: ["Current bill text", "Current bill text"],
};
const list = (count: number, text = "deliverable") =>
  Array.from({ length: count }, (_, index) => `${text} ${index}`);
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
/** The receiver's own decision on a whole submit, so the refusal cases read as one result each. */
function submitOutcome(value: unknown) {
  try {
    receiveConversationInputRequest(bytes(value));
  } catch {
    return "refused" as const;
  }
  return "admitted" as const;
}
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

it("admits the canonical work definition and refuses every non-canonical one", () => {
  // The definition this cohort submits is admitted whole, list order included; so is the other
  // entry/job-kind pair with no lists at all.
  const admitted = receiveConversationInputRequest(
    bytes({ requestId: id(1), prompt: "Work brief", work }),
  );
  expect(admitted.work).toEqual(work);
  expect(admitted.prompt).toBe("Work brief");
  expect(
    receiveConversationInputRequest(
      bytes({
        requestId: id(1),
        prompt: "Work brief",
        work: {
          entry: "delegate",
          jobKind: "scheduled",
          deliverables: [],
          dependencies: [],
        },
      }),
    ).work,
  ).toEqual({
    entry: "delegate",
    jobKind: "scheduled",
    deliverables: [],
    dependencies: [],
  });
  // The receiver's own boundary is 20 list entries of at most 200 characters.
  expect(
    submitOutcome({
      requestId: id(1),
      prompt: "Work brief",
      work: {
        ...work,
        deliverables: list(20),
        dependencies: list(20, "dependency"),
      },
    }),
  ).toBe("admitted");
  expect(
    submitOutcome({
      requestId: id(1),
      prompt: "Work brief",
      work: { ...work, deliverables: ["x".repeat(200)] },
    }),
  ).toBe("admitted");
  // Every non-canonical definition is refused by that same receiver, not by this file.
  const refused: Array<[string, unknown]> = [
    ["an unknown entry", { ...work, entry: "execute" }],
    ["an unknown job kind", { ...work, jobKind: "ops" }],
    [
      "a missing member",
      { entry: "start-work", jobKind: "research", deliverables: list(1) },
    ],
    ["an authority-bearing extra member", { ...work, allowedTools: ["*"] }],
    ["21 deliverables", { ...work, deliverables: list(21) }],
    ["one deliverable listed twice", repeatedDeliverable],
    ["a blank deliverable", { ...work, deliverables: ["   "] }],
    ["an over-long deliverable", { ...work, deliverables: ["x".repeat(201)] }],
    ["a non-text deliverable", { ...work, deliverables: [7] }],
    ["a work member that is not an object", "start-work"],
  ];
  for (const [name, value] of refused)
    expect(
      `${name}: ${submitOutcome({ requestId: id(1), prompt: "Work brief", work: value })}`,
    ).toBe(`${name}: refused`);
  // Ordinary fast chat is admitted exactly as before, so the refusals above are about the member.
  expect(
    receiveConversationInputRequest(
      bytes({ requestId: id(1), prompt: "Ordinary fast chat" }),
    ).prompt,
  ).toBe("Ordinary fast chat");
  // The local selected-input shell defers to that receiver: it holds the admitted definition and
  // refuses a non-canonical one, including an unknown key on the selection itself.
  expect(receiveSkillSelection({ work }).work).toEqual(work);
  expect(() => receiveSkillSelection({ work: repeatedDeliverable })).toThrow();
  expect(() => receiveSkillSelection({ work, allowedTools: ["*"] })).toThrow();
});

it("saves and dispatches a work selection and still refuses a non-canonical one end to end", async () => {
  const storage = memory(),
    owner = createInitialDraftOwner(scope, storage);
  owner.edit("Start the research");
  owner.selectSkill({ work });
  // The saved selection is the exact definition, frozen, and it survives a reload of the record.
  expect(owner.selection()).toEqual({ work });
  const restored = createInitialDraftOwner(scope, storage).selection()!;
  expect(restored).toEqual({ work });
  expect(Object.isFrozen(restored.work)).toBe(true);
  expect(Object.isFrozen(restored.work!.deliverables)).toBe(true);
  expect(Object.isFrozen(restored.work!.dependencies)).toBe(true);
  expect(createInitialDraftOwner(scope, storage).draft()).toBe(
    "Start the research",
  );
  // The exact ordered lists go through the one send funnel; the dispatched request is the canonical
  // one the public receiver admits, and the journal retains that same request.
  const dispatched: Array<Record<string, unknown>> = [];
  const submitInitial = vi.fn(async (request: Record<string, unknown>) => {
    dispatched.push(structuredClone(request));
  });
  const cache = new QueryClient(),
    journal = conversationIntentJournal(cache, context);
  try {
    await sendRequest(
      {
        submitInitial,
        getSnapshot: () => ({ submit: "idle" }),
      } as unknown as MeriConversationPort,
      journal,
      "Start the research",
      false,
      true,
      undefined,
      undefined,
      { work },
    );
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]!.work).toEqual(work);
    expect(receiveConversationInputRequest(bytes(dispatched[0]!)).work).toEqual(
      work,
    );
    expect(submitInitial).toHaveBeenCalledTimes(1);
    const retained = journal.read().submit!;
    expect(retained.prompt).toBe("Start the research");
    expect(retained.work).toEqual(work);
    expect(Object.isFrozen(retained.work)).toBe(true);
  } finally {
    cache.clear();
  }
  // A non-canonical definition is still refused end to end: the draft keeps no selection, and a
  // refused proposal is never journaled and never dispatched.
  const refusedStorage = memory(),
    refusedOwner = createInitialDraftOwner(scope, refusedStorage);
  refusedOwner.edit("Start the research");
  expect(() =>
    refusedOwner.selectSkill({ work: repeatedDeliverable }),
  ).toThrow();
  expect(createInitialDraftOwner(scope, refusedStorage).selection()).toBeUndefined();
  const refusedCache = new QueryClient(),
    refusedJournal = conversationIntentJournal(refusedCache, {
      ...context,
      runId: id(3),
    });
  const refusedSubmit = vi.fn();
  const refusedPort = {
    submitInitial: refusedSubmit,
    getSnapshot: () => ({ submit: "idle" }),
  } as unknown as MeriConversationPort;
  try {
    await expect(
      sendRequest(
        refusedPort,
        refusedJournal,
        "Start the research",
        false,
        true,
        undefined,
        undefined,
        { work: repeatedDeliverable } satisfies ConversationSkillSelection,
      ),
    ).rejects.toThrow();
    // A locally refused proposal never dispatches and never writes the journal.
    expect(refusedSubmit).not.toHaveBeenCalled();
    expect(refusedJournal.read().submit).toBeUndefined();
    // The same funnel still sends ordinary chat exactly as before.
    await sendRequest(
      refusedPort,
      refusedJournal,
      "Ordinary fast chat",
      false,
      true,
    );
    expect(refusedSubmit).toHaveBeenCalledTimes(1);
    expect(refusedJournal.read().submit?.prompt).toBe("Ordinary fast chat");
    expect(refusedJournal.read().submit).not.toHaveProperty("work");
  } finally {
    refusedCache.clear();
  }
});
