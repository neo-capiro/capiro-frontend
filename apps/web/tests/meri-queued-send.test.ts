/** The composer's one queued message, step by step: one send, kept drafts and reasons that last only as long as their cause. */
import { expect, it } from "vitest";
import {
  nextQueueState,
  queueMessage,
  stopQueue,
  STOPPED_NOTICE,
  type QueueState,
} from "../src/features/meri/conversation/queued-send";

const idle: QueueState = { queued: false };
const step = (
  state: QueueState,
  waiting: boolean,
  ready: boolean,
  release: string | false,
) => nextQueueState(state, { waiting, ready, release });

it("a queued message is sent once when the run finishes and the queue clears first", () => {
  const queued = queueMessage();
  expect(step(queued, true, false, false)).toEqual({ state: queued, send: false });
  const sent = step(queued, false, true, false);
  expect(sent).toEqual({ state: idle, send: true });
  expect(step(sent.state, false, true, false).send).toBe(false);
});

it("Stop keeps the draft and says so while the stopped run ends; the notice clears on the next send", () => {
  const stopped = stopQueue(queueMessage());
  expect(stopped).toEqual({
    queued: false,
    released: { reason: STOPPED_NOTICE, block: false },
  });
  // Right after Stop the run is still active (waiting): the notice stays.
  expect(step(stopped, true, false, false)).toEqual({ state: stopped, send: false });
  // The run ends: still shown, now marked as having outlived it.
  const ended = step(stopped, false, true, false).state;
  expect(ended.released?.reason).toBe(STOPPED_NOTICE);
  expect(step(ended, false, true, false).state).toBe(ended);
  // The person sends again: a run is waiting once more, and the notice clears.
  expect(step(ended, true, false, false).state).toEqual(idle);
  expect(stopQueue(idle)).toBe(idle);
});

it("a block releases the queue with its reason, and the reason clears once the block does", () => {
  const reason = "Capiro is checking this conversation before you can send again.";
  const released = step(queueMessage(), false, false, reason);
  expect(released).toEqual({
    state: { queued: false, released: { reason, block: true } },
    send: false,
  });
  expect(step(released.state, false, false, reason).state).toBe(released.state);
  expect(step(released.state, false, true, false)).toEqual({ state: idle, send: false });
});

it("an emptied box releases the queue silently and never sends", () => {
  expect(step(queueMessage(), true, true, "")).toEqual({ state: idle, send: false });
});
