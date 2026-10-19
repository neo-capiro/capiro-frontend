import { describe, expect, it } from "vitest";
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
