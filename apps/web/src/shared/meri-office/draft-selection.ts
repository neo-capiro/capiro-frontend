import type { QueryClient } from "@tanstack/react-query";

/** Navigation remembers selectors only. Core owns the draft and authorizes every read. */
export function officeDraftSelection(
  client: QueryClient,
  scope: {
    tenantId: string;
    actorId: string;
    conversationId: string;
    clientId: string | null;
    versionId: string;
  },
) {
  const key = [
    "meri",
    "office-draft-selection",
    scope.tenantId,
    scope.actorId,
    scope.conversationId,
    scope.clientId,
    scope.versionId,
  ];
  client.setQueryDefaults(key, { gcTime: Infinity });
  type Selection = { versionId: string; draftId: string; editorId: string };
  const selection = client.setQueryData<Selection>(
    key,
    (previous) =>
      previous ??
      Object.freeze({
        versionId: scope.versionId,
        draftId: crypto.randomUUID(),
        editorId: crypto.randomUUID(),
      }),
  )!;
  const cache = client.getQueryCache(),
    owned = cache.find({ queryKey: key, exact: true });
  const isCurrent = () =>
    owned !== undefined && cache.find({ queryKey: key, exact: true }) === owned;
  return {
    selection,
    isCurrent,
    subscribe: (lost: () => void) =>
      cache.subscribe(() => {
        if (!isCurrent()) lost();
      }),
    forget: () => {
      if (isCurrent()) client.removeQueries({ queryKey: key, exact: true });
    },
  };
}
