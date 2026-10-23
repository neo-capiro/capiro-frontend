"use client";
import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { mailThreadKey, readBodyPage, useMailReadScope } from "./read-pages";
import type {
  MailReadScope,
  MailThreadPage,
  StoredMailMessage,
} from "./read-contracts";

type BodyProps = {
  thread: MailThreadPage;
  message: StoredMailMessage;
  scope: MailReadScope;
  onReadFailure: (error: Error) => void;
};

function useStoredBody({ thread, message, scope, onReadFailure }: BodyProps) {
  const api = useApi();
  const access = useMailReadScope(scope.clientId ?? scope.associationClientId);
  const active =
    access.active &&
    access.scope.tenantId === scope.tenantId &&
    access.scope.userId === scope.userId;
  const query = useInfiniteQuery({
    queryKey: [
      "mail-body",
      ...mailThreadKey(scope, thread.id),
      message.id,
      message.bodySha256,
      thread.asOf,
      thread.updatedAt,
    ],
    enabled: false,
    retry: false,
    initialPageParam: 0,
    initialData: { pages: [message], pageParams: [0] },
    queryFn: async ({ signal, pageParam }) => {
      access.assertCurrent();
      const page = await readBodyPage(
        api,
        scope,
        thread,
        message.id,
        message.bodySha256,
        pageParam,
        signal,
      );
      access.assertCurrent();
      return page;
    },
    getNextPageParam: (page) =>
      page.nextBodyOffset !== null && page.nextBodyOffset <= 10_000_000
        ? page.nextBodyOffset
        : null,
  });
  useEffect(() => {
    if (query.error) onReadFailure(query.error);
  }, [query.error, onReadFailure]);
  return { active, query };
}

export function MailMessageBody(props: BodyProps) {
  const { message } = props;
  const { active, query } = useStoredBody(props);
  if (!active || query.error)
    return <QueryState pending={!active} error={query.error} />;
  const pages = query.data.pages;
  const last = pages[pages.length - 1]!;
  return (
    <div className="stack">
      <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {!message.bodyStoredPresent
          ? "Stored message text is unavailable."
          : message.bodyLength === 0
            ? "This stored message has no text."
            : pages.map((page) => page.bodyText).join("")}
      </p>
      {query.isFetchingNextPage && (
        <p role="status">Loading more message text…</p>
      )}
      {query.hasNextPage ? (
        <button
          className="button ghost"
          disabled={query.isFetching}
          onClick={() => void query.fetchNextPage()}
        >
          Load more message text
        </button>
      ) : last.nextBodyOffset !== null ? (
        <small className="muted">
          This message exceeds the stored-view reading limit. Open it in your
          mailbox.
        </small>
      ) : message.bodyStoredPresent ? (
        <small className="muted">
          {message.bodyCompleteness === "full"
            ? "End of stored message text."
            : message.bodyCompleteness === "preview"
              ? "Only a provider preview was stored. Open your mailbox for the full message."
              : message.bodyCompleteness === "truncated"
                ? "The stored body was truncated. Open your mailbox for the full message."
                : "End of available text. Completeness of this stored body is unknown."}
        </small>
      ) : null}
    </div>
  );
}
