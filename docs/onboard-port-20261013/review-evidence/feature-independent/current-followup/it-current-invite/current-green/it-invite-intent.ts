import type { QueryClient } from "@tanstack/react-query";
import type { ItInviteView } from "@/shared/capiro/onboard-contracts";

/** Keep a consent/deferral continuation bound to its displayed capability facts. */
export async function withCurrentItInvite<T>(
  cache: QueryClient,
  token: string,
  provider: "microsoft" | "google",
  displayed: ItInviteView,
  perform: (assertCurrent: () => void) => Promise<T>,
) {
  const identity = JSON.stringify(displayed);
  let revoked = false;
  const current = () => {
    const query = cache.getQueryState<ItInviteView>(["it", "invite", token]);
    if (
      !query ||
      query.status !== "success" ||
      query.error ||
      query.fetchStatus !== "idle" ||
      !query.data?.providers[provider] ||
      ["granted", "verified", "skipped"].includes(query.data.status) ||
      JSON.stringify(query.data) !== identity
    )
      revoked = true;
    return !revoked;
  };
  const assertCurrent = () => {
    if (!current())
      throw new DOMException(
        "This current IT invitation changed.",
        "AbortError",
      );
  };
  assertCurrent();
  const unsubscribe = cache.getQueryCache().subscribe(current);
  try {
    return await perform(assertCurrent);
  } finally {
    unsubscribe();
  }
}
