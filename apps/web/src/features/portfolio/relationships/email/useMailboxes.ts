"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { useMailAuthority } from "./authority";
import { sendingMailboxesSchema } from "./mailboxes";
import { readMailThreadPage } from "./read";

export function useMailboxes(
  clientId: string,
  threadId: string | undefined,
  recipientEmail: string | null,
  enabled = true,
) {
  const api = useApi();
  const identity = useIdentity();
  const authority = useMailAuthority(clientId);
  const [selection, setSelection] = useState("");
  const scope = [identity.data?.tenant?.id, identity.data?.user.id, clientId];
  const mailboxes = useQuery({
    queryKey: ["sending-mailboxes", ...scope],
    enabled: enabled && authority.ready,
    retry: false,
    refetchOnMount: "always",
    queryFn: async ({ signal }) => {
      const assert = authority.capture();
      const rows = await api.request(
        "core",
        "engagement/mail/mailboxes",
        sendingMailboxesSchema,
        { signal },
      );
      assert();
      return rows;
    },
  });
  const origin = useQuery({
    queryKey: ["sending-thread-mailbox", ...scope, threadId, recipientEmail],
    enabled: enabled && authority.ready && Boolean(threadId),
    retry: false,
    refetchOnMount: "always",
    queryFn: async ({ signal }) => {
      const assert = authority.capture();
      const thread = await readMailThreadPage(
        api,
        {
          tenantId: identity.data?.tenant?.id ?? "",
          userId: identity.data?.user.id ?? "",
          threadId: threadId ?? "",
          associationClientId: clientId,
          recipientEmails: recipientEmail ?? "",
        },
        {},
        signal,
      );
      assert();
      // Core admits recipient-associated history for reading across clients, but
      // a reply may only use an unassigned thread or this exact direct client.
      if (thread.clientId !== null && thread.clientId !== clientId)
        throw new Error("The reply thread belongs to another client.");
      return thread;
    },
  });
  const listCurrent =
    enabled &&
    authority.ready &&
    mailboxes.isSuccess &&
    !mailboxes.error &&
    !mailboxes.isFetching;
  const rows = listCurrent ? mailboxes.data : [];
  const originCurrent =
    !threadId || (origin.isSuccess && !origin.error && !origin.isFetching);
  const selectedId = threadId
    ? (origin.data?.connectionId ?? "")
    : (selection ?? "");
  const selected = originCurrent
    ? rows.find((row) => row.id === selectedId)
    : undefined;
  return {
    rows,
    selected,
    selectedId,
    select: setSelection,
    lockedToThread: Boolean(threadId),
    loading:
      enabled &&
      authority.ready &&
      (mailboxes.isPending ||
        mailboxes.isFetching ||
        Boolean(threadId && (origin.isPending || origin.isFetching))),
    error: mailboxes.error ?? (threadId ? origin.error : null),
    refresh: async () => {
      await mailboxes.refetch();
      if (threadId) await origin.refetch();
    },
  };
}
