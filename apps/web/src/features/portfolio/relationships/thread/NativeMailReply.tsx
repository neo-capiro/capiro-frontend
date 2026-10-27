"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { MailCompose } from "../MailCompose";
import type { MailContact } from "../email";
import {
  readMailThreadPage,
  type MailReadScope,
  type MailThreadPage,
  type MailReplyContext,
} from "../email/read";

export function NativeMailReply({
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
  person?: MailContact;
}) {
  const api = useApi();
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState<{
    reply: Extract<MailReplyContext, { supported: true }>;
    source: string;
  } | null>(null);
  const original = thread.messages.find((message) => message.id === selected);
  const source = JSON.stringify([
    scope,
    selected,
    original?.bodySha256,
    thread.connectionId,
  ]);
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
  const replyAll =
    query.isSuccess && !query.error && !query.isFetching
      ? query.data.messages[0]?.replyAllContext
      : undefined;
  const forward =
    query.isSuccess && !query.error && !query.isFetching
      ? query.data.messages[0]?.forwardContext
      : undefined;
  if (
    open &&
    (!original ||
      open.source !== source ||
      open.reply.senderConnectionId !== thread.connectionId ||
      query.isError ||
      (query.isSuccess &&
        !query.isFetching &&
        JSON.stringify(
          open.reply.operation === "forward"
            ? forward
            : open.reply.operation === "reply_all"
              ? replyAll
              : reply,
        ) !== JSON.stringify(open.reply)))
  )
    setOpen(null);
  return (
    <section
      className="stack"
      style={{ minWidth: 0 }}
      aria-label="Reply to an original message"
    >
      <label>
        Original message
        <select
          aria-label="Original message"
          style={{ width: "100%", minWidth: 0 }}
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
        Reply to the verified sender or review all visible To and Cc recipients.
        Known own addresses are excluded; review every recipient. Forward
        supports complete plain-text originals without incoming files.
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
          if (!busy && reply?.supported) setOpen({ reply, source });
        }}
      >
        {person
          ? `Reply to ${person.name}`
          : reply?.supported
            ? `Reply to ${reply.to[0]!.email}`
            : "Reply"}
      </button>
      <button
        className="button"
        disabled={busy || !replyAll?.supported}
        onClick={() => {
          if (!busy && replyAll?.supported)
            setOpen({ reply: replyAll, source });
        }}
      >
        Reply all
      </button>
      {replyAll?.supported === false && (
        <small>
          Reply all is unavailable for this original. Use your mailbox to review
          its full recipient list.
        </small>
      )}
      <button
        className="button"
        disabled={busy || !forward?.supported}
        onClick={() => {
          if (!busy && forward?.supported) setOpen({ reply: forward, source });
        }}
      >
        Forward plain text
      </button>
      {forward?.supported === false && <small>{forward.reason}</small>}
      {open && (
        <MailCompose
          key={`${selected}:${open.reply.originalUpdatedAt}:${open.reply.operation}`}
          clientId={clientId}
          person={
            person ?? {
              name: open.reply.to[0]?.email ?? "Forward recipients",
              email: open.reply.to[0]?.email ?? null,
              title: null,
            }
          }
          thread={{ id: thread.id, subject: open.reply.subject }}
          reply={open.reply}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
