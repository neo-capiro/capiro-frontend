"use client";
import { useMemo, useRef, useState } from "react";
import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import { TabJournalUnavailable } from "../../../shared/meri-conversations/tab-journal";
import { controlFailure, type ControlFailure } from "./control-reachability";
import { sendRefusal, type SendRefusal } from "./skill-refusal";

const code = (cause: unknown) =>
  cause instanceof TabJournalUnavailable
    ? cause.message
    : cause instanceof ConversationUnavailable
      ? cause.code
      : "CONVERSATION_UNAVAILABLE";

type CommandState = {
  owner: { readonly current: boolean };
  busy: boolean;
  error?: string;
  failure?: ControlFailure;
  refusal?: SendRefusal;
};

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
  const [state, setState] = useState<CommandState>({
    owner: alive,
    busy: false,
  });
  // A renewed port may arrive before its retired command settles. Its read must not
  // inherit that command's gate, and a late completion must not change the new view.
  const activeOwner = useRef<typeof alive | null>(null);
  const active = useMemo(
    () => ({
      get current() {
        return activeOwner.current === alive;
      },
    }),
    [alive],
  );
  async function perform(operation: () => Promise<unknown>) {
    if (!alive.current || active.current) return false;
    activeOwner.current = alive;
    setState({ owner: alive, busy: true });
    try {
      await operation();
      return true;
    } catch (cause) {
      if (alive.current) {
        setState({
          owner: alive,
          busy: true,
          error: code(cause),
          failure: controlFailure(cause),
          refusal: sendRefusal(cause),
        });
      }
      return false;
    } finally {
      if (activeOwner.current === alive) activeOwner.current = null;
      if (alive.current) {
        setState((value) =>
          value.owner === alive ? { ...value, busy: false } : value,
        );
        settled();
      }
    }
  }
  const visible: Omit<CommandState, "owner"> =
    state.owner === alive ? state : { busy: false };
  return {
    busy: visible.busy,
    error: visible.error,
    failure: visible.failure,
    refusal: visible.refusal,
    perform,
    active,
  };
}
