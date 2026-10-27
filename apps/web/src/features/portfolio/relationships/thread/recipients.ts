import type { FullThread } from "./contracts";

export function orderedMessages(thread: FullThread) {
  return [...thread.messages].sort(
    (a, b) =>
      Date.parse(b.sentAt ?? b.receivedAt ?? b.createdAt) -
      Date.parse(a.sentAt ?? a.receivedAt ?? a.createdAt),
  );
}
