"use client";
import { useContext, useEffect, useState } from "react";
import { SessionContext } from "../session/SessionContext";
import { readApprovalInboxCount } from "./inbox";

/**
 * The sidebar badge: one count read per mount while signed in. Nothing is shown until the read succeeds
 * with at least one open proposal; a refused or unavailable read shows no badge rather than a guessed number.
 */
export function useApprovalInboxCount(enabled: boolean) {
  const session = useContext(SessionContext);
  const [count, setCount] = useState<number>();
  const active = enabled && session === "signed-in";
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void readApprovalInboxCount(
      controller.signal,
      () => !controller.signal.aborted,
      () => undefined,
    )
      .then((answer) => {
        if (controller.signal.aborted || answer.open === 0) return;
        setCount(answer.open);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [active]);
  return active ? count : undefined;
}
