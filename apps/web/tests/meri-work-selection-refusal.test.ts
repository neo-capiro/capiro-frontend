/**
 * The installed, immutable @capiro/meri-contracts 0.1.26 on this base supports application 0.3 /
 * input 1.2 / initial 1.2 / history 1.3. It predates the canonical work member, so every
 * work-bearing submit is refused at the canonical receiver and no work selection can be saved or
 * dispatched while that package is installed. This file is the counter-test to the source-stage
 * acceptance in tests/work-stage: it runs under the product vitest.config.ts, never an alias.
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
/** The successor's exact frozen definition, handed to the installed contract on purpose. */
const work = {
  entry: "start-work",
  jobKind: "research",
  deliverables: ["Current bill text", "Sponsor summary"],
  dependencies: ["Prior client briefing"],
};
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
// The installed typing has no work member; naming it here would restate the successor contract.
const asSelection = (value: unknown) => value as ConversationSkillSelection;
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

it("the installed package refuses every work-bearing submit at the canonical receiver", () => {
  for (const value of [
    { requestId: id(1), prompt: "Work brief", work },
    {
      requestId: id(1),
      prompt: "Work brief",
      work: { ...work, allowedTools: ["*"] },
    },
    {
      requestId: id(1),
      prompt: "Work brief",
      work: { entry: "delegate", jobKind: "scheduled", deliverables: [], dependencies: [] },
    },
  ])
    expect(() => receiveConversationInputRequest(bytes(value))).toThrow();
  // Ordinary fast chat is still admitted, so the refusal is about work, not the request shape.
  expect(
    receiveConversationInputRequest(
      bytes({ requestId: id(1), prompt: "Ordinary fast chat" }),
    ).prompt,
  ).toBe("Ordinary fast chat");
  // The receiver never admits a work member, so the local selected-input shell cannot hold one.
  expect(() => receiveSkillSelection({ work })).toThrow();
});

it("no work selection can be saved on the draft or dispatched while 0.1.26 is installed", async () => {
  const storage = memory(),
    owner = createInitialDraftOwner(scope, storage);
  owner.edit("Start the research");
  expect(() => owner.selectSkill(asSelection({ work }))).toThrow();
  expect(createInitialDraftOwner(scope, storage).selection()).toBeUndefined();
  expect(createInitialDraftOwner(scope, storage).draft()).toBe(
    "Start the research",
  );
  const cache = new QueryClient(),
    journal = conversationIntentJournal(cache, context);
  const submitInitial = vi.fn();
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
        asSelection({ work }),
      ),
    ).rejects.toThrow();
    // A locally refused proposal never dispatches and never writes the journal.
    expect(submitInitial).not.toHaveBeenCalled();
    expect(journal.read().submit).toBeUndefined();
    // The same funnel still sends ordinary chat exactly as before.
    await sendRequest(port, journal, "Ordinary fast chat", false, true);
    expect(submitInitial).toHaveBeenCalledTimes(1);
    expect(journal.read().submit?.prompt).toBe("Ordinary fast chat");
  } finally {
    cache.clear();
  }
});
