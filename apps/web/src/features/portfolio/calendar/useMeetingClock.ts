"use client";
import { useEffect, useState } from "react";

/** Keep local lifecycle labels current without deriving authority from the clock. */
export function useMeetingClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
