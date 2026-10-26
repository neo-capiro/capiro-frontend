"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  NewsletterOutreachRecord,
  NewsletterSendReadback,
} from "@capiro/shared/newsletter";
import type { SendingMailbox } from "../../../portfolio/relationships/email/mailboxes";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import type { NewsletterPrepareInput } from "../../../../shared/capiro/operations/newsletter-delivery";
import { createNewsletterDeliveryApi } from "./delivery-api";
import { deliveryLocked, sendRequestSettled } from "./delivery-state";

type Loaded = {
  record: NewsletterOutreachRecord;
  mailboxes: SendingMailbox[];
  send?: NewsletterSendReadback;
};
type Write = {
  kind: "prepare" | "test" | "send";
  pending: boolean;
  unknown: boolean;
  message?: string;
};
const uuid =
  /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
const validRequest = (value: string) =>
  value.length >= 8 && value.length <= 128 && value === value.trim();

/** Keep only the opaque request identity in the existing route before a possible send. */
export function retainNewsletterSendRequest(requestKey: string) {
  if (!uuid.test(requestKey))
    throw new Error("Invalid newsletter request identity.");
  const url = new URL(window.location.href);
  url.searchParams.set("newsletterSendRequest", requestKey);
  window.history.replaceState(window.history.state, "", url);
}

export function useNewsletterDelivery(recordId: string, clientId?: string) {
  const api = useCapiro();
  const adapter = useMemo(() => createNewsletterDeliveryApi(api), [api]);
  const params = useSearchParams();
  const requests = params.getAll("newsletterSendRequest");
  const requestKey = requests[0];
  const invalidRequest =
    requests.length > 1 ||
    (requestKey !== undefined && !validRequest(requestKey));
  const [refresh, setRefresh] = useState(0);
  const key = JSON.stringify([recordId, clientId, requestKey, refresh]);
  const [read, setRead] = useState<{
    adapter: typeof adapter;
    key: string;
    value?: Loaded;
    error?: string;
  }>();
  const [write, setWrite] = useState<{
    adapter: typeof adapter;
    value: Write;
  }>();
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    if (invalidRequest) return;
    const abort = new AbortController();
    void (async () => {
      try {
        const [record, mailboxes] = await Promise.all([
          adapter.record(recordId, clientId, abort.signal),
          adapter.mailboxes(abort.signal),
        ]);
        const send = requestKey
          ? await adapter.request(
              { recordId: record.id, requestKey },
              abort.signal,
            )
          : record.intentId
            ? await adapter.status(record.id, record.intentId, abort.signal)
            : undefined;
        if (!abort.signal.aborted)
          setRead({ adapter, key, value: { record, mailboxes, send } });
      } catch {
        if (!abort.signal.aborted)
          setRead({
            adapter,
            key,
            error:
              "This newsletter or its current delivery status is unavailable. Refresh to check current access.",
          });
      }
    })();
    return () => abort.abort();
  }, [adapter, recordId, clientId, requestKey, invalidRequest, key]);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [adapter, recordId, clientId],
  );
  const current =
    read?.adapter === adapter && read.key === key ? read : undefined;
  const mutation = write?.adapter === adapter ? write.value : undefined;
  const loaded = mutation?.message ? undefined : current?.value;
  function begin(kind: Write["kind"]) {
    if (
      active.current ||
      !loaded ||
      invalidRequest ||
      mutation?.unknown ||
      deliveryLocked(loaded.record, loaded.send)
    )
      return;
    const abort = new AbortController();
    active.current = abort;
    setWrite({ adapter, value: { kind, pending: true, unknown: false } });
    return abort;
  }
  async function prepare(
    input: NewsletterPrepareInput,
    mailbox: SendingMailbox,
  ) {
    const abort = begin("prepare");
    if (!abort || !loaded) return;
    try {
      const record = await adapter.prepare(
        loaded.record,
        input,
        mailbox,
        abort.signal,
      );
      if (!abort.signal.aborted) {
        setRead({ adapter, key, value: { ...loaded, record } });
        setWrite(undefined);
        return record;
      }
    } catch {
      if (!abort.signal.aborted) {
        setRead({ adapter, key });
        setWrite({
          adapter,
          value: {
            kind: "prepare",
            pending: false,
            unknown: true,
            message:
              "Preparation was not confirmed. Refresh to read the current saved copies, then review them before sending.",
          },
        });
      }
    } finally {
      if (active.current === abort) active.current = null;
    }
  }
  async function send(mailbox: SendingMailbox, testVersionId?: string) {
    if (
      !loaded ||
      deliveryLocked(loaded.record, loaded.send) ||
      mutation?.unknown
    )
      return;
    if (
      testVersionId &&
      loaded.record.tests.some(
        (test) => test.versionId.toLowerCase() === testVersionId.toLowerCase(),
      )
    )
      return;
    const kind = testVersionId ? "test" : "send";
    const abort = begin(kind);
    if (!abort) return;
    const input = {
      requestKey: crypto.randomUUID(),
      senderConnectionId: mailbox.id,
      versionIds: testVersionId
        ? [testVersionId]
        : loaded.record.versions.map((version) => version.id),
    };
    let dispatched = false;
    try {
      const receipt = await adapter.send(
        loaded.record,
        input,
        mailbox,
        Boolean(testVersionId),
        abort.signal,
        () => {
          retainNewsletterSendRequest(input.requestKey);
          dispatched = true;
        },
      );
      const result = await adapter.request(
        {
          recordId: loaded.record.id,
          ...input,
          intentId: receipt.intentId,
          testMode: Boolean(testVersionId),
        },
        abort.signal,
      );
      if (!abort.signal.aborted) {
        setWrite(undefined);
        setRefresh((value) => value + 1);
        return result;
      }
    } catch {
      if (!abort.signal.aborted) {
        setRead({ adapter, key });
        setWrite({
          adapter,
          value: {
            kind,
            pending: false,
            unknown: dispatched,
            message: dispatched
              ? "The send outcome is not confirmed. Check this retained request's status; do not send it again."
              : "The send was not started. Refresh and review the current mailbox and prepared copies.",
          },
        });
      }
    } finally {
      if (active.current === abort) active.current = null;
    }
  }
  return {
    loaded,
    loading: !invalidRequest && !current && !mutation?.unknown,
    error: invalidRequest
      ? "This newsletter request link is invalid."
      : current?.error,
    write: mutation,
    refresh: () => {
      if (!active.current) {
        setWrite(undefined);
        setRefresh((value) => value + 1);
      }
    },
    inspectTest: (id: string) => {
      const test = loaded?.record.tests.find((item) => item.id === id);
      if (
        !test ||
        active.current ||
        mutation?.unknown ||
        !sendRequestSettled(loaded?.send) ||
        !validRequest(test.requestKey)
      )
        return;
      const url = new URL(window.location.href);
      url.searchParams.set("newsletterSendRequest", test.requestKey);
      window.history.replaceState(window.history.state, "", url);
      setRefresh((value) => value + 1);
    },
    prepare,
    send,
  };
}
