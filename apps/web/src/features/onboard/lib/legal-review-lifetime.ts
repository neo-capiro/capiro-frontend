import type { QueryClient } from "@tanstack/react-query";
import type {
  FunnelSession,
  LegalDoc,
} from "@/shared/capiro/onboard-contracts";
import { FUNNEL_SESSION_KEY } from "./funnel-lifetime";

/** Include displayed body as well as version: consent cannot follow changed copy. */
export function legalReviewIdentity(session: FunnelSession, docs: LegalDoc[]) {
  const tos = docs.find((doc) => doc.docType === "tos");
  const sa = docs.find((doc) => doc.docType === "sa");
  if (!session.plan || !tos || !sa) return null;
  return JSON.stringify([
    session.sessionId,
    session.plan,
    session.orgName,
    tos.version,
    tos.html,
    sa.version,
    sa.html,
  ]);
}

/** Captured successful read generation; any replacement requires a new review. */
export function createLegalReviewLifetime(
  cache: QueryClient,
  key: readonly unknown[],
  identity: string,
  generation = cache.getQueryState(key)?.dataUpdateCount,
) {
  let revoked = false;
  const current = () => {
    const session = cache.getQueryState<FunnelSession | null>(
      FUNNEL_SESSION_KEY,
    );
    const docs = cache.getQueryState<LegalDoc[]>(key);
    if (
      !session ||
      session.status !== "success" ||
      session.error ||
      !session.data ||
      !docs ||
      docs.status !== "success" ||
      docs.error ||
      docs.fetchStatus !== "idle" ||
      !docs.data ||
      docs.dataUpdateCount !== generation ||
      legalReviewIdentity(session.data, docs.data) !== identity
    )
      revoked = true;
    return !revoked;
  };
  return {
    current,
    subscribe: (notify: () => void) =>
      cache.getQueryCache().subscribe(() => {
        if (!current()) notify();
      }),
  };
}
