"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type LegiWatchView = "hearings" | "committees" | "updates" | "more";
export function useLegiWatchRoute() {
  const search = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const navigate = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(search.toString());
    next.set("view", "legiwatch");
    for (const [key, value] of Object.entries(patch))
      value ? next.set(key, value) : next.delete(key);
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  const active = search.get("lw") ?? "hearings";
  const section: LegiWatchView = [
    "hearings",
    "committees",
    "updates",
    "more",
  ].includes(active)
    ? (active as LegiWatchView)
    : "hearings";
  return {
    section,
    hearingId: search.get("hearingId"),
    committeeId: search.get("committeeId"),
    sessionId: search.get("sessionId"),
    clientId: search.get("clientId") ?? "",
    moreView: search.get("lwMore"),
    search,
    navigate,
  };
}
