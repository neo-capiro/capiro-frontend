"use client";
import { useMemo, useRef, useState } from "react";
import { useManagedOutcome } from "./ManagedOutcomes";
import { announceManagementReceipt } from "../../../shared/meri-conversations/management-refresh";
import { CapiroApiError } from "../../../shared/capiro/http";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  managedChangeKey,
  managementVersion,
  requireManagementReceipt,
  type ManagedConversation,
  type ManagementRequest,
} from "../../../shared/capiro/operations/meri-conversation-management";
import {
  managementJournal,
  type PendingManagement,
} from "../../../shared/meri-conversations/management-journal";

export type ManagedChatProps = {
  row: ManagedConversation;
  account: { tenantId: string; actorId: string };
  available: boolean;
  refresh(): void;
};
/** One revision-scoped retry owner. A lost reply preserves the exact consumed request bytes. */
export function useManagedChange({
  row,
  account,
  available,
  refresh,
}: ManagedChatProps) {
  const api = useCapiro();
  const confirmed = useManagedOutcome();
  const recovery = useMemo(() => {
    try {
      const owner = managementJournal({
        tenantId: account.tenantId,
        actorId: account.actorId,
        clientId: row.clientId,
        conversationId: row.conversationId,
      });
      return { owner, pending: owner.read() ?? null };
    } catch {
      return null;
    }
  }, [account.tenantId, account.actorId, row.clientId, row.conversationId]);
  const journal = recovery?.owner;
  const [intent, setIntent] = useState<PendingManagement | null>(
    () => recovery?.pending ?? null,
  );
  const sending = useRef(false);
  const pendingRef = useRef(intent);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(pending: PendingManagement) {
    if (sending.current || !available) return;
    sending.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (!journal) throw new Error("Retry journal unavailable");
      journal.write(pending);
      pendingRef.current = pending;
      setIntent(pending);
      const receipt = await api.request(managedChangeKey, {
        body: pending.request,
      });
      requireManagementReceipt(receipt, pending.request, pending.previous);
      journal.clear();
      pendingRef.current = null;
      setIntent(null);
      setMessage("Chat change confirmed.");
      confirmed(pending, receipt);
      announceManagementReceipt(account);
      refresh();
    } catch (error) {
      if (error instanceof CapiroApiError && error.status === 409) refresh();
      setMessage(
        "The change is not confirmed. Retry the same request or refresh to check the current chat.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  function change(operation: ManagementRequest["operation"], title: string) {
    if (!available || !journal || sending.current || pendingRef.current) return;
    const request = {
      version: managementVersion,
      requestId: crypto.randomUUID(),
      conversationId: row.conversationId,
      expectedRevision: row.revision,
    };
    void submit({
      request:
        operation === "rename"
          ? { ...request, operation, title: title.trim() }
          : { ...request, operation },
      previous: row,
    });
  }
  return { journal, intent, busy, message, submit, change };
}
