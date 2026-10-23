"use client";
import { useState } from "react";
import { type MailContact, useContactThreads, useMailThread } from "./email";
import type { MailFilters } from "./email/read-contracts";
import { MailCompose } from "./MailCompose";
import { ThreadContent } from "./thread/ThreadContent";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { MailHistoryFilters, ContactHistory } from "./email/ContactMailHistory";

type ContactMailProps = { clientId: string; person: MailContact };

function useContactMail({ clientId, person }: ContactMailProps) {
  const [filters, setFilters] = useState<MailFilters>({});
  const query = useContactThreads(clientId, person.email, filters);
  const [selected, setSelected] = useState<string | null>(null);
  const [compose, setCompose] = useState<"new" | "reply" | null>(null);
  const [bodyError, setBodyError] = useState<Error | null>(null);
  const thread = useMailThread(
    selected,
    clientId,
    Boolean(query.data),
    person.email ?? undefined,
  );
  const contactKey = JSON.stringify([
    query.scope.tenantId,
    query.scope.userId,
    clientId,
    person.personId,
    person.email,
    filters,
  ]);
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
    } else if (thread.error && compose === "reply") setCompose(null);
  }
  const history =
    !contactChanged && query.isSuccess && !query.error ? query.data : undefined;
  const currentThread =
    history &&
    thread.isSuccess &&
    !thread.error &&
    !bodyError &&
    !thread.isFetching &&
    thread.data?.id === selected
      ? thread.data
      : undefined;
  function refreshHistory() {
    setSelected(null);
    setCompose(null);
    setBodyError(null);
    void query.refresh();
  }
  async function refreshThread() {
    const previous = bodyError;
    setCompose(null);
    await thread.refresh();
    setBodyError((current) => (current === previous ? null : current));
  }
  function bodyFailed(error: Error) {
    setBodyError(error);
    setCompose(null);
  }
  return {
    query,
    history,
    thread,
    currentThread,
    selected,
    setSelected,
    compose,
    setCompose,
    bodyError,
    setBodyError,
    setFilters,
    refreshHistory,
    refreshThread,
    bodyFailed,
  };
}

export function ContactMail({ clientId, person }: ContactMailProps) {
  const state = useContactMail({ clientId, person });
  const {
    query,
    history,
    selected,
    setSelected,
    compose,
    setCompose,
    currentThread,
    setBodyError,
    setFilters,
    refreshHistory,
  } = state;
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
          <MailHistoryFilters
            disabled={query.isFetching}
            onApply={setFilters}
          />
          <QueryState
            pending={query.isPending}
            error={query.error}
            retry={refreshHistory}
          />
          <ContactHistory
            history={history}
            query={query}
            refresh={refreshHistory}
            select={(id) => {
              setBodyError(null);
              setSelected(id);
            }}
          />
        </>
      ) : (
        <p className="muted">
          Add an email address to view mail for this contact.
        </p>
      )}
      <ContactThreadDrawer state={state} person={person} />
      {history && compose && (compose === "new" || currentThread) && (
        <MailCompose
          key={`${compose}:${selected}`}
          clientId={clientId}
          person={person}
          thread={
            compose === "reply" && currentThread
              ? { id: currentThread.id, subject: currentThread.subject }
              : undefined
          }
          onClose={() => setCompose(null)}
        />
      )}
    </section>
  );
}

function ContactThreadDrawer({
  state,
  person,
}: {
  state: ReturnType<typeof useContactMail>;
  person: MailContact;
}) {
  const {
    history,
    selected,
    setSelected,
    currentThread,
    thread,
    query,
    bodyError,
    refreshThread,
    bodyFailed,
    setCompose,
  } = state;
  return (
    <Dialog
      open={Boolean(history && selected)}
      onOpenChange={(open) => {
        if (!open) setSelected(null);
      }}
      title={currentThread?.subject ?? "Mail thread"}
      drawer
    >
      <QueryState
        pending={thread.isPending || thread.isFetching}
        error={bodyError ?? thread.error}
        retry={refreshThread}
      />
      {currentThread && (
        <>
          <ThreadContent
            thread={currentThread}
            scope={thread.scope}
            onReadFailure={bodyFailed}
          />
          <div className="row">
            {thread.hasNextPage && (
              <button
                className="button"
                onClick={() => void thread.fetchNextPage()}
              >
                Load more messages
              </button>
            )}
            <button className="button ghost" onClick={refreshThread}>
              Refresh thread
            </button>
            <button
              className="button"
              disabled={thread.isFetching || query.isFetching}
              onClick={() => {
                if (!thread.isFetching && !query.isFetching)
                  setCompose("reply");
              }}
            >
              Reply to {person.name}
            </button>
          </div>
          <small className="muted">
            {currentThread.messages.length} of {currentThread.totalMessages}{" "}
            stored messages.{" "}
            {currentThread.hasMore
              ? thread.hasNextPage
                ? "More stored messages are available."
                : "Further messages exceed this reading limit. Open your mailbox to continue."
              : "End of stored messages."}{" "}
            Provider history may be incomplete.
          </small>
        </>
      )}
    </Dialog>
  );
}
