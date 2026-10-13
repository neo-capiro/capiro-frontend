import { useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { MailSendError, type SendInput } from "./send";

type MailAttempt = {
  token: string;
  status: "pending" | "unknown";
  input: SendInput;
  error?: MailSendError;
};
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
    (notify) =>
      cache.getQueryCache().subscribe((event) => {
        if (JSON.stringify(event.query.queryKey) === encoded) notify();
      }),
    () => cache.getQueryData<MailAttempt | null>(key) ?? null,
    () => null,
  );
}

/** Same-session replay protection, never a provider delivery receipt. */
export function beginMailAttempt(
  cache: QueryClient,
  key: QueryKey,
  input: SendInput,
) {
  const previous = cache.getQueryData<MailAttempt | null>(key);
  if (previous)
    throw new MailSendError(
      "An email for this contact or thread is pending or its delivery is uncertain. Check the original mailbox Sent Items; this attempt cannot be repeated here.",
      previous.status === "unknown",
    );
  const attempt: MailAttempt = {
    token: crypto.randomUUID(),
    status: "pending",
    input: structuredClone(input),
  };
  cache.setQueryDefaults(key, { gcTime: Infinity });
  cache.setQueryData(key, attempt);
  return attempt.token;
}

export function settleMailAttempt(
  cache: QueryClient,
  key: QueryKey,
  token: string,
  error?: unknown,
) {
  const attempt = cache.getQueryData<MailAttempt | null>(key);
  // Cleared/replaced scope and newer attempts own their own state.
  if (attempt?.token !== token) return;
  const next: MailAttempt | null =
    error instanceof MailSendError && error.uncertain
      ? { ...attempt, status: "unknown", error }
      : null;
  cache.setQueryData<MailAttempt | null>(key, next);
}
