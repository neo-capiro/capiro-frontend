"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@capiro/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@capiro/ui/command";
import { useConversationDiscovery } from "../../../shared/meri-conversations/history-queries";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import {
  conversationHref,
  conversationLabel,
} from "../../../shared/meri-conversations/conversation-navigation";
import styles from "./conversations.module.css";
import ui from "../ui/meri-ui.module.css";

/** A cmdk view over verified loaded pages; it does not claim server-side history search. */
export function ConversationList({
  account,
  clientId,
  clientName,
}: {
  account: ConversationAccount;
  clientId: string;
  clientName: string;
}) {
  const { query, conversations, unavailable } = useConversationDiscovery(
    account,
    clientId,
  );
  const hint = useId();
  const loading = query.isPending || query.isRefetching;
  return (
    <section
      className={styles.panel}
      aria-label="Saved conversations"
      aria-busy={query.isFetching}
    >
      <h2>Find a conversation</h2>
      <p id={hint} className={styles.hint}>
        Filter the loaded pages by date or conversation ID. Earlier pages may
        contain more results. Use arrows to choose and Enter to open.
      </p>
      {loading ? (
        <p role="status">Loading conversations…</p>
      ) : unavailable ? (
        <p role="alert">
          Conversation history could not be verified. Reload the list to check
          current access.
        </p>
      ) : (
        <LoadedConversations
          conversations={conversations}
          clientId={clientId}
          clientName={clientName}
          hint={hint}
        />
      )}
      <div className={styles.actions}>
        <Button
          type="button"
          variant="outline"
          className={ui.outline}
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {unavailable ? "Retry conversation list" : "Reload conversation list"}
        </Button>
        {!unavailable && query.hasNextPage && (
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={query.isFetching}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage
              ? "Loading earlier conversations…"
              : "Load earlier conversations"}
          </Button>
        )}
      </div>
      <p className={styles.hint}>
        Titles, full-history search and conversation management are not
        available yet.
      </p>
    </section>
  );
}

function LoadedConversations({
  conversations,
  clientId,
  clientName,
  hint,
}: {
  conversations: ReturnType<typeof useConversationDiscovery>["conversations"];
  clientId: string;
  clientName: string;
  hint: string;
}) {
  const [filter, setFilter] = useState("");
  const router = useRouter();
  return (
    <Command className={styles.command} label="Saved conversations" loop>
      <CommandInput
        aria-label="Filter loaded conversations"
        aria-describedby={hint}
        placeholder="Filter loaded conversations"
        value={filter}
        onValueChange={setFilter}
      />
      <CommandList className={styles.list} aria-label="Loaded conversations">
        <CommandEmpty>
          {conversations.length
            ? "No matching conversations in the loaded pages."
            : "No conversations for this client in the loaded pages."}
        </CommandEmpty>
        {conversations.map((conversation) => {
          const label = conversationLabel(conversation.createdAt);
          return (
            <CommandItem
              key={conversation.conversationId}
              value={conversation.conversationId}
              keywords={[label]}
              className={styles.item}
              onSelect={() =>
                router.push(
                  conversationHref(clientId, conversation.conversationId),
                )
              }
            >
              {/* This exact 18px Figma SVG needs no raster optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/design/m2-conversations/conversation.svg"
                alt=""
                width={18}
                height={18}
              />
              <span className={styles.copy}>
                <span className={styles.title}>{label}</span>
                <span className={styles.detail}>
                  {clientName} · {conversation.conversationId}
                </span>
              </span>
              <span className={styles.open} aria-hidden>
                Open
              </span>
            </CommandItem>
          );
        })}
      </CommandList>
    </Command>
  );
}
