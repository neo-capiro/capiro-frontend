"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { conversationIntentJournal } from "../../../shared/meri-conversations/query-journal";

/** Explicit user commands only. SDK owns admission, observed cursor and retained command bytes. */
export function useConversationActions(port: MeriConversationPort) {
  const cache = useQueryClient();
  const [journal] = useState(() =>
    conversationIntentJournal(cache, port.context),
  );
  const [intent, setIntent] = useState(journal.read);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const active = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const snapshot = useSyncExternalStore(
    port.subscribe,
    port.getSnapshot,
    port.getSnapshot,
  );
  async function perform(operation: () => Promise<unknown>) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await operation();
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof ConversationUnavailable
            ? cause.code
            : "CONVERSATION_UNAVAILABLE",
        );
    } finally {
      active.current = false;
      if (alive.current) {
        setBusy(false);
        setIntent(journal.read());
      }
    }
  }
  function write(value: ReturnType<typeof journal.read>) {
    if (alive.current) journal.write(value);
  }
  const history = (more = false) =>
    perform(() =>
      port.history({
        ...(more ? { after: snapshot.observation?.after ?? 0 } : {}),
        limit: 100,
      }),
    );
  const submit = (prompt: string, retry = false) =>
    perform(async () => {
      const retained = journal.read().submit;
      if ((!retry && retained) || (retry && !retained))
        throw new ConversationUnavailable("retained-submit-intent");
      const input = retry
        ? retained!
        : { requestId: crypto.randomUUID(), prompt, state: "pending" as const };
      write({ ...journal.read(), submit: { ...input, state: "pending" } });
      try {
        if (retry && port.getSnapshot().submit === "unknown")
          await port.retrySubmit();
        else
          await port.submit({
            requestId: input.requestId,
            prompt: input.prompt,
          });
        write({ ...journal.read(), submit: { ...input, state: "observed" } });
      } catch (cause) {
        write({ ...journal.read(), submit: { ...input, state: "unknown" } });
        throw cause;
      }
    });
  const cancel = () =>
    perform(async () => {
      write({ ...journal.read(), cancel: "pending" });
      try {
        await port.cancel();
        write({ ...journal.read(), cancel: "observed" });
      } catch (cause) {
        write({ ...journal.read(), cancel: "unknown" });
        throw cause;
      }
    });
  const observe = (reconnect: boolean) =>
    perform(async () => {
      const handle = port.openChat();
      // The SDK's subscription send method maps only to the closed view.subscribe command.
      if (reconnect) await handle.chat.resumeStream();
      else await handle.chat.sendMessage({ text: "" });
      if (handle.chat.error)
        throw new ConversationUnavailable("subscription-unavailable");
    });
  return { snapshot, intent, busy, error, history, submit, cancel, observe };
}
