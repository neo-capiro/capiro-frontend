"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type LegiWatchView = "hearings" | "updates" | "more";
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
  const active = search.get("lw") ?? "hearings";
  const section: LegiWatchView = ["hearings", "updates", "more"].includes(
    active,
  )
    ? (active as LegiWatchView)
    : "hearings";
  return {
    section,
    hearingId: search.get("hearingId"),
    sessionId: search.get("sessionId"),
    clientId: search.get("clientId") ?? "",
    moreView: search.get("lwMore"),
    search,
    navigate,
  };
}
