import { describe, expect, it } from "vitest";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";

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
    owner.begin("First question", " First question ");
    expect(owner.acknowledge(submit("pending"), " First question ")).toBe(
      false,
    );
    expect(owner.acknowledge(submit("unknown"), " First question ")).toBe(
      false,
    );
    expect(owner.hasPending()).toBe(true);
    // A replacement live session uses the same conversation-owned draft guard.
    expect(owner.acknowledge(submit("observed"), " First question ")).toBe(
      true,
    );
    expect(owner.hasPending()).toBe(false);
    expect(owner.acknowledge(submit("observed"), "First question")).toBe(false);
  });

  it("preserves edits made while no live session is mounted, including a new draft with the same text", () => {
    for (const draft of ["Second question", "First question"]) {
      const owner = createInitialDraftOwner();
      owner.begin("First question", "First question");
      owner.edit();
      expect(owner.acknowledge(submit("observed"), draft)).toBe(false);
      expect(owner.hasPending()).toBe(false);
    }
  });

  it("a missing or mismatched acknowledgement cannot consume or release the original draft", () => {
    const owner = createInitialDraftOwner();
    owner.begin("First question", "First question");
    expect(owner.acknowledge(undefined, "First question")).toBe(false);
    expect(
      owner.acknowledge(
        submit("observed", "Foreign question"),
        "First question",
      ),
    ).toBe(false);
    expect(owner.hasPending()).toBe(true);
  });

  it("a different conversation owner cannot consume the previous conversation's draft", () => {
    const previous = createInitialDraftOwner();
    previous.begin("First question", "First question");
    const replacement = createInitialDraftOwner();
    expect(replacement.acknowledge(submit("observed"), "First question")).toBe(
      false,
    );
    expect(previous.hasPending()).toBe(true);
  });
});
