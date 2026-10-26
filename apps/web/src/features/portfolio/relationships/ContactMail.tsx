"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { type MailContact, type MailThread } from "./email";
import { useContactThreads, useMailThread } from "./email";
import { MailCompose } from "./MailCompose";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import {
  defaultMailFilters,
  readMailThreadPage,
  type MailFilters,
  type MailReadScope,
  type MailThreadPage,
  type MailReplyContext,
} from "./email/read";
import { MailCoverageNotice, ThreadContent } from "./thread/ThreadContent";
export function ContactMail({
  clientId,
  person,
}: {
  clientId: string;
  person: MailContact;
}) {
  const [filters, setFilters] = useState(defaultMailFilters);
  const query = useContactThreads(clientId, person.email, filters);
  const [selected, setSelected] = useState<string | null>(null);
  const [compose, setCompose] = useState<"new" | null>(null);
  const thread = useMailThread(selected, clientId, person.email);
  const [bodyError, setBodyError] = useState<Error | null>(null);
  const contactKey = JSON.stringify([clientId, person.personId, person.email]);
  const [readScope, setReadScope] = useState({
    contactKey,
    historyError: query.error,
    threadError: thread.error,
  });
  const contactChanged = readScope.contactKey !== contactKey;
  if (
    contactChanged ||
    readScope.historyError !== query.error ||
    readScope.threadError !== thread.error
  ) {
    setReadScope({
      contactKey,
      historyError: query.error,
      threadError: thread.error,
    });
    if (contactChanged || query.error) {
      setSelected(null);
      setCompose(null);
      setBodyError(null);
      if (contactChanged) setFilters(defaultMailFilters);
    }
  }
  const history =
    !contactChanged && query.isSuccess && !query.error
      ? query.data?.items
      : undefined;
  const currentThread =
    history &&
    thread.isSuccess &&
    !thread.error &&
    !bodyError &&
    thread.data.id === selected
      ? thread.data
      : undefined;
  return (
    <section className="stack">
      <header className="row between">
        <h3>Message history</h3>
        <button
          className="button"
          disabled={!person.email || !history || query.isFetching}
          onClick={() => {
            if (history && !query.isFetching) setCompose("new");
          }}
        >
          Mail
        </button>
      </header>
      {person.email ? (
        <>
          <ContactMailFilters
            key={contactKey}
            onApply={(next) => {
              setSelected(null);
              setCompose(null);
              setBodyError(null);
              setFilters(next);
            }}
          />
          <QueryState
            pending={query.isPending}
            error={query.error}
            retry={() => void query.restart()}
          />
          {history?.map((item) => (
            <button
              className="button ghost"
              key={item.id}
              disabled={query.isFetching}
              onClick={() => {
                if (history && !query.isFetching) {
                  setBodyError(null);
                  setSelected(item.id);
                }
              }}
            >
              <span>
                <strong>{item.subject}</strong>
                <p className="muted">{item.snippet}</p>
                <p className="muted">
                  <small>
                    <ContactMessageDate messages={item.messages} />
                  </small>
                </p>
              </span>
            </button>
          ))}
          {history?.length === 0 && (
            <p className="muted">
              No accessible messages match this contact and the selected
              filters.
            </p>
          )}
          {history && (
            <>
              {query.hasNextPage && (
                <button
                  className="button"
                  disabled={query.isFetching}
                  onClick={() => void query.fetchNextPage()}
                >
                  {query.isFetchingNextPage
                    ? "Loading threads…"
                    : "Load more threads"}
                </button>
              )}
              <button
                className="button ghost"
                disabled={query.isFetching}
                onClick={() => {
                  setSelected(null);
                  setCompose(null);
                  setBodyError(null);
                  void query.restart();
                }}
              >
                Refresh history
              </button>
              {query.data?.mailboxes.map((box) => (
                <div key={box.id}>
                  <small>{box.email ?? "Accessible mailbox"}</small>
                  <MailCoverageNotice coverage={box.coverage} />
                </div>
              ))}
              {query.data?.coverageTruncated && (
                <small>Coverage is shown for up to 50 mailboxes.</small>
              )}
              {!query.data?.mailboxes.length && (
                <small>No mailbox coverage is available.</small>
              )}
              <small>
                Stored active mail only. New sync or edits can move threads
                between pages. Refresh history to restart. Thread previews and
                mailbox coverage are bounded.
              </small>
            </>
          )}
        </>
      ) : (
        <p className="muted">
          Add an email address to view mail for this contact.
        </p>
      )}
      <Dialog
        open={Boolean(history && selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={currentThread?.subject ?? "Mail thread"}
        drawer
      >
        <QueryState
          pending={thread.isPending}
          error={thread.error ?? bodyError}
          retry={() => {
            setBodyError(null);
            void thread.restart();
          }}
        />
        {currentThread && (
          <>
            <ThreadContent
              thread={currentThread}
              scope={thread.scope}
              onReadError={setBodyError}
            />
            <small>
              {currentThread.messages.length} of {currentThread.totalMessages}{" "}
              stored messages loaded.
            </small>
            <MailCoverageNotice coverage={currentThread.coverage} />
            {thread.hasNextPage && (
              <button
                className="button"
                disabled={thread.isFetching}
                onClick={() => void thread.fetchNextPage()}
              >
                {thread.isFetchingNextPage
                  ? "Loading messages…"
                  : "Load more messages"}
              </button>
            )}
            {currentThread.hasMore && !thread.hasNextPage && (
              <p className="muted">
                The stored thread read limit was reached. Review remaining
                messages in your mailbox.
              </p>
            )}
            <button
              className="button ghost"
              disabled={thread.isFetching}
              onClick={() => {
                setCompose(null);
                setBodyError(null);
                void thread.restart();
              }}
            >
              Refresh thread
            </button>
          </>
        )}
        {currentThread && (
          <ContactReply
            key={JSON.stringify(thread.scope)}
            thread={currentThread}
            busy={thread.isFetching || query.isFetching}
            scope={thread.scope}
            clientId={clientId}
            person={person}
          />
        )}
      </Dialog>
      {history && compose && (
        <MailCompose
          key={`${compose}:${selected}`}
          clientId={clientId}
          person={person}
          onClose={() => setCompose(null)}
        />
      )}
    </section>
  );
}

function ContactReply({
  thread,
  busy,
  scope,
  clientId,
  person,
}: {
  thread: MailThreadPage;
  busy: boolean;
  scope: MailReadScope;
  clientId: string;
  person: MailContact;
}) {
  const api = useApi();
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState<Extract<
    MailReplyContext,
    { supported: true }
  > | null>(null);
  const original = thread.messages.find((message) => message.id === selected);
  const query = useQuery({
    queryKey: [
      "mail-reply-context",
      scope,
      thread.updatedAt,
      selected,
      original?.bodySha256,
    ],
    enabled: Boolean(original),
    retry: false,
    queryFn: ({ signal }) =>
      readMailThreadPage(
        api,
        scope,
        { expectedUpdatedAt: thread.updatedAt },
        signal,
        {
          messageId: original!.id,
          bodyOffset: 0,
          expectedBodySha256: original!.bodySha256,
        },
      ),
  });
  const reply =
    query.isSuccess && !query.error && !query.isFetching
      ? query.data.messages[0]?.replyContext
      : undefined;
  if (
    open &&
    (!original ||
      open.senderConnectionId !== thread.connectionId ||
      query.isError ||
      (query.isSuccess &&
        !query.isFetching &&
        JSON.stringify(reply) !== JSON.stringify(open)))
  )
    setOpen(null);
  return (
    <section className="stack" aria-label="Reply to an original message">
      <label>
        Original message
        <select
          aria-label="Original message"
          disabled={busy}
          value={selected}
          onChange={(event) => {
            setOpen(null);
            setSelected(event.target.value);
          }}
        >
          <option value="">Choose the incoming message to reply to</option>
          {thread.messages.map((message) => (
            <option key={message.id} value={message.id}>
              {message.fromEmail ?? "Unknown sender"} —{" "}
              {message.sentAt ?? message.receivedAt ?? message.createdAt}
            </option>
          ))}
        </select>
      </label>
      <small>
        Reply to one verified Gmail or Outlook sender. Reply all and forwarding are
        unavailable here.
      </small>
      {original && (
        <QueryState pending={query.isFetching} error={query.error} />
      )}
      {reply?.supported === false && <p role="note">{reply.reason}</p>}
      {query.isSuccess && !query.isFetching && !reply && (
        <p role="note">
          Native reply is unavailable for this original. Reply from your
          mailbox.
        </p>
      )}
      <button
        className="button"
        disabled={busy || !reply?.supported}
        onClick={() => {
          if (!busy && reply?.supported) setOpen(reply);
        }}
      >
        Reply to {person.name}
      </button>
      {open && (
        <MailCompose
          key={`${selected}:${open.originalUpdatedAt}`}
          clientId={clientId}
          person={person}
          thread={{ id: thread.id, subject: open.subject }}
          reply={open}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}

function ContactMailFilters({
  onApply,
}: {
  onApply: (filters: MailFilters) => void;
}) {
  return (
    <form
      className="row wrap"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const folder = String(values.get("folder"));
        onApply({
          query: String(values.get("query") ?? "").trim(),
          withinDays: String(values.get("withinDays") ?? ""),
          folder: folder === "inbox" || folder === "sent" ? folder : "all",
        });
      }}
    >
      <label>
        Search stored mail
        <input name="query" type="search" maxLength={200} className="input" />
      </label>
      <label>
        Folder
        <select name="folder" className="input">
          <option value="all">All stored folders</option>
          <option value="inbox">Inbox</option>
          <option value="sent">Sent</option>
        </select>
      </label>
      <label>
        Message date
        <select name="withinDays" className="input">
          <option value="">All stored dates</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </label>
      <button className="button" type="submit">
        Apply mail filters
      </button>
    </form>
  );
}

function ContactMessageDate({
  messages,
}: {
  messages: MailThread["messages"];
}) {
  let latest: { value: string; instant: number } | undefined;
  for (const message of messages) {
    const value = message.sentAt ?? message.receivedAt ?? message.createdAt;
    const instant = Date.parse(value);
    if (Number.isFinite(instant) && (!latest || instant > latest.instant))
      latest = { value, instant };
  }
  if (!latest) return "Date unavailable";
  const date = new Date(latest.instant);
  return (
    <time dateTime={latest.value} title="Latest available message date">
      {date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
      {" · "}
      {date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })}
    </time>
  );
}
