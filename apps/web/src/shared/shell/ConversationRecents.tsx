"use client";
import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Pencil } from "lucide-react";
import { useIdentity } from "../portfolio/auth/identity";
import { SessionContext } from "../session/SessionContext";
import { useSelectedClient } from "../session/SelectedClient";
import { useConversationDiscovery } from "../meri-conversations/history-queries";
import type { ConversationAccount } from "../meri-conversations/host-controller";
import { useRecentConversationTitles } from "../meri-conversations/history-queries";
import { recentSummary } from "../meri-conversations/recent-titles";
import { conversationLabel } from "../meri-conversations/conversation-navigation";
import type {
  ConversationListPage,
  ConversationSummary,
} from "../meri-conversations/history-client";
import { useManagedChange } from "../meri-conversations/useManagedChange";
import styles from "./shell.module.css";

type Props = {
  enabled: boolean;
  className?: string | undefined;
  onNavigate?: (() => void) | undefined;
};

/** The surrounding shell can render before sign-in and outside the data provider. */
export function ConversationRecents(props: Props) {
  const session = useContext(SessionContext);
  if (!props.enabled || session !== "signed-in")
    return <p>Recent conversations unavailable</p>;
  return <VerifiedRecents {...props} />;
}

function VerifiedRecents(props: Props) {
  const identity = useIdentity(),
    selected = useSelectedClient();
  const params = useSearchParams();
  const general =
    params.getAll("scope").length === 1 &&
    params.get("scope") === "general" &&
    !params.has("clientId");
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  if (!current?.tenant?.id)
    return <p>Verify your account to load recent conversations.</p>;
  if (!general && selected.state !== "authorized-client")
    return (
      <p>Choose General or a permitted client to load recent conversations.</p>
    );
  const account = { tenantId: current.tenant.id, actorId: current.user.id };
  const clientId = general
    ? null
    : selected.state === "authorized-client"
      ? selected.client.id
      : null;
  return (
    <RecentLinks
      key={JSON.stringify([account, clientId])}
      {...props}
      account={account}
      clientId={clientId}
    />
  );
}

function RecentLinks({
  account,
  clientId,
  className,
  onNavigate,
}: Props & { account: ConversationAccount; clientId: string | null }) {
  const { query, conversations, unavailable } = useConversationDiscovery(
    account,
    clientId,
  );
  // Only the first read announces loading; a re-read keeps the last list on screen.
  const loading = query.isPending;
  const summaries = useRecentConversationTitles(account);
  const selectedConversationId = useSearchParams().get("conversationId");
  // The row whose rename control takes focus back once its editor closes. Held here because the
  // rows remount while the discovery list refetches after a saved change.
  const [returnFocusTo, setReturnFocusTo] = useState<string | null>(null);
  return (
    <>
      {loading ? (
        <p role="status">Loading recent conversations.</p>
      ) : unavailable ? (
        <p
          role="status"
          title="The conversation list could not be verified for the current account and client."
        >
          Recent conversations unavailable.
        </p>
      ) : (
        <>
          {conversations.map((conversation) => (
            <RecentConversation
              key={conversation.conversationId}
              conversation={conversation}
              summary={recentSummary(conversation, summaries)}
              summariesCurrent={summaries !== undefined}
              returnFocus={returnFocusTo === conversation.conversationId}
              onReturnFocus={setReturnFocusTo}
              account={account}
              current={selectedConversationId === conversation.conversationId}
              href={`/meri?${new URLSearchParams({ ...(clientId === null ? { scope: "general" } : { clientId }), conversationId: conversation.conversationId })}`}
              className={className}
              onNavigate={onNavigate}
            />
          ))}
          {!conversations.length && (
            <p>
              {clientId === null
                ? "No General conversations in the loaded pages."
                : "No conversations for this client in the loaded pages."}
            </p>
          )}
        </>
      )}
      {unavailable ? (
        <button
          type="button"
          className={className}
          onClick={() => void query.refetch()}
        >
          Retry recent conversations
        </button>
      ) : (
        query.hasNextPage && (
          <button
            type="button"
            className={className}
            disabled={query.isFetching}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage
              ? "Loading conversations…"
              : "More conversations"}
          </button>
        )
      )}
    </>
  );
}

/** One recent chat: its owned title (or the creation receipt until the title loads) and, for an owned row, inline rename. */
function RecentConversation({
  conversation,
  summary,
  summariesCurrent,
  returnFocus,
  onReturnFocus,
  account,
  current,
  href,
  className,
  onNavigate,
}: Pick<Props, "className" | "onNavigate"> & {
  conversation: ConversationListPage["conversations"][number];
  summary: ConversationSummary | undefined;
  /** The summaries read is current: an absent summary means the row has none. */
  summariesCurrent: boolean;
  /** This row's rename control takes focus as soon as it is rendered. */
  returnFocus: boolean;
  onReturnFocus: (conversationId: string | null) => void;
  account: ConversationAccount;
  current: boolean;
  href: string;
}) {
  const [renaming, setRenaming] = useState(false);
  // The owned title and its rename control stay while the summaries refetch; a row never flashes
  // back to its creation receipt between two current reads.
  const [known, setKnown] = useState(summary);
  if (summariesCurrent && summary !== known) setKnown(summary);
  const row = summary ?? known;
  const pencil = useRef<HTMLButtonElement>(null);
  // Leaving the editor (Escape or a saved name) puts focus back on the row's rename control.
  useEffect(() => {
    if (!returnFocus || renaming || !pencil.current) return;
    pencil.current.focus();
    onReturnFocus(null);
  }, [returnFocus, renaming, onReturnFocus]);
  const title = row?.title ?? conversationLabel(conversation.createdAt);
  if (row && renaming)
    return (
      <RecentRename
        row={row}
        account={account}
        onDone={() => {
          onReturnFocus(conversation.conversationId);
          setRenaming(false);
        }}
      />
    );
  return (
    <div className={styles.recentRow}>
      <Link
        className={className}
        aria-current={current ? "page" : undefined}
        title={title}
        href={href}
        onClick={onNavigate}
      >
        <span className={styles.recentTitle}>{title}</span>
      </Link>
      {row && (
        <button
          type="button"
          ref={pencil}
          className={styles.recentRename}
          title="Rename conversation"
          aria-label={`Rename ${title}`}
          onClick={() => setRenaming(true)}
        >
          <Pencil aria-hidden size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Enter saves through the same management command owner as the history page; Escape leaves the
 * name as it was. An empty name is refused: the contract needs a title, so the previous name stays
 * and nothing is sent.
 */
function RecentRename({
  row,
  account,
  onDone,
}: {
  row: ConversationSummary;
  account: ConversationAccount;
  onDone: () => void;
}) {
  const { journal, intent, busy, message, submit, change } = useManagedChange({
    row,
    account,
    available: true,
    refresh: (confirmed) => {
      if (confirmed) onDone();
    },
  });
  const [draft, setDraft] = useState(row.title);
  const title = draft.trim();
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (busy || intent) return;
    if (!title || title === row.title) return onDone();
    change("rename", title);
  };
  return (
    <form
      className={styles.recentRenameForm}
      aria-label="Rename conversation"
      onSubmit={save}
    >
      <input
        type="text"
        aria-label="Conversation name"
        value={draft}
        maxLength={200}
        autoFocus
        disabled={busy}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onDone();
          }
        }}
      />
      {!journal && (
        <p role="status">This tab cannot safely retain a chat change.</p>
      )}
      {intent && !busy && (
        <button
          type="button"
          className={styles.recentRetry}
          onClick={() => void submit(intent)}
        >
          Retry same change
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
