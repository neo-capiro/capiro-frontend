"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  IntentsInboxResponse,
  IntentsInboxRow,
} from "@capiro/meri-client/intents";
import { useIdentity } from "../../../shared/portfolio/auth/identity";
import { useClients } from "../../../shared/portfolio/api/clients";
import { useMeriCapabilities } from "../../../shared/meri-resources/CapabilityContext";
import { useRecentConversationTitles } from "../../../shared/meri-conversations/history-queries";
import { readApprovalInbox } from "../../../shared/meri-intents/inbox";
import { ConversationReadUnavailable } from "../../../shared/meri-conversations/current-reads";
import { MeriPageHeading } from "../ui/MeriPageHeading";
import ui from "../ui/meri-ui.module.css";
import phone from "../ui/phone-page.module.css";
import { ApprovalInbox } from "./ApprovalInbox";
import { inboxRowView } from "./inbox-view";

/** The Approvals destination: the actor's proposals across conversations, read with the conversation list's visibility. */
export function ApprovalInboxHost({ enabled }: { enabled: boolean }) {
  const identity = useIdentity();
  const capabilities = useMeriCapabilities();
  const current = identity.data;
  let unavailable: string | undefined;
  if (!enabled || capabilities.approvals.status !== "on")
    unavailable = "Approvals are not enabled for this workspace.";
  else if (identity.error)
    unavailable = "Current account access could not be verified.";
  else if (!current?.tenant?.id || identity.isFetching)
    unavailable = "Verifying current account access…";
  return (
    <div className={`${ui.page} ${phone.page}`}>
      <MeriPageHeading
        title="Approvals"
        description="Everything Meri has prepared for your decision, across your conversations."
      />
      <nav aria-label="Related reviews" className={ui.row}>
        <Link href="/meri/memory">Memory review</Link>
        <Link href="/meri/updates">Workspace updates</Link>
      </nav>
      {unavailable || !current?.tenant?.id ? (
        <p role="status">{unavailable}</p>
      ) : (
        <Connected
          key={`${current.tenant.id}:${current.user.id}`}
          tenantId={current.tenant.id}
          actorId={current.user.id}
        />
      )}
    </div>
  );
}

type Cursor = NonNullable<IntentsInboxResponse["next"]>;
type Page =
  | { status: "loading" }
  | {
      status: "ready";
      rows: readonly IntentsInboxRow[];
      next: IntentsInboxResponse["next"];
      pending: IntentsInboxResponse["pending"];
      /** The clock the phases were read against; expiry is judged once per read, not per render. */
      readAt: number;
    }
  | { status: "unavailable"; code: string }
  | { status: "denied" };

function Connected({
  tenantId,
  actorId,
}: {
  tenantId: string;
  actorId: string;
}) {
  const [page, setPage] = useState<Page>({ status: "loading" });
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const alive = useRef(true);
  // One read per cursor: the first page on mount, an older page when the person asks for it.
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void readApprovalInbox(
      { limit: 50, ...(cursor ? { after: cursor } : {}) },
      controller.signal,
      () => alive.current,
      () => {
        alive.current = false;
        setPage({ status: "denied" });
      },
    )
      .then((answer) => {
        if (!alive.current || controller.signal.aborted) return;
        setLoadingMore(false);
        setPage((current) => ({
          status: "ready",
          rows:
            cursor && current.status === "ready"
              ? [...current.rows, ...answer.rows]
              : answer.rows,
          next: answer.next,
          pending: answer.pending,
          readAt: Date.now(),
        }));
      })
      .catch((error: unknown) => {
        if (!alive.current || controller.signal.aborted) return;
        setLoadingMore(false);
        setPage({
          status: "unavailable",
          code:
            error instanceof ConversationReadUnavailable
              ? error.code
              : "UNAVAILABLE",
        });
      });
    return () => {
      alive.current = false;
      controller.abort();
    };
  }, [cursor]);
  const clients = useClients({ scope: { tenantId, userId: actorId } });
  const titles = useRecentConversationTitles({ tenantId, actorId });
  const rows = useMemo(
    () =>
      page.status === "ready"
        ? page.rows.map((row) =>
            inboxRowView(row, {
              clients: clients.data,
              titles,
              now: page.readAt,
            }),
          )
        : [],
    [page, clients.data, titles],
  );
  if (page.status === "denied")
    return (
      <p role="alert">
        Approval access was denied. Reload this page to check current access.
      </p>
    );
  if (page.status === "loading")
    return <p role="status">Reading your proposals…</p>;
  if (page.status === "unavailable")
    return (
      <p role="alert">
        {page.code === "INTENTS_UNAVAILABLE"
          ? "Conversation approvals are not composed for this workspace yet."
          : "Your proposals could not be read right now."}{" "}
        Reload to try again; nothing was decided.
      </p>
    );
  return (
    <ApprovalInbox
      page={{
        rows,
        pending: page.pending,
        hasMore: page.next !== null,
        loadingMore,
      }}
      onLoadMore={() => {
        if (page.next) {
          setLoadingMore(true);
          setCursor(page.next);
        }
      }}
    />
  );
}
