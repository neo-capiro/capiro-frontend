import {
  parseNewsletterPrepareResult,
  parseNewsletterSendReceipt,
  parseNewsletterSendReadback,
  type NewsletterOutreachRecord,
  type NewsletterReceiveResult,
  type NewsletterSendBinding,
} from "@capiro/shared/newsletter";
import {
  sendingMailboxesSchema,
  type SendingMailbox,
} from "../../../portfolio/relationships/email/mailboxes";
import { CapiroApiError, type CapiroApi } from "../../../../shared/capiro/http";
import { createRichNewsletterAdapter } from "../../../../shared/capiro/rich-newsletter";
import type { capiroOperations } from "../../../../shared/capiro/registry";
import type {
  NewsletterPrepareInput,
  NewsletterSendInput,
} from "../../../../shared/capiro/operations/newsletter-delivery";

function received<T>(result: NewsletterReceiveResult<T>): T {
  if (!result.ok)
    throw new CapiroApiError(
      502,
      "The newsletter response did not match this request.",
    );
  return result.value;
}
export const sameUuid = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase();
export const sameVersions = (a: readonly string[], b: readonly string[]) =>
  [...a]
    .map((id) => id.toLowerCase())
    .sort()
    .join() ===
  [...b]
    .map((id) => id.toLowerCase())
    .sort()
    .join();
/** Existing current-detail and mailbox owners; the browser never grants send eligibility. */
export function createNewsletterDeliveryApi(
  api: CapiroApi<typeof capiroOperations>,
) {
  const rich = createRichNewsletterAdapter(api);
  const mailboxes = async (signal?: AbortSignal) => {
    const result = sendingMailboxesSchema.safeParse(
      await api.request("engagement.newsletter.mailboxes", {}, { signal }),
    );
    if (!result.success)
      throw new CapiroApiError(
        502,
        "The connected mailbox response was invalid.",
      );
    return result.data;
  };
  const record = (
    id: string,
    clientId: string | undefined,
    signal: AbortSignal = new AbortController().signal,
  ) => rich.record(id, clientId === undefined ? {} : { clientId }, signal);
  const currentMailbox = async (
    reviewed: SendingMailbox,
    signal?: AbortSignal,
  ) => {
    const current = (await mailboxes(signal)).find((item) =>
      sameUuid(item.id, reviewed.id),
    );
    if (
      !current ||
      current.accountEmail !== reviewed.accountEmail ||
      current.displayName !== reviewed.displayName ||
      current.provider !== reviewed.provider
    )
      throw new CapiroApiError(
        409,
        "The reviewed mailbox changed. Refresh and review the sender again.",
      );
    return current;
  };
  return {
    record,
    mailboxes,
    async prepare(
      saved: NewsletterOutreachRecord,
      input: NewsletterPrepareInput,
      mailbox: SendingMailbox,
      signal: AbortSignal = new AbortController().signal,
    ) {
      await currentMailbox(mailbox, signal);
      if (!sameUuid(input.senderConnectionId, mailbox.id))
        throw new CapiroApiError(409, "Review the sending mailbox again.");
      const value = await api.request(
        "engagement.newsletter.prepare",
        { params: { id: saved.id }, body: input },
        { signal },
      );
      const prepared = received(
        parseNewsletterPrepareResult(value, { recordId: saved.id }),
      );
      const current = await rich.record(
        saved.id,
        {
          stageId: saved.stage.id,
          documentId: saved.stage.documentId,
          revision: saved.stage.revision,
          clientId: saved.stage.config.clientId,
        },
        signal,
      );
      if (
        !current.senderConnectionId ||
        !sameUuid(current.senderConnectionId, mailbox.id) ||
        current.subject !== input.subject.trim() ||
        !sameVersions(
          current.versions.map((v) => v.id),
          prepared.versions.map((v) => v.id),
        )
      )
        throw new CapiroApiError(
          409,
          "Prepared content changed. Refresh and review the current copies.",
        );
      return current;
    },
    async send(
      saved: NewsletterOutreachRecord,
      input: NewsletterSendInput,
      mailbox: SendingMailbox,
      testMode: boolean,
      signal: AbortSignal = new AbortController().signal,
      beforeDispatch?: () => void,
    ) {
      const fresh = await rich.record(
        saved.id,
        {
          stageId: saved.stage.id,
          documentId: saved.stage.documentId,
          revision: saved.stage.revision,
          clientId: saved.stage.config.clientId,
        },
        signal,
      );
      await currentMailbox(mailbox, signal);
      if (
        !fresh.senderConnectionId ||
        !sameUuid(fresh.senderConnectionId, mailbox.id) ||
        !sameUuid(input.senderConnectionId, mailbox.id) ||
        !sameVersions(
          fresh.versions.map((v) => v.id),
          saved.versions.map((v) => v.id),
        ) ||
        input.versionIds.some(
          (id) => !fresh.versions.some((v) => sameUuid(v.id, id) && v.sendable),
        ) ||
        (testMode
          ? input.versionIds.length !== 1
          : !sameVersions(
              input.versionIds,
              fresh.versions.map((v) => v.id),
            ))
      )
        throw new CapiroApiError(
          409,
          "Prepared content changed. Refresh and review it before sending.",
        );
      signal?.throwIfAborted();
      beforeDispatch?.();
      const response = await api.request(
        testMode ? "engagement.newsletter.test" : "engagement.newsletter.send",
        { params: { id: saved.id }, body: input },
        { signal },
      );
      return received(parseNewsletterSendReceipt(response));
    },
    async request(
      binding: NewsletterSendBinding & { requestKey: string },
      signal?: AbortSignal,
    ) {
      const response = await api.request(
        "engagement.newsletter.sendRequest",
        { params: { id: binding.recordId, requestKey: binding.requestKey } },
        { signal },
      );
      return received(parseNewsletterSendReadback(response, binding));
    },
    async status(recordId: string, intentId: string, signal?: AbortSignal) {
      const response = await api.request(
        "engagement.newsletter.sendStatus",
        { params: { id: recordId, intentId } },
        { signal },
      );
      return received(
        parseNewsletterSendReadback(response, { recordId, intentId }),
      );
    },
  };
}
export type NewsletterDeliveryApi = ReturnType<
  typeof createNewsletterDeliveryApi
>;
