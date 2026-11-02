"use client";
import { useRef, useState } from "react";
import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import { TabJournalUnavailable } from "../../../shared/meri-conversations/tab-journal";
import { controlFailure, type ControlFailure } from "./control-reachability";

const code = (cause: unknown) =>
  cause instanceof TabJournalUnavailable
    ? cause.message
    : cause instanceof ConversationUnavailable
      ? cause.code
      : "CONVERSATION_UNAVAILABLE";

/**
 * Runs one explicit command at a time and reports its closed failure code. Commands issued while
 * another is in flight are ignored, never queued. `settled` runs after every command. `failure`
 * says when the last error was control not answering (or the edge refusing the request) rather
 * than a refusal, so the UI can offer a plain retry instead of a lock.
 */
export function useCommandGate(
  alive: { readonly current: boolean },
  settled: () => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [failure, setFailure] = useState<ControlFailure>();
  const active = useRef(false);
  async function perform(operation: () => Promise<unknown>) {
    if (active.current) return false;
    active.current = true;
    setBusy(true);
    setError(undefined);
    setFailure(undefined);
    try {
      await operation();
      return true;
    } catch (cause) {
      if (alive.current) {
        setError(code(cause));
        setFailure(controlFailure(cause));
      }
      return false;
    } finally {
      active.current = false;
      if (alive.current) {
        setBusy(false);
        settled();
      }
    }
  }
  return { busy, error, failure, perform, active };
}
