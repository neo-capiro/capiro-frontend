"use client";

import Image from "next/image";

import { CommandGroup, CommandItem } from "@capiro/ui/command";

import type { ManagedConversation } from "../capiro/operations/meri-conversation-management";

import { useClients } from "../portfolio/api/clients";

import { useManagedConversations } from "../meri-conversations/useManagedConversations";

import { conversationHref } from "../meri-conversations/conversation-navigation";

export function usePaletteSearch(search: string, open: boolean) {
  const managed = useManagedConversations(search, "active", open);

  const { scope, current, query } = managed;

  const clients = useClients({
    enabled: open && Boolean(scope),

    scope: scope
      ? { tenantId: scope.tenantId, userId: scope.actorId }
      : { tenantId: "", userId: "" },
  });

  const roster =
    clients.isSuccess && !clients.isFetching && !clients.error
      ? clients.data.filter(
          (row) =>
            row.status !== "archived" &&
            row.name.toLowerCase().includes(search.toLowerCase()),
        )
      : [];

  const chats = current
    ? (query.data?.pages.flatMap((page) => page.conversations) ?? [])
    : [];

  return { query, current, clients, chats, roster };
}

export function PaletteResults({
  search,
  chats,
  roster,
  navigate,
  chooseClient,
}: {
  search: string;
  chats: readonly ManagedConversation[];
  roster: readonly { id: string; name: string }[];

  navigate(href: string): void;
  chooseClient(client: { id: string; name: string }): void;
}) {
  return (
    <>
      <CommandGroup heading="Commands">
        {[
          { label: "Open General chat", href: "/meri?scope=general" },

          { label: "Manage conversations", href: "/meri/conversations" },

          { label: "Account settings", href: "/settings/personal" },
        ]
          .filter((item) =>
            item.label.toLowerCase().includes(search.toLowerCase()),
          )
          .map((item) => (
            <CommandItem
              key={item.href}
              value={item.href}
              onSelect={() => navigate(item.href)}
            >
              {item.label}
            </CommandItem>
          ))}
      </CommandGroup>

      <CommandGroup heading="Your chats">
        {chats.map((row) => (
          <CommandItem
            key={row.conversationId}
            value={`chat:${row.conversationId}`}
            onSelect={() =>
              navigate(conversationHref(row.clientId, row.conversationId))
            }
          >
            <Image
              src="/design/m2-conversations/conversation.svg"
              width={18}
              height={18}
              alt=""
            />

            {row.title}
            <span>
              {row.scopeKind === "general" ? "General" : "Client chat"}
            </span>
          </CommandItem>
        ))}
      </CommandGroup>

      <CommandGroup heading="Ask Meri about a client">
        {roster.map((row) => (
          <CommandItem
            key={row.id}
            value={`client:${row.id}`}
            onSelect={() => chooseClient({ id: row.id, name: row.name })}
          >
            {row.name}
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}

export function PaletteSearchStatus({
  query,
  clients,
  current,
  chats,
}: ReturnType<typeof usePaletteSearch>) {
  return (
    <>
      {query.isFetching && <p role="status">Searching your chat titles…</p>}

      {query.error && (
        <p role="status">
          Chat title search is unavailable in this environment.
        </p>
      )}

      {clients.error && (
        <p role="status">Client choices could not be verified.</p>
      )}

      {current && !chats.length && <p>No matching chat titles.</p>}

      {query.hasNextPage && (
        <button
          disabled={query.isFetching}
          onClick={() => void query.fetchNextPage()}
        >
          More matching chats
        </button>
      )}
    </>
  );
}
