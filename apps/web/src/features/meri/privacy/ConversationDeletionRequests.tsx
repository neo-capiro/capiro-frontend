"use client";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type {
  ConversationDeletionReference,
  ConversationDeletionBefore,
} from "@capiro/meri-contracts/conversation-history";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  listConversationDeletions,
  readConversationDeletionStatus,
  MANAGEMENT_VERSION,
} from "@/shared/meri-conversations/history-client";
import { SettingsCard } from "../screens/settings/SettingsCard";
import { deletionStatusView } from "./deletion-status-view";
import ui from "../ui/meri-ui.module.css";
import styles from "../screens/settings/settings.module.css";

/** These receipts are actor-owned and content-free; no conversation title or
 * client access is inferred from the ability to read a deletion outcome. */
export function ConversationDeletionRequests() {
  const identity = useIdentity();
  const account =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const scope = account?.tenant?.id
    ? [account.tenant.id, account.user.id]
    : undefined;
  return (
    <SettingsCard
      title="Conversation deletion requests"
      description="Check a saved request without opening its deleted content. Status is a read-only observation; checking does not start another deletion."
    >
      {scope ? (
        <RequestList key={JSON.stringify(scope)} scope={scope} />
      ) : (
        <p role="status">
          Current account access must be verified before deletion requests can
          be shown.
        </p>
      )}
      <p className={ui.muted}>
        These results cover conversation cleanup. Separately approved memory,
        independently saved records, and copies shared elsewhere follow their
        own retention policies.
      </p>
    </SettingsCard>
  );
}

function RequestList({ scope }: { scope: string[] }) {
  const query = useInfiniteQuery({
    queryKey: ["meri-deletion-requests", ...scope],
    initialPageParam: null as ConversationDeletionBefore | null,
    queryFn: ({ signal, pageParam }) =>
      listConversationDeletions(
        { version: MANAGEMENT_VERSION, before: pageParam },
        signal,
      ),
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const current = query.isSuccess && !query.isFetching && !query.error;
  const pages = current ? query.data.pages : [];
  const rows = pages.flatMap((page) => page.requests);
  return (
    <div>
      <QueryState
        pending={query.isFetching}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <button
        className={ui.outline}
        type="button"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        Refresh requests
      </button>
      {current && rows.length === 0 ? (
        <p>No deletion requests were returned.</p>
      ) : null}
      {pages.some((page) => page.olderRequestsUnavailable) ? (
        <p role="status">
          Some older request references are unavailable. Their deletion status
          cannot be inferred from this list.
        </p>
      ) : null}
      <ul className={styles.stack} aria-label="Saved deletion requests">
        {rows.map((row) => (
          <RequestRow key={row.requestId} reference={row} scope={scope} />
        ))}
      </ul>
      {current && query.hasNextPage ? (
        <button
          className={ui.outline}
          type="button"
          onClick={() => void query.fetchNextPage()}
        >
          Older requests
        </button>
      ) : null}
    </div>
  );
}

function RequestRow({
  reference,
  scope,
}: {
  reference: ConversationDeletionReference;
  scope: string[];
}) {
  const [opened, setOpened] = useState(false);
  const query = useQuery({
    queryKey: ["meri-deletion-status", ...scope, reference.requestId],
    enabled: opened,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: ({ signal }) =>
      readConversationDeletionStatus(
        { version: MANAGEMENT_VERSION, requestId: reference.requestId },
        signal,
      ),
  });
  const current =
    opened && query.isSuccess && !query.isFetching && !query.error;
  const view = current ? deletionStatusView(query.data) : undefined;
  return (
    <li>
      <p>
        Request {reference.requestId.slice(0, 8)} ·{" "}
        <time dateTime={reference.createdAt}>{reference.createdAt}</time>
      </p>
      <p className={ui.muted}>
        Conversation {reference.conversationId.slice(0, 8)} · Restore deadline:{" "}
        {reference.restoreUntil}
      </p>
      <button
        className={ui.outline}
        type="button"
        disabled={query.isFetching}
        onClick={() => {
          if (opened) void query.refetch();
          else setOpened(true);
        }}
      >
        {opened ? "Check status again" : "Check deletion status"}
      </button>
      {opened ? (
        <QueryState
          pending={query.isFetching}
          error={query.error}
          retry={() => void query.refetch()}
        />
      ) : (
        <p>Status not checked.</p>
      )}
      {view ? (
        <div role="status">
          <strong>{view.label}</strong>
          <p>{view.detail}</p>
          <p>
            Checked: <time dateTime={view.checkedAt}>{view.checkedAt}</time>
          </p>
          {view.retained ? <p>{view.retained}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
