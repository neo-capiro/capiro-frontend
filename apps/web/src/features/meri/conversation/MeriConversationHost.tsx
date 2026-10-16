"use client";
import { useRef, useState, type RefObject } from "react";
import { Button } from "@capiro/ui/button";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import { unavailableTitle } from "../../../shared/meri-resources/unavailable";
import { UserMessage } from "../screens/conversation/UserMessage";
import { ConversationFrame } from "./ConversationFrame";
import { MeriLiveConversation } from "./MeriLiveConversation";
import type { TurnView } from "./conversation-view";
import { useConversationConnection } from "./useConversationConnection";
import ui from "../ui/meri-ui.module.css";
import styles from "./live.module.css";

export function MeriConversationHost({
  enabled,
  account,
}: {
  enabled: boolean;
  account?: ConversationAccount;
}) {
  const selected = useSelectedClient();
  if (!enabled)
    return (
      <section aria-labelledby="conversation-availability">
        <h2 id="conversation-availability">Conversations unavailable</h2>
        <p>
          The governed conversation connection is not enabled. Conversations and
          their files cannot be loaded.
        </p>
      </section>
    );
  if (!account || selected.state !== "authorized-client")
    return (
      <section role="status">
        <h2>Conversation connection unavailable</h2>
        <p>
          A verified account and current client are required. Select a permitted
          client in Portfolio.
        </p>
      </section>
    );
  return (
    <ConnectedConversation
      key={`${account.tenantId}:${account.actorId}:${selected.client.id}`}
      account={account}
      clientId={selected.client.id}
      scope={selected.client.name}
    />
  );
}

/** Draft and the turns shown in this page outlive each short-lived run session. */
function ConnectedConversation({
  account,
  clientId,
  scope,
}: {
  account: ConversationAccount;
  clientId: string;
  scope: string;
}) {
  const connection = useConversationConnection(account, clientId);
  const { state, pending } = connection;
  const [draft, setDraft] = useState("");
  const [earlier, setEarlier] = useState<readonly TurnView[]>([]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  if (state.status === "ready")
    return (
      <MeriLiveConversation
        key={state.lifetimeKey}
        port={state.port}
        initialPrompt={pending}
        earlier={earlier}
        scope={scope}
        draft={draft}
        onDraft={setDraft}
        textareaRef={textarea}
        onNextTurn={(prompt, finished) => {
          setEarlier((turns) => [...turns, finished]);
          connection.reopen({ nextTurn: true, pending: prompt });
        }}
      />
    );
  return (
    <ConnectionPending
      status={state.status}
      pending={pending}
      scope={scope}
      earlier={earlier}
      draft={draft}
      onDraft={setDraft}
      textareaRef={textarea}
      onRetry={connection.retry}
      onEdit={() => {
        if (pending) setDraft(pending);
        setEarlier((turns) => turns.slice(0, -1));
        connection.reopen();
      }}
    />
  );
}

/** No usable session yet: the turns already shown, the waiting request and recovery actions. */
function ConnectionPending({
  status,
  pending,
  scope,
  earlier,
  draft,
  onDraft,
  textareaRef,
  onRetry,
  onEdit,
}: {
  status: "idle" | "connecting" | "unavailable" | "expired";
  pending: string | undefined;
  scope: string;
  earlier: readonly TurnView[];
  draft: string;
  onDraft: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onRetry: () => void;
  /** Move a waiting request back into the draft and reopen the finished run. */
  onEdit: () => void;
}) {
  const waiting = status === "idle" || status === "connecting";
  return (
    <ConversationFrame
      scope={scope}
      earlier={earlier}
      current={
        pending ? (
          <article
            className={`${styles.turn} ${styles.pending}`}
            aria-label="Current turn"
          >
            <UserMessage>{pending}</UserMessage>
            <p className={styles.muted}>
              {waiting
                ? "Opening the conversation's next run…"
                : "Not sent. Meri did not open the next run for this message."}
            </p>
          </article>
        ) : null
      }
      status={
        <section role="status" className={styles.status}>
          <h2>
            {status === "expired"
              ? "Conversation session expired"
              : waiting
                ? "Connecting to Meri…"
                : "Conversation connection unavailable"}
          </h2>
          <p className={styles.muted}>
            {status === "unavailable"
              ? "The service could not verify this conversation. No sample transcript was substituted."
              : "The service rechecks your account, client and current conversation before issuing a short-lived connection."}
          </p>
          {!waiting && (
            <div className={styles.statusRow}>
              <Button
                type="button"
                variant="outline"
                className={ui.outline}
                onClick={onRetry}
              >
                {status === "expired" ? "Reconnect" : "Try again"}
              </Button>
              {pending && (
                <Button
                  type="button"
                  variant="ghost"
                  className={ui.ghost}
                  onClick={onEdit}
                >
                  Edit message instead
                </Button>
              )}
            </div>
          )}
        </section>
      }
      files={null}
      draft={draft}
      onDraft={onDraft}
      textareaRef={textareaRef}
      running={false}
      composer={{
        onSend: () => undefined,
        sendBlocked: waiting
          ? "Connecting to Meri…"
          : "Reconnect to Meri before sending.",
        scope,
        attachUnavailable: unavailableTitle("attachments"),
      }}
    />
  );
}
