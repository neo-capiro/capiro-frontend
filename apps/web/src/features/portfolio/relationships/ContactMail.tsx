"use client";
import { useState } from "react";
import { type MailContact } from "./email";
import { useContactThreads, useMailThread } from "./email";
import { MailCompose } from "./MailCompose";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
export function ContactMail({
  clientId,
  person,
}: {
  clientId: string;
  person: MailContact;
}) {
  const query = useContactThreads(clientId, person.email);
  const [selected, setSelected] = useState<string | null>(null);
  const [compose, setCompose] = useState<"new" | "reply" | null>(null);
  const thread = useMailThread(selected);
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
    } else if (thread.error && compose === "reply") setCompose(null);
  }
  const history =
    !contactChanged && query.isSuccess && !query.error ? query.data : undefined;
  const currentThread =
    history && thread.isSuccess && !thread.error && thread.data.id === selected
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
          <QueryState
            pending={query.isPending}
            error={query.error}
            retry={() => void query.refetch()}
          />
          {history?.map((item) => (
            <button
              className="button ghost"
              key={item.id}
              disabled={query.isFetching}
              onClick={() => {
                if (history && !query.isFetching) setSelected(item.id);
              }}
            >
              <span>
                <strong>{item.subject}</strong>
                <p className="muted">{item.snippet}</p>
              </span>
            </button>
          ))}
          {history?.length === 0 && (
            <p className="muted">No accessible messages for this contact.</p>
          )}
          <small>
            Up to 50 recent client threads from your accessible mailbox. Open a
            thread to read its full message history.
          </small>
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
          error={thread.error}
          retry={() => void thread.refetch()}
        />
        {currentThread?.messages.map((message) => (
          <article className="card stack" key={message.id}>
            <strong>
              {message.fromName ?? message.fromEmail ?? "Unknown sender"}
            </strong>
            <small>
              {new Date(
                message.sentAt ?? message.receivedAt ?? message.createdAt,
              ).toLocaleString()}
            </small>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {message.bodyText ?? "Message text is not available."}
            </p>
          </article>
        ))}
        {currentThread && (
          <button
            className="button"
            disabled={thread.isFetching || query.isFetching}
            onClick={() => {
              if (!thread.isFetching && !query.isFetching) setCompose("reply");
            }}
          >
            Reply to {person.name}
          </button>
        )}
      </Dialog>
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
