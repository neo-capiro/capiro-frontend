"use client";
import { useEffect, useState } from "react";
import type { ListState } from "./useIntentList";

/** Refresh local expiry at the next proposal deadline or tab return, without IO. */
export function useIntentExpiry(
  list: ListState,
  scopeKey: string,
  now: () => number,
): number {
  const [, refreshClock] = useState(0);
  useEffect(() => {
    if (list.status !== "ready") return;
    const deadlines = list.items.flatMap((item) =>
      item.state === "prepared" &&
      !("withheld" in item) &&
      ((item.kind === "proposal" && item.phase === "awaiting_approval") ||
        (item.kind === "research_share" &&
          item.proposalStatus === "proposed") ||
        ((item.kind === "legiwatch_action" ||
          item.kind === "client_record_action" ||
          item.kind === "watch_action" ||
          item.kind === "bizdev_action" ||
          item.kind === "legislative_document_action") &&
          item.result !== "unavailable" &&
          item.result.status === "proposed"))
        ? [Date.parse(item.proposal.expiresAt)]
        : [],
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      const checkedAt = now();
      const next = Math.min(
        ...deadlines.filter((deadline) => deadline > checkedAt),
      );
      if (Number.isFinite(next))
        timer = setTimeout(
          () => {
            refreshClock((value) => value + 1);
            schedule();
          },
          Math.min(next - checkedAt, 2_147_483_647),
        );
    };
    const visible = () => {
      if (document.visibilityState !== "visible") return;
      refreshClock((value) => value + 1);
      schedule();
    };
    schedule();
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [list, scopeKey, now]);
  return now();
}
