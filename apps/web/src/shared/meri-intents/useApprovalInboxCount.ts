"use client";
import { useContext, useEffect, useState } from "react";
import { SessionContext } from "../session/SessionContext";
import { readApprovalInbox } from "./inbox";

/**
 * The sidebar badge: the pending count of the first inbox page, read once per mount while signed in.
 * Nothing is shown until the read succeeds with at least one awaiting proposal; "50+" says the page was
 * not the whole inbox. A refused or unavailable read shows no badge rather than a guessed number.
 */
export function useApprovalInboxCount(enabled: boolean) {
  const session = useContext(SessionContext);
  const [count, setCount] = useState<number | string>();
  const active = enabled && session === "signed-in";
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void readApprovalInbox(
      { limit: 50 },
      controller.signal,
      () => !controller.signal.aborted,
      () => undefined,
    )
      .then((page) => {
        if (controller.signal.aborted || page.pending.count === 0) return;
        setCount(
          page.pending.complete ? page.pending.count : `${page.pending.count}+`,
        );
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [active]);
  return active ? count : undefined;
}
