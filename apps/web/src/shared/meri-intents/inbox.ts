import {
  intentsMetadata,
  receiveIntentsRequest,
  receiveIntentsResponse,
  type IntentsInboxCountResponse,
  type IntentsInboxRequest,
  type IntentsInboxResponse,
} from "@capiro/meri-client/intents";
import {
  readCurrentNative,
  type CurrentReadOperation,
} from "../meri-conversations/current-reads";

const text = new TextDecoder();
/**
 * The actor-wide approval inbox is a current native-auth read like runs: no conversation session or
 * model execution is involved. The public receiver owns the request shape, the page correlation
 * and the closed error vocabulary; Meri's membership admission owns identity and visibility.
 */
export const inboxReadOperation: CurrentReadOperation<
  IntentsInboxResponse | { error: { code: string } }
> = {
  path: intentsMetadata.routes.inbox.path,
  requestBytes: intentsMetadata.limits.requestBytes,
  responseBytes: intentsMetadata.limits.responseBytes,
  async admit(bytes) {
    const request = await receiveIntentsRequest("inbox", text.decode(bytes));
    return (status, body) =>
      receiveIntentsResponse("inbox", status, text.decode(body), { request });
  },
};

/** The badge's one count read: prepared proposals still inside their window, before any decision is read. */
export const inboxCountReadOperation: CurrentReadOperation<
  IntentsInboxCountResponse | { error: { code: string } }
> = {
  path: intentsMetadata.routes.inboxCount.path,
  requestBytes: intentsMetadata.limits.requestBytes,
  responseBytes: intentsMetadata.limits.responseBytes,
  async admit(bytes) {
    const request = await receiveIntentsRequest(
      "inboxCount",
      text.decode(bytes),
    );
    return (status, body) =>
      receiveIntentsResponse("inboxCount", status, text.decode(body), {
        request,
      });
  },
};

/** One page of the inbox. */
export function readApprovalInbox(
  request: IntentsInboxRequest,
  signal: AbortSignal,
  isCurrent: () => boolean,
  onAccessLost: () => void,
  fetcher: typeof fetch = fetch,
) {
  return readCurrentNative<IntentsInboxResponse>(
    inboxReadOperation,
    request,
    signal,
    fetcher,
    isCurrent,
    onAccessLost,
  );
}

export function readApprovalInboxCount(
  signal: AbortSignal,
  isCurrent: () => boolean,
  onAccessLost: () => void,
  fetcher: typeof fetch = fetch,
) {
  return readCurrentNative<IntentsInboxCountResponse>(
    inboxCountReadOperation,
    {},
    signal,
    fetcher,
    isCurrent,
    onAccessLost,
  );
}
