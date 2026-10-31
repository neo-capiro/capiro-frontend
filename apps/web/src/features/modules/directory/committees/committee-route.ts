"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function committeeDirectoryHref(id: string, clientId?: string | null) {
  const query = new URLSearchParams({
    view: "committees",
    jurisdiction: id.startsWith("state:FL:") ? "FL" : "US",
    committeeId: id,
  });
  if (clientId) query.set("clientId", clientId);
  return `/modules/directory?${query}`;
}

/** Retained committee bookmarks moved from LegiWatch to Directory. */
export function movedCommitteeDirectoryHref(
  search: Pick<URLSearchParams, "get">,
) {
  const id = search.get("committeeId");
  if (id) return committeeDirectoryHref(id, search.get("clientId"));
  const query = new URLSearchParams({
    view: "committees",
    jurisdiction: search.get("jurisdiction") === "FL" ? "FL" : "US",
  });
  const clientId = search.get("clientId");
  if (clientId) query.set("clientId", clientId);
  return `/modules/directory?${query}`;
}

export function useCommitteeRoute() {
  const search = useSearchParams();
  const router = useRouter();
  const committeeId = search.get("committeeId");
  const jurisdiction = committeeId
    ? committeeId.startsWith("state:FL:")
      ? "FL"
      : "US"
    : search.get("view") === "state-committees" ||
        search.get("jurisdiction") === "FL"
      ? "FL"
      : "US";
  const clientId = search.get("clientId");
  const openDirectory = (nextJurisdiction: string = jurisdiction) => {
    const next = new URLSearchParams(search.toString());
    next.set("view", "committees");
    next.set("jurisdiction", nextJurisdiction === "FL" ? "FL" : "US");
    next.delete("committeeId");
    router.push(`/modules/directory?${next}`, { scroll: false });
  };
  return {
    committeeId,
    jurisdiction,
    openDirectory,
    openCommittee: (id: string) =>
      router.push(committeeDirectoryHref(id, clientId), { scroll: false }),
    openHearing: (id: string) => {
      const next = new URLSearchParams({
        view: "legiwatch",
        lw: "hearings",
        hearingId: id,
      });
      if (clientId) next.set("clientId", clientId);
      router.push(`/modules/intelligence?${next}`, { scroll: false });
    },
  };
}
