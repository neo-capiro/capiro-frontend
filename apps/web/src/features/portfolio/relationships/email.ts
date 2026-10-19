"use client";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { MailSendError, sendReviewedMail, type SendInput } from "./email/send";
import { useMailAuthority } from "./email/authority";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  beginMailAttempt,
  mailAttemptKey,
  settleMailAttempt,
  useMailAttempt,
} from "./email/send-attempt";
const recipientSchema = z.object({
  email: z.string(),
  name: z.string().nullable().optional(),
});
export const messageSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().nullable(),
  fromEmail: z.string().nullable(),
  fromName: z.string().nullable(),
  toRecipients: z.array(recipientSchema),
  ccRecipients: z.array(recipientSchema),
  bodyText: z.string().nullable(),
  sentAt: z.string().nullable(),
  receivedAt: z.string().nullable(),
  createdAt: z.string(),
});
export const threadSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().nullable(),
  subject: z.string(),
  snippet: z.string().nullable(),
  connectionEmail: z.string().nullable(),
  participants: z.array(recipientSchema),
  messages: z.array(messageSchema),
});
export type MailThread = z.infer<typeof threadSchema>;
export function threadsForRecipient(threads: MailThread[], email: string) {
  const target = email.trim().toLowerCase();
  return threads.filter(
    (thread) =>
      thread.participants.some((p) => p.email.toLowerCase() === target) ||
      thread.messages.some(
        (message) =>
          message.fromEmail?.toLowerCase() === target ||
          [...message.toRecipients, ...message.ccRecipients].some(
            (p) => p.email.toLowerCase() === target,
          ),
      ),
  );
}
export { plainMailHtml } from "./email/mail-body";
export function useContactThreads(clientId: string, email: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: ["contact-mail", clientId, email],
    enabled: Boolean(email),
    queryFn: async ({ signal }) =>
      threadsForRecipient(
        await api.request(
          "core",
          `engagement/mail-threads?clientId=${clientId}&recipientEmails=${encodeURIComponent(email ?? "")}`,
          z.array(threadSchema),
          { signal },
        ),
        email ?? "",
      ),
  });
}
export function useMailThread(id: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: ["mail-thread", id],
    enabled: Boolean(id),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `engagement/mail-threads/${id}`,
        threadSchema.refine(
          (thread) => thread.id === id,
          "Requested mail thread mismatch",
        ),
        {
          signal,
        },
      ),
  });
}
export function useSignature() {
  const api = useApi();
  return useQuery({
    queryKey: ["email-signature"],
    queryFn: ({ signal }) =>
      api.request(
        "core",
        "me/email-signature",
        z.object({ html: z.string().nullable(), enabled: z.boolean() }),
        { signal },
      ),
  });
}
export type MailContact = {
  personId?: string;
  name: string;
  title: string | null;
  email: string | null;
};
export function useSendMail(clientId: string, entity: string) {
  const api = useApi();
  const cache = useQueryClient();
  const authority = useMailAuthority(clientId);
  const identity = useIdentity();
  const key = mailAttemptKey(
    identity.data?.tenant?.id ?? "",
    identity.data?.user.id ?? "",
    clientId,
    entity,
  );
  const attempt = useMailAttempt(key);
  const mutation = useMutation({
    retry: false,
    mutationFn: async (body: SendInput) => {
      if (body.clientId !== clientId)
        throw new MailSendError("This email belongs to another client.", false);
      const assert = authority.capture();
      const token = beginMailAttempt(cache, key, body);
      try {
        const result = await sendReviewedMail(api, body, assert);
        settleMailAttempt(cache, key, token);
        return result;
      } catch (error) {
        settleMailAttempt(cache, key, token, error);
        throw error;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["contact-mail"] }),
        cache.invalidateQueries({ queryKey: ["mail-thread"] }),
        cache.invalidateQueries({ queryKey: ["client-profile"] }),
      ]);
    },
  });
  return {
    ...mutation,
    isPending: mutation.isPending || attempt?.status === "pending",
    error: attempt?.error ?? mutation.error,
  };
}
