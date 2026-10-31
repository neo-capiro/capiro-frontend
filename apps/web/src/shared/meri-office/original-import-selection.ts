import type { QueryClient } from "@tanstack/react-query";
import type { ConversationContext } from "../meri-conversations/session";

/** Navigation keeps only the exact selector and whether dispatch was attempted.
 * The existing server journal owns publication and unknown-effect recovery. */
export function officeOriginalSelection(
  client: QueryClient,
  context: ConversationContext,
  selection: { uploadId: string; sha256: string },
) {
  const key = [
    "meri",
    "office-original",
    context.tenantId,
    context.actorId,
    context.conversationId,
    context.selectedClientId,
    selection.uploadId,
    selection.sha256,
  ];
  client.setQueryDefaults(key, { gcTime: Infinity });
  client.setQueryData(
    key,
    (previous: { attempted: boolean } | undefined) =>
      previous ?? { attempted: false },
  );
  const cache = client.getQueryCache(),
    owned = cache.find({ queryKey: key, exact: true });
  const isCurrent = () =>
    owned !== undefined && cache.find({ queryKey: key, exact: true }) === owned;
  return {
    selection: Object.freeze({ ...selection }),
    isCurrent,
    attempted: () =>
      client.getQueryData<{ attempted: boolean }>(key)?.attempted === true,
    markAttempted: () => {
      if (!isCurrent()) throw new Error("Office context changed");
      client.setQueryData(key, { attempted: true });
    },
    markNotDispatched: () => {
      if (isCurrent()) client.setQueryData(key, { attempted: false });
    },
    subscribe: (lost: () => void) =>
      cache.subscribe(() => {
        if (!isCurrent()) lost();
      }),
  };
}
