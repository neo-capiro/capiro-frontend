"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { movedCommitteeDirectoryHref } from "../../directory/public";

export type LegiWatchView = "bills" | "hearings" | "updates" | "more";
export function useLegiWatchRoute() {
  const search = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const navigate = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(search.toString());
    next.set("view", "legiwatch");
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  const hearingDetail =
    search.get("hearingId") ||
    search.get("sessionId") ||
    search.get("publicationSessionId");
  const active = search.get("lw") ?? (hearingDetail ? "hearings" : "bills");
  const movedCommitteeHref =
    active === "committees" ? movedCommitteeDirectoryHref(search) : null;
  useEffect(() => {
    if (movedCommitteeHref)
      router.replace(movedCommitteeHref, { scroll: false });
  }, [movedCommitteeHref, router]);
  const section: LegiWatchView = [
    "bills",
    "hearings",
    "updates",
    "more",
  ].includes(active)
    ? (active as LegiWatchView)
    : "bills";
  return {
    movedCommitteeHref,
    section,
    hearingId: search.get("hearingId"),
    sessionId: search.get("sessionId"),
    clientId: search.get("clientId") ?? "",
    moreView: search.get("lwMore"),
    search,
    navigate,
  };
}
