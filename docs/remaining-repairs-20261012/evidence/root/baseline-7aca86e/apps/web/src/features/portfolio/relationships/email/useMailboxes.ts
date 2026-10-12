"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { useMailAuthority } from "./authority";
import { sendingMailboxesSchema } from "./mailboxes";

export function useMailboxes(
  clientId: string,
  threadId?: string,
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
    queryKey: ["sending-thread-mailbox", ...scope, threadId],
    enabled: enabled && authority.ready && Boolean(threadId),
    retry: false,
    refetchOnMount: "always",
    queryFn: async ({ signal }) => {
      const assert = authority.capture();
      const thread = await api.request(
        "core",
        `engagement/mail-threads/${encodeURIComponent(threadId ?? "")}`,
        z
          .object({ id: z.uuid(), clientId: z.uuid(), connectionId: z.uuid() })
          .refine(
            (value) => value.id === threadId && value.clientId === clientId,
          ),
        { signal },
      );
      assert();
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
