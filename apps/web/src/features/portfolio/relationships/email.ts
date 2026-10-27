"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { MailSendError, sendReviewedMail, type SendInput } from "./email/send";
import { useMailAuthority } from "./email/authority";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  beginMailAttempt,
  mailAttemptKey,
  recoverMailAttempt,
  settleMailAttempt,
  useMailAttempt,
} from "./email/send-attempt";
export {
  messageSchema,
  threadSchema,
  useContactThreads,
  useMailThread,
  type MailThread,
} from "./email/read";
export { plainMailHtml } from "./email/mail-body";
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
const sendIntentReceipt = z.object({
  intentId: z.uuid(),
  requestKey: z.uuid(),
  state: z.enum(["pending", "sending", "unknown", "accepted", "failed"]),
  ok: z.literal(true).optional(),
  threadId: z.uuid().optional(),
  messageId: z.uuid().optional(),
  operation: z.enum(["reply", "reply_all"]).optional(),
  originalMessageId: z.uuid().optional(),
  originalThreadId: z.uuid().optional(),
  originalUpdatedAt: z.iso.datetime({ offset: true }).optional(),
  senderConnectionId: z.uuid().optional(),
});
type SendIntentReceipt = z.infer<typeof sendIntentReceipt>;
export function useSendMail(clientId: string, entity: string) {
  const api = useApi();
  const cache = useQueryClient();
  const authority = useMailAuthority(clientId);
  const identity = useIdentity();
  const key = useMemo(
    () =>
      mailAttemptKey(
        identity.data?.tenant?.id ?? "",
        identity.data?.user.id ?? "",
        clientId,
        entity,
      ),
    [identity.data?.tenant?.id, identity.data?.user.id, clientId, entity],
  );
  const lifetime = useRef({ active: false, sequence: 0 });
  const [acceptedRecovery, setAcceptedRecovery] = useState<{
    key: typeof key;
    token: string;
  } | null>(null);
  useEffect(() => {
    const current = { active: true, sequence: 0 };
    lifetime.current = current;
    return () => {
      current.active = false;
    };
  }, [key]);
  const attempt = useMailAttempt(key);
  if (
    acceptedRecovery &&
    (acceptedRecovery.key !== key ||
      (attempt && attempt.token !== acceptedRecovery.token))
  )
    setAcceptedRecovery(null);
  const [recoveryError, setRecoveryError] = useState<MailSendError | null>(
    null,
  );
  const recovery = useQuery<SendIntentReceipt>({
    queryKey: ["mail-send-recovery", ...key, attempt?.token],
    enabled: Boolean(attempt?.token),
    retry: false,
    refetchInterval: (query) =>
      attempt &&
      Date.now() - attempt.startedAt < 120_000 &&
      !query.state.error &&
      !["unknown", "accepted", "failed"].includes(query.state.data?.state ?? "")
        ? 5000
        : false,
    queryFn: async ({ signal }) => {
      const token = attempt!.token;
      const assert = authority.capture();
      const receipt = await api.request<SendIntentReceipt>(
        "core",
        `engagement/mail/send-intents/${token}`,
        sendIntentReceipt.refine((row) => row.requestKey === token),
        { signal },
      );
      assert();
      return receipt;
    },
  });
  useEffect(() => {
    const row = recovery.data;
    if (!attempt || !row) return;
    const current = lifetime.current;
    const sequence = current.sequence;
    void recoverMailAttempt(cache, key, row).then((terminal) => {
      if (!current.active || current.sequence !== sequence) return;
      if (terminal === "failed") {
        setAcceptedRecovery(null);
        setRecoveryError(
          new MailSendError(
            "The original send was rejected without delivery. Review the email before sending again.",
            false,
          ),
        );
      }
      if (terminal === "accepted") {
        setRecoveryError(null);
        setAcceptedRecovery({ key, token: row.requestKey });
        void cache.invalidateQueries({ queryKey: ["contact-mail"] });
        void cache.invalidateQueries({ queryKey: ["mail-thread"] });
      }
    });
  }, [recovery.data, attempt, cache, key]);
  const mutation = useMutation({
    retry: false,
    mutationFn: async (body: SendInput) => {
      lifetime.current.sequence += 1;
      setAcceptedRecovery(null);
      setRecoveryError(null);
      if (body.clientId !== clientId)
        throw new MailSendError("This email belongs to another client.", false);
      const assert = authority.capture();
      const token = await beginMailAttempt(cache, key, body);
      try {
        assert();
        const result = await sendReviewedMail(api, body, assert, token);
        await settleMailAttempt(cache, key, token);
        return result;
      } catch (error) {
        await settleMailAttempt(cache, key, token, error);
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
  const recovered = acceptedRecovery?.key === key && !attempt;
  return {
    ...mutation,
    isSuccess: recovered || mutation.isSuccess,
    isIdle: !recovered && mutation.isIdle,
    isError: !recovered && mutation.isError,
    status: recovered ? ("success" as const) : mutation.status,
    isPending:
      !recovered && (mutation.isPending || attempt?.status === "pending"),
    error: recovered
      ? null
      : (attempt?.error ?? recoveryError ?? mutation.error),
  };
}
