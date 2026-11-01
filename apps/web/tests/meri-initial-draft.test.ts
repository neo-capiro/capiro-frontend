import { describe, expect, it } from "vitest";
import { CONVERSATION_SKILLS } from "@capiro/meri-contracts/conversation-application";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";

const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
  conversationId: "20000000-0000-4000-8000-000000000002",
  runId: "30000000-0000-4000-8000-000000000003",
};

const submit = (
  state: "pending" | "unknown" | "observed",
  prompt = "First question",
) => ({
  requestId: "a0000000-0000-4000-8000-00000000000a",
  prompt,
  state,
});

describe("conversation-owned initial draft consumption", () => {
  it("exposes the captured text of a pending attempt for its own run only, until it is acknowledged", () => {
    const owner = createInitialDraftOwner();
    expect(owner.pendingDraft(context)).toBeNull();
    owner.begin(
      context,
      { requestId: submit("pending").requestId, prompt: "First question" },
      "First question",
    );
    expect(owner.pendingDraft(context)).toBe("First question");
    expect(owner.pendingDraft({ ...context, runId: "other-run" })).toBeNull();
    // Typing never merges into the capture, and once typed the box is the person's: even the
    // same words retyped stay visible instead of being masked at the last character.
    owner.edit("First questio");
    expect(owner.pendingDraft(context)).toBeNull();
    owner.edit("First question");
    expect(owner.draft()).toBe("First question");
    expect(owner.pendingDraft(context)).toBeNull();
    owner.edit("Second question");
    expect(owner.hasPending(context)).toBe(true);
    owner.acknowledge(context, submit("observed"), "Second question");
    expect(owner.hasPending(context)).toBe(false);
    expect(owner.draft()).toBe("Second question");
  });

  it("an admitted request takes its skill off the composer; a selection changed since stays", () => {
    const skillOf = (index: number) => ({
      skillId: CONVERSATION_SKILLS[index]!.skillId,
      skillVersion: CONVERSATION_SKILLS[index]!.version,
    });
    const request = {
      requestId: submit("pending").requestId,
      prompt: "First question",
      skill: skillOf(0),
    };
    const sent = createInitialDraftOwner();
    sent.selectSkill({ skill: skillOf(0) });
    sent.begin(context, request, "First question");
    expect(
      sent.acknowledge(
        context,
        { ...request, state: "observed" },
        "First question",
      ),
    ).toBe(true);
    expect(sent.selection()).toEqual({});

    const changed = createInitialDraftOwner();
    changed.selectSkill({ skill: skillOf(0) });
    changed.begin(context, request, "First question");
    changed.selectSkill({ skill: skillOf(1) });
    changed.acknowledge(
      context,
      { ...request, state: "observed" },
      "First question",
    );
    expect(changed.selection()).toEqual({ skill: skillOf(1) });
  });

  it("retains the sent draft through uncertainty and consumes it once after a replacement session observes the exact submit", () => {
    const owner = createInitialDraftOwner();
    owner.begin(
      context,
      { requestId: submit("pending").requestId, prompt: "First question" },
      " First question ",
    );
    expect(
      owner.acknowledge(context, submit("pending"), " First question "),
    ).toBe(false);
    expect(
      owner.acknowledge(context, submit("unknown"), " First question "),
    ).toBe(false);
    expect(owner.hasPending(context)).toBe(true);
    // A replacement live session uses the same conversation-owned draft guard.
    expect(
      owner.acknowledge(context, submit("observed"), " First question "),
    ).toBe(true);
    expect(owner.hasPending(context)).toBe(false);
    expect(
      owner.acknowledge(context, submit("observed"), "First question"),
    ).toBe(false);
  });

  it("preserves edits made while no live session is mounted, including a new draft with the same text", () => {
    for (const draft of ["Second question", "First question"]) {
      const owner = createInitialDraftOwner();
      owner.begin(
        context,
        { requestId: submit("pending").requestId, prompt: "First question" },
        "First question",
      );
      owner.edit();
      expect(owner.acknowledge(context, submit("observed"), draft)).toBe(false);
      expect(owner.hasPending(context)).toBe(false);
    }
  });

  it("a missing or mismatched acknowledgement cannot consume or release the original draft", () => {
    const owner = createInitialDraftOwner();
    owner.begin(
      context,
      { requestId: submit("pending").requestId, prompt: "First question" },
      "First question",
    );
    expect(owner.acknowledge(context, undefined, "First question")).toBe(false);
    expect(
      owner.acknowledge(
        context,
        submit("observed", "Foreign question"),
        "First question",
      ),
    ).toBe(false);
    expect(owner.hasPending(context)).toBe(true);
  });

  it("a different conversation owner cannot consume the previous conversation's draft", () => {
    const previous = createInitialDraftOwner();
    previous.begin(
      context,
      { requestId: submit("pending").requestId, prompt: "First question" },
      "First question",
    );
    const replacement = createInitialDraftOwner();
    expect(
      replacement.acknowledge(context, submit("observed"), "First question"),
    ).toBe(false);
    expect(previous.hasPending(context)).toBe(true);
  });
});

it("an equal prompt under another request id cannot acknowledge the original capture", () => {
  const owner = createInitialDraftOwner();
  owner.begin(
    context,
    { requestId: submit("pending").requestId, prompt: "First question" },
    "First question",
  );
  expect(
    owner.acknowledge(
      context,
      {
        ...submit("observed"),
        requestId: "a0000000-0000-4000-8000-00000000000b",
      },
      "First question",
    ),
  ).toBe(false);
  expect(owner.hasPending(context)).toBe(true);
  expect(owner.acknowledge(context, submit("observed"), "First question")).toBe(
    true,
  );
});

it("an equal request in another run or account/client scope cannot consume a capture", () => {
  for (const field of [
    "runId",
    "conversationId",
    "tenantId",
    "actorId",
    "selectedClientId",
  ] as const) {
    const owner = createInitialDraftOwner();
    owner.begin(
      context,
      { requestId: submit("pending").requestId, prompt: "First question" },
      "First question",
    );
    const foreign = { ...context, [field]: "another-scope" };
    expect(
      owner.acknowledge(foreign, submit("observed"), "First question"),
    ).toBe(false);
    expect(owner.hasPending(foreign)).toBe(false);
    expect(owner.hasPending(context)).toBe(true);
  }
});

it("binding a later run retires its predecessor's capture and preserves a same-run renewed session", () => {
  const owner = createInitialDraftOwner();
  owner.begin(
    context,
    { requestId: submit("pending").requestId, prompt: "First question" },
    "First question",
  );
  owner.select({ ...context });
  expect(owner.hasPending(context)).toBe(true);
  owner.select({ ...context, runId: "30000000-0000-4000-8000-000000000044" });
  expect(owner.hasPending(context)).toBe(false);
  expect(owner.acknowledge(context, submit("observed"), "First question")).toBe(
    false,
  );
});
