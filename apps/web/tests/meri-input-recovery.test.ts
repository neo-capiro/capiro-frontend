import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  conversationIntentJournal,
  storedSubmission,
} from "../src/shared/meri-conversations/query-journal";
import { recoverRequest } from "../src/features/meri/conversation/run-commands";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";

const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
  conversationId: "20000000-0000-4000-8000-000000000002",
  runId: "30000000-0000-4000-8000-000000000003",
};
const stored = {
  requestId: "40000000-0000-4000-8000-000000000004",
  prompt: "Synthetic retained input",
  windowRequest: {
    basis: "calendar-month" as const,
    offset: 0 as const,
    timezone: "UTC",
  },
  window: {
    basis: "calendar-month" as const,
    startInclusive: "2026-10-01T00:00:00Z",
    endExclusive: "2026-11-01T00:00:00Z",
    timezone: "UTC",
    weekStartsOn: null,
  },
  skill: {
    skillId: "quick_skill.research_company" as const,
    skillVersion: "1.0.0",
    manifestSha256: "a".repeat(64),
    proseSha256: "b".repeat(64),
    catalogSha256: "c".repeat(64),
  },
};

it("synthetic stored recovery retains original requested window and only canonical skill selection", () => {
  expect(storedSubmission(stored)).toEqual({
    requestId: stored.requestId,
    prompt: stored.prompt,
    windowRequest: stored.windowRequest,
    skill: {
      skillId: stored.skill.skillId,
      skillVersion: stored.skill.skillVersion,
    },
  });
  expect(
    storedSubmission({
      ...stored,
      windowRequest: null,
      window: null,
      skill: null,
    }),
  ).toEqual({ requestId: stored.requestId, prompt: stored.prompt });
});

it("synthetic scope journal snapshots full nested request before dispatch and refuses replaced ownership", () => {
  const cache = new QueryClient(),
    journal = conversationIntentJournal(cache, context);
  const input = structuredClone({
    ...storedSubmission(stored),
    state: "pending" as const,
  });
  expect(journal.write({ submit: input })).toBe(true);
  if (input.windowRequest?.basis !== "calendar-month")
    throw new Error("Synthetic month expected");
  input.windowRequest.timezone = "America/New_York";
  expect(journal.read().submit!.windowRequest).toEqual(stored.windowRequest);
  expect(Object.isFrozen(journal.read().submit!.windowRequest)).toBe(true);
  cache.clear();
  expect(journal.current()).toBe(false);
  expect(journal.write({ submit: input })).toBe(false);
  expect(cache.getQueryCache().getAll()).toHaveLength(0);
});

it("synthetic positive recovery records complete DTO before the existing SDK receives exact bytes", async () => {
  const cache = new QueryClient(),
    journal = conversationIntentJournal(cache, context);
  const submit = vi.fn(async (input: ConversationSubmitRequest) => {
    expect(journal.read().submit).toEqual({ ...input, state: "unknown" });
    expect(input).toEqual(storedSubmission(stored));
    expect(input).not.toHaveProperty("state");
  });
  const port = {
    submit,
    getSnapshot: () => ({ submit: "idle" }),
  } as unknown as MeriConversationPort;
  await recoverRequest(port, journal, stored);
  expect(submit).toHaveBeenCalledOnce();
  expect(journal.read().submit!.state).toBe("observed");
  cache.clear();
});

it("synthetic recovery refuses changed accepted identity without dispatch or replacing retained input", async () => {
  const cache = new QueryClient(),
    journal = conversationIntentJournal(cache, context);
  journal.write({ submit: { ...storedSubmission(stored), state: "unknown" } });
  const submit = vi.fn();
  const port = { submit } as unknown as MeriConversationPort;
  await expect(
    recoverRequest(port, journal, {
      ...stored,
      windowRequest: { ...stored.windowRequest, offset: -1 },
    }),
  ).rejects.toMatchObject({ code: "retained-submit-mismatch" });
  expect(submit).not.toHaveBeenCalled();
  expect(journal.read().submit!.windowRequest).toEqual(stored.windowRequest);
  cache.clear();
});
