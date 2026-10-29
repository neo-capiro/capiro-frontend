"use client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ConversationSummary } from "../../../shared/meri-conversations/history-client";
import { createRequestLifetime } from "../../../shared/session/request-lifetime";
import {
  conversationExportFailure,
  downloadConversationMessages,
} from "./conversation-export";
import ui from "../ui/meri-ui.module.css";

type Props = {
  row: ConversationSummary;
  account: { tenantId: string; actorId: string };
  available: boolean;
};
/** A changed scope remounts the request lifetime and discards pending private bytes. */
export function ConversationExportAction(props: Props) {
  const { row, account, available } = props;
  const key = JSON.stringify([
    account.tenantId,
    account.actorId,
    row.conversationId,
    row.clientId,
    row.status,
    available,
  ]);
  return <MessageExportButton key={key} {...props} />;
}

/** Every click performs a fresh authorized read; responses are never cached. */
function MessageExportButton({ row, account, available }: Props) {
  const { tenantId, actorId } = account;
  const { conversationId, clientId, status, hasTranscript } = row;
  const lifetime = useMemo(() => createRequestLifetime(), []);
  useLayoutEffect(() => lifetime.mount(), [lifetime]);
  const pending = useRef<typeof lifetime | null>(null);
  const [state, setState] = useState<{
    owner: typeof lifetime;
    busy: boolean;
    message: string;
  }>();
  const visible = state?.owner === lifetime ? state : undefined;
  async function download() {
    if (
      !available ||
      status === "trashed" ||
      !hasTranscript ||
      pending.current === lifetime
    )
      return;
    pending.current = lifetime;
    setState({
      owner: lifetime,
      busy: true,
      message: "Checking access and preparing messages…",
    });
    const signal = lifetime.signal();
    try {
      await downloadConversationMessages(
        { tenantId, actorId, conversationId, clientId },
        signal,
      );
      if (!signal.aborted)
        setState({
          owner: lifetime,
          busy: false,
          message:
            "Download started. The saved file does not expire and cannot be revoked.",
        });
    } catch (error) {
      if (!signal.aborted)
        setState({
          owner: lifetime,
          busy: false,
          message: conversationExportFailure(error),
        });
    } finally {
      if (pending.current === lifetime) pending.current = null;
    }
  }
  return (
    <div>
      <button
        type="button"
        className={ui.outline}
        disabled={
          !available || status === "trashed" || !hasTranscript || visible?.busy
        }
        title="Download saved prompts and assistant messages. Attachments and tool results are excluded."
        onClick={() => void download()}
      >
        {visible?.busy ? "Preparing export…" : "Export messages"}
      </button>
      {visible?.message && (
        <p role="status" aria-label="Message export">
          {visible.message}
        </p>
      )}
    </div>
  );
}
