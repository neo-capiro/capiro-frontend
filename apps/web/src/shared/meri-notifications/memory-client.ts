import { boundedJsonText } from "../meri-actions/bounded-json";
import {
  MEMORY_NOTIFICATION_PAGE_LIMIT,
  MEMORY_NOTIFICATION_RESPONSE_BYTES,
  memoryNotificationPaths,
  receiveMemoryNotificationPage,
  type MemoryNotificationPage,
} from "./memory-contract";

/** The current view lost its account lifetime; nothing from a later response may publish. */
export class MemoryNotificationsAccessLost extends Error {}

/**
 * Browser read of the closed same-origin adapter. The browser never supplies
 * tenant, actor or token: it sends only an opaque cursor to its own origin.
 */
export function createMemoryNotificationsClient(
  isCurrent: () => boolean,
  onAccessLost: () => void,
  fetcher: typeof fetch = fetch,
) {
  return Object.freeze({
    async list(
      input: Readonly<{ cursor?: string | null }>,
      signal: AbortSignal,
    ): Promise<MemoryNotificationPage> {
      if (!isCurrent()) throw new MemoryNotificationsAccessLost();
      const query = new URLSearchParams({
        limit: String(MEMORY_NOTIFICATION_PAGE_LIMIT),
      });
      if (input.cursor) query.set("cursor", input.cursor);
      const response = await fetcher(
        `${memoryNotificationPaths.list}?${query.toString()}`,
        {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal,
        },
      );
      try {
        if (!isCurrent()) throw new MemoryNotificationsAccessLost();
        if (response.redirected)
          throw new Error("Redirected notifications response");
        if (response.status === 401 || response.status === 403) {
          onAccessLost();
          throw new MemoryNotificationsAccessLost();
        }
        if (!response.ok) throw new Error("Memory notifications unavailable");
        const text = await boundedJsonText(
          response,
          signal,
          MEMORY_NOTIFICATION_RESPONSE_BYTES,
        );
        if (!isCurrent()) throw new MemoryNotificationsAccessLost();
        const page = receiveMemoryNotificationPage(JSON.parse(text));
        if (!isCurrent()) throw new MemoryNotificationsAccessLost();
        return page;
      } finally {
        if (!response.bodyUsed)
          void response.body?.cancel().catch(() => undefined);
      }
    },
  });
}

export type MemoryNotificationsClient = ReturnType<
  typeof createMemoryNotificationsClient
>;
