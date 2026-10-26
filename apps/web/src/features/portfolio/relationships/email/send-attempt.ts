import { useSyncExternalStore } from "react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { MailSendError, replyReceiptMatches, type SendInput } from "./send";

type MailAttempt = {
  token: string;
  startedAt: number;
  status: "pending" | "unknown";
  input?: SendInput;
  replyBinding?: Partial<
    Pick<
      SendInput,
      | "operation"
      | "threadId"
      | "originalMessageId"
      | "originalUpdatedAt"
      | "senderConnectionId"
    >
  >;
  error?: MailSendError;
};
const replyBindingSchema = z.object({
  operation: z.literal("reply"),
  threadId: z.uuid(),
  originalMessageId: z.uuid(),
  originalUpdatedAt: z.iso.datetime({ offset: true }),
  senderConnectionId: z.uuid(),
});
const storageKey = (key: QueryKey) =>
  `capiro-mail-intent:${JSON.stringify(key)}`;
function restoreAttempt(key: QueryKey, strict = false): MailAttempt | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const value = JSON.parse(raw) as {
      token?: unknown;
      startedAt?: unknown;
      replyBinding?: unknown;
    };
    if (
      typeof value.token !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(value.token)
    )
      return null;
    const replyBinding = replyBindingSchema.safeParse(value.replyBinding);
    return {
      token: value.token,
      startedAt: typeof value.startedAt === "number" ? value.startedAt : 0,
      status: "unknown",
      ...(value.replyBinding !== undefined
        ? {
            replyBinding: replyBinding.success
              ? replyBinding.data
              : { operation: "reply" as const },
          }
        : {}),
      error: new MailSendError(
        "Checking the original send request. Do not resend while delivery is uncertain.",
        true,
      ),
    };
  } catch (error) {
    if (strict) throw error;
    return null;
  }
}
function persistAttempt(
  key: QueryKey,
  attempt: MailAttempt | null,
  expectedToken?: string,
) {
  // Persist request and reply-origin identity only. Bodies and recipients stay on the server.
  if (attempt)
    localStorage.setItem(
      storageKey(key),
      JSON.stringify({
        token: attempt.token,
        startedAt: attempt.startedAt,
        ...(attempt.replyBinding ? { replyBinding: attempt.replyBinding } : {}),
      }),
    );
  else if (!expectedToken || restoreAttempt(key)?.token === expectedToken)
    localStorage.removeItem(storageKey(key));
}
export const mailAttemptKey = (
  tenantId: string,
  userId: string,
  clientId: string,
  entity: string,
) => ["contact-mail-send-attempt", tenantId, userId, clientId, entity] as const;

export function useMailAttempt(key: QueryKey) {
  const cache = useQueryClient();
  const encoded = JSON.stringify(key);
  return useSyncExternalStore(
    (notify) => {
      const storage = (event: StorageEvent) => {
        if (event.key === storageKey(key)) {
          cache.setQueryData(key, restoreAttempt(key));
          notify();
        }
      };
      window.addEventListener("storage", storage);
      const unsubscribe = cache.getQueryCache().subscribe((event) => {
        if (JSON.stringify(event.query.queryKey) === encoded) notify();
      });
      return () => {
        unsubscribe();
        window.removeEventListener("storage", storage);
      };
    },
    () => {
      const cached = cache.getQueryData<MailAttempt | null>(key);
      if (cached !== undefined) return cached;
      const restored = restoreAttempt(key);
      cache.setQueryData(key, restored);
      return restored;
    },
    () => null,
  );
}

/** Cross-tab reservation; durable server claim remains the send authority. */
export async function beginMailAttempt(
  cache: QueryClient,
  key: QueryKey,
  input: SendInput,
) {
  if (!navigator.locks)
    throw new MailSendError(
      "This browser cannot safely reserve a send request.",
      false,
    );
  return navigator.locks.request(storageKey(key), () => {
    const previous =
      cache.getQueryData<MailAttempt | null>(key) ?? restoreAttempt(key, true);
    if (previous)
      throw new MailSendError(
        "An email for this contact or thread is pending or its delivery is uncertain. Check the original mailbox Sent Items; this attempt cannot be repeated here.",
        previous.status === "unknown",
      );
    const attempt: MailAttempt = {
      token: crypto.randomUUID(),
      startedAt: Date.now(),
      status: "pending",
      input: structuredClone(input),
      ...(input.operation === "reply"
        ? {
            replyBinding: {
              operation: input.operation,
              threadId: input.threadId,
              originalMessageId: input.originalMessageId,
              originalUpdatedAt: input.originalUpdatedAt,
              senderConnectionId: input.senderConnectionId,
            },
          }
        : {}),
    };
    try {
      persistAttempt(key, attempt);
    } catch {
      throw new MailSendError(
        "Allow browser storage before sending so this request can be recovered.",
        false,
      );
    }
    cache.setQueryDefaults(key, { gcTime: Infinity });
    cache.setQueryData(key, attempt);
    return attempt.token;
  });
}

export async function settleMailAttempt(
  cache: QueryClient,
  key: QueryKey,
  token: string,
  error?: unknown,
) {
  return navigator.locks.request(storageKey(key), () => {
    const attempt = cache.getQueryData<MailAttempt | null>(key);
    // The lock and token comparison also cover uncertain writes, not just deletion.
    if (attempt?.token !== token) return false;
    const next: MailAttempt | null =
      error instanceof MailSendError && error.uncertain
        ? { ...attempt, status: "unknown", error }
        : null;
    try {
      const stored = restoreAttempt(key, true);
      if (stored?.token !== token) {
        cache.setQueryData(key, stored);
        return false;
      }
      persistAttempt(key, next, token);
      cache.setQueryData<MailAttempt | null>(key, next);
      return true;
    } catch {
      cache.setQueryData(key, {
        ...attempt,
        status: "unknown",
        error: new MailSendError(
          "Could not save the send result. Check the original request before sending again.",
          true,
        ),
      });
      return false;
    }
  });
}

/** Terminal recovery is released only for the exact reserved request. */
export async function recoverMailAttempt(
  cache: QueryClient,
  key: QueryKey,
  row: {
    requestKey: string;
    state: string;
    ok?: boolean;
    threadId?: string;
    messageId?: string;
    operation?: string;
    originalMessageId?: string;
    originalThreadId?: string;
    originalUpdatedAt?: string;
    senderConnectionId?: string;
  },
) {
  if (row.state === "failed") {
    return (await settleMailAttempt(cache, key, row.requestKey))
      ? ("failed" as const)
      : null;
  }
  if (row.state === "accepted" && row.ok && row.threadId && row.messageId) {
    const attempt = cache.getQueryData<MailAttempt | null>(key);
    const binding =
      attempt?.input ??
      attempt?.replyBinding ??
      restoreAttempt(key)?.replyBinding;
    if (
      binding &&
      (!replyReceiptMatches(row, binding) ||
        (binding.operation === "reply" &&
          row.senderConnectionId !== binding.senderConnectionId))
    )
      return null;
    // After reload only the durable request identity is retained. Require complete
    // origin evidence for a native reply; never infer it from the current composer.
    if (
      !attempt?.input &&
      row.operation === "reply" &&
      (!row.originalMessageId ||
        !row.originalThreadId ||
        !row.originalUpdatedAt ||
        !row.senderConnectionId)
    )
      return null;
    return (await settleMailAttempt(cache, key, row.requestKey))
      ? ("accepted" as const)
      : null;
  }
  return null;
}
