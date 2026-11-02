import { expect, it } from "vitest";
import {
  ATTACHMENT_CHECK_BLOCKED,
  connectingHandOff,
  withAttachmentCheck,
} from "../src/features/meri/conversation/session-composer-controls";
import { sessionHistoryState } from "../src/features/meri/conversation/saved-turns";
import type { LiveComposer } from "../src/features/meri/MeriComposer";

// Review of #527: a message that waited for the session is handed to the same controls the ordinary Send uses.
const live = (over: Partial<LiveComposer> = {}): LiveComposer => ({
  onSend: () => true,
  scope: "Synthetic client",
  attachUnavailable: "Attachments unavailable",
  ...over,
});

it("the hand-off goes through the attachment check the ordinary Send uses", () => {
  const checking = withAttachmentCheck(live(), true);
  expect(checking.sendBlocked).toBe(ATTACHMENT_CHECK_BLOCKED);
  expect(connectingHandOff(checking)).toEqual({
    reason: ATTACHMENT_CHECK_BLOCKED,
  });
  // A block of the run's own is kept, never replaced by the attachment wait.
  expect(
    withAttachmentCheck(live({ sendBlocked: "Meri is still answering." }), true)
      .sendBlocked,
  ).toBe("Meri is still answering.");
  expect(connectingHandOff(withAttachmentCheck(live(), false))).toBe("send");
});

it("the run's own queue takes a waiting message first; a blocked run says why", () => {
  expect(
    connectingHandOff(
      live({ onQueue: () => {}, sendBlocked: "Capiro is checking" }),
    ),
  ).toBe("queue");
  expect(
    connectingHandOff(
      live({ sendBlocked: "Your last message is still being confirmed." }),
    ),
  ).toEqual({ reason: "Your last message is still being confirmed." });
});

it("a first message waits while the saved history is read or read again, never treating it as empty", () => {
  const reading = sessionHistoryState(
    { reading: true },
    undefined,
    [],
    undefined,
    false,
  );
  expect(reading.initialBlocked).toBe("Loading this conversation…");
  const answered = sessionHistoryState({}, undefined, [], undefined, false);
  expect(answered.initialBlocked).toBeUndefined();
});
