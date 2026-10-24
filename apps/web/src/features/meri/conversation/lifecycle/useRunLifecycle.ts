"use client";
import { useEffect, useRef, useState } from "react";
import type {
  ConversationLifecycleControlReceipt,
  ConversationLifecycleControlRequest,
  ConversationCheckpointInspectionReceipt,
} from "@capiro/meri-contracts/conversation-lifecycle";
import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import type { MeriConversationPort } from "../../../../shared/meri-conversations/host-controller";
import { lifecycleJournal } from "../../../../shared/meri-conversation-lifecycle/journal";

export type LifecycleTarget = NonNullable<
  ConversationLifecycleControlReceipt["targetBinding"]
>;
type Command = ConversationLifecycleControlRequest;
type Choice = Command extends infer T
  ? T extends Command
    ? Omit<T, "controlId">
    : never
  : never;
const message = (error: unknown) =>
  error instanceof ConversationUnavailable
    ? `This operation is unavailable (${error.code}).`
    : "The operation could not be confirmed. Retry the same control to recover its outcome.";

/** A mounted source port owns controls. Recovered uncertainty never dispatches automatically. */
export function useRunLifecycle(
  port: MeriConversationPort,
  suspend: () => void,
  reconnect: () => void,
  onTarget: (target: LifecycleTarget) => void,
) {
  const [recovery] = useState(() => {
    try {
      const journal = lifecycleJournal(port.context);
      return { journal, command: journal.read() };
    } catch {
      return {
        error: "Pause and recovery cannot safely save a command in this tab.",
      };
    }
  });
  const [command, setCommand] = useState(recovery.command);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(recovery.error);
  const [receipt, setReceipt] = useState<ConversationLifecycleControlReceipt>();
  const [checkpoint, setCheckpoint] =
    useState<ConversationCheckpointInspectionReceipt>();
  const active = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const current = () =>
    alive.current &&
    !!recovery.journal?.current() &&
    port.getSnapshot().status !== "disposed";
  const begin = () => {
    if (!current() || active.current || port.getSnapshot().status !== "ready")
      return false;
    active.current = true;
    setBusy(true);
    setError(undefined);
    suspend();
    return true;
  };
  const end = () => {
    active.current = false;
    if (current()) {
      setBusy(false);
      reconnect();
    }
  };
  const dispatch = async (input: Command, fresh: boolean) => {
    if (!begin()) return;
    const journal = recovery.journal!;
    try {
      if (fresh) setReceipt(undefined);
      const retained = journal.retain(input);
      setCommand(retained);
      const response = await port.control(retained);
      if (!current()) return;
      if ("error" in response) {
        // A refusal of a replay says nothing about an earlier unknown dispatch.
        if (fresh && response.error.outcome === "NOT_DISPATCHED") {
          journal.clear(retained);
          setCommand(undefined);
        }
        setError(`Meri could not apply this control (${response.error.code}).`);
        return;
      }
      setReceipt(response);
      if (response.state === "APPLIED") {
        // Persist the exact target selector before retiring the only recovery command.
        if (response.targetBinding) onTarget(response.targetBinding);
        journal.clear(retained);
        setCommand(undefined);
        setCheckpoint(undefined);
      }
    } catch (cause) {
      if (current()) setError(message(cause));
    } finally {
      end();
    }
  };
  return {
    command,
    busy,
    error,
    receipt,
    checkpoint,
    blocked:
      recovery.error ??
      (command || busy
        ? "Recover the pending pause or recovery control before sending another message."
        : undefined),
    available: !!recovery.journal,
    send: (choice: Choice) => {
      try {
        if (!recovery.journal || recovery.journal.read()) return;
        void dispatch(
          { ...choice, controlId: crypto.randomUUID() } as Command,
          true,
        );
      } catch {
        setError("The pending control could not be recovered in this tab.");
      }
    },
    retry: () => {
      try {
        const retained = recovery.journal?.read();
        if (retained) void dispatch(retained, false);
      } catch {
        setError("The pending control could not be recovered in this tab.");
      }
    },
    inspect: async (checkpointId: string) => {
      if (command || !begin()) return;
      setCheckpoint(undefined);
      try {
        // Public receipt validation compares with the latest admitted source history.
        await port.history({ after: 0, limit: 100 });
        const response = await port.inspectCheckpoint({ checkpointId });
        if (!current()) return;
        if ("error" in response)
          setError(`Checkpoint unavailable (${response.error.code}).`);
        else setCheckpoint(response);
      } catch (cause) {
        if (current()) setError(message(cause));
      } finally {
        end();
      }
    },
  };
}
