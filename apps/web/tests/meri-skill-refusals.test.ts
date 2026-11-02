import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import {
  describeSkillRefusal,
  skillRefusal,
  sourceName,
} from "../src/features/meri/conversation/skill-refusal";
import { describeRunFailure } from "../src/features/meri/conversation/run-failure";
import { sendRequest } from "../src/features/meri/conversation/run-commands";
import { composerAvailability } from "../src/features/meri/conversation/MeriLiveConversation";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import { conversationIntentJournal } from "../src/shared/meri-conversations/query-journal";
import { createInitialDraftOwner } from "../src/shared/meri-conversations/initial-draft";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import type { useLiveRun } from "../src/features/meri/conversation/useLiveRun";

const buttons = vi.hoisted(
  () => [] as Array<{ onClick: () => void; children: ReactNode }>,
);
vi.mock("@capiro/ui/button", () => ({
  Button: (props: { onClick: () => void; children: ReactNode }) => {
    buttons.push(props);
    return createElement("button", { onClick: props.onClick }, props.children);
  },
}));
vi.mock("../src/features/meri/conversation/ConversationPanels", () => ({
  ConversationPanels: () => null,
}));
beforeEach(() => {
  buttons.length = 0;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const scopeRefused = new ConversationUnavailable("SKILL_SCOPE_REFUSED", 400, {
  requiredScope: "client",
});
const sourcesRefused = new ConversationUnavailable(
  "SKILL_SOURCES_UNAVAILABLE",
  400,
  { sources: ["mail", "research_portfolios", "custom_feed"] },
);

it("classifies only the two typed 400 refusals, with their detail, and says them in plain words", () => {
  expect(skillRefusal(scopeRefused)).toEqual({
    code: "SKILL_SCOPE_REFUSED",
    requiredScope: "client",
  });
  expect(skillRefusal(sourcesRefused)).toEqual({
    code: "SKILL_SOURCES_UNAVAILABLE",
    sources: ["mail", "research_portfolios", "custom_feed"],
  });
  for (const cause of [
    new ConversationUnavailable("SKILL_SCOPE_REFUSED", 403, {
      requiredScope: "client",
    }),
    new ConversationUnavailable("SKILL_SCOPE_REFUSED", 400),
    new ConversationUnavailable("SKILL_SOURCES_UNAVAILABLE", 400, {
      sources: [],
    }),
    new ConversationUnavailable("INVALID_REQUEST", 400),
    new ConversationUnavailable("CONVERSATION_UNAVAILABLE", 502),
    new Error("SKILL_SCOPE_REFUSED"),
  ])
    expect(skillRefusal(cause)).toBeUndefined();
  expect(describeSkillRefusal(skillRefusal(scopeRefused)!)).toBe(
    "Pick a client first: this skill works in a client conversation.",
  );
  expect(
    describeSkillRefusal({
      code: "SKILL_SCOPE_REFUSED",
      requiredScope: "general",
    }),
  ).toBe(
    "Use a General conversation: this skill does not work for one client.",
  );
  const sources = describeSkillRefusal(skillRefusal(sourcesRefused)!);
  expect(sources).toBe(
    "This skill needs data Meri cannot reach in this conversation: mail, research portfolios and custom feed. Try without the skill or in a client conversation.",
  );
  expect(
    describeSkillRefusal({
      code: "SKILL_SOURCES_UNAVAILABLE",
      sources: ["clients"],
    }),
  ).toContain("conversation: client records. Try");
  for (const text of [sources])
    expect(text).not.toMatch(/SKILL_|_UNAVAILABLE|research_portfolios/);
  expect(sourceName("federal_legislation")).toBe("federal legislation");
  expect(sourceName("some.new-id")).toBe("some new id");
});

it("names each closed run reason in plain words with a next step and never shows its code", () => {
  const expected: Record<string, RegExp> = {
    SKILL_RUNTIME_REFUSED: /cannot run here right now.*without the skill/,
    SKILL_SOURCES_UNAVAILABLE:
      /data Meri cannot reach.*Try without the skill or in a client conversation/,
    MODEL_TURNS_EXHAUSTED: /ran out of steps.*smaller piece/,
    MODEL_BUDGET_EXHAUSTED: /reached its budget.*smaller piece/,
    OUTPUT_LIMIT: /too long to deliver.*shorter answer/,
    EXECUTION_FAILED: /could not finish this answer/,
  };
  for (const [code, pattern] of Object.entries(expected)) {
    const described = describeRunFailure(code)!;
    expect(described.message).toMatch(pattern);
    expect(described.message).not.toContain(code);
    expect(described.code).toBeNull();
  }
  expect(describeRunFailure("SYNTHETIC_REASON")).toEqual({
    message: "Meri could not finish this answer. Send it again.",
    code: "SYNTHETIC_REASON",
  });
});

const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
  conversationId: "20000000-0000-4000-8000-000000000002",
  runId: "30000000-0000-4000-8000-000000000003",
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
  vi.stubGlobal("window", { sessionStorage: storage });
  syncMeriTabIdentity("synthetic-native-session", storage);
  return storage;
}

it("a definitive refusal releases the retained request and the captured draft; any other failure stays uncertain", async () => {
  vi.stubGlobal("crypto", {
    randomUUID: () => "40000000-0000-4000-8000-000000000004",
  });
  const storage = memory();
  const journal = conversationIntentJournal(
    new QueryClient(),
    context,
    storage,
  );
  const record = {
    read: journal.read,
    write: (value: Parameters<typeof journal.write>[0]) => {
      journal.write(value);
    },
  };
  const scope = { ...context, clientId: context.selectedClientId };
  const draft = createInitialDraftOwner(scope, storage);
  draft.edit("Mail history, please");
  const port = {
    context,
    getSnapshot: () => ({ status: "ready", submit: "idle", observation: null }),
    uploads: { sendArgument: () => [] },
    submitInitial: vi.fn(async () => {
      throw sourcesRefused;
    }),
    submit: vi.fn(),
  } as unknown as MeriConversationPort;
  await expect(
    sendRequest(port, record, "Mail history, please", false, true, (request) =>
      draft.begin(context, request, "Mail history, please"),
    ),
  ).rejects.toBe(sourcesRefused);
  expect(port.submitInitial).toHaveBeenCalledOnce();
  expect(journal.read()).toEqual({});
  // The capture is the composer's to release once the refusal is known; the text was kept.
  expect(draft.pendingDraft(context)).toBe("Mail history, please");
  draft.release(context);
  expect(draft.pendingDraft(context)).toBeNull();
  expect(draft.hasPending(context)).toBe(false);
  expect(draft.draft()).toBe("Mail history, please");
  // A refusal control did not decide (any other failure) keeps the exact retained request.
  const unknown = new ConversationUnavailable("CONVERSATION_UNAVAILABLE", 502);
  (port.submitInitial as ReturnType<typeof vi.fn>).mockImplementation(
    async () => {
      throw unknown;
    },
  );
  await expect(
    sendRequest(port, record, "Mail history, please", false, true),
  ).rejects.toBe(unknown);
  expect(journal.read().submit).toMatchObject({
    prompt: "Mail history, please",
    state: "unknown",
  });
});

type Run = ReturnType<typeof useLiveRun>;
const run = (overrides: Partial<Run>): Run =>
  ({
    snapshot: { status: "ready", observation: null, cancelReceipt: null },
    intent: {},
    busy: false,
    error: undefined,
    failure: undefined,
    refusal: undefined,
    transcript: "loaded",
    observing: "idle",
    history: vi.fn(),
    submit: vi.fn(),
    refreshRunStatus: vi.fn(),
    ...overrides,
  }) as unknown as Run;

it("after a refusal a reserved next message may be changed and sent again, and the sentence shows once without its code", () => {
  const refusal = skillRefusal(scopeRefused)!;
  const availability = (value: Run) =>
    composerAvailability(
      value,
      null,
      [],
      "The refused message",
      undefined,
      undefined,
      undefined,
      false,
      false,
    );
  const blocked = availability(run({}));
  expect(blocked.resend).toBe(false);
  expect(blocked.sendBlocked).toBe(
    "Check your last message before sending another.",
  );
  const open = availability(run({ refusal, error: "SKILL_SCOPE_REFUSED" }));
  expect(open.resend).toBe(true);
  expect(open.sendBlocked).toBeUndefined();
  // A retained request that is still unresolved is never resent as something else.
  expect(
    availability(
      run({
        refusal,
        intent: { submit: { requestId: "r", prompt: "x", state: "unknown" } },
      }),
    ).resend,
  ).toBe(false);
  const html = renderToStaticMarkup(
    createElement(RunStatus, {
      run: run({ refusal, error: "SKILL_SCOPE_REFUSED" }),
      active: false,
    }),
  );
  expect(html).toContain(
    "Pick a client first: this skill works in a client conversation.",
  );
  expect(html).not.toContain("SKILL_SCOPE_REFUSED");
  expect(html).not.toContain("Conversation operation unavailable");
  expect(buttons).toHaveLength(0);
});

type StatusProps = ComponentProps<typeof RunStatus>;
void (null as unknown as StatusProps);
