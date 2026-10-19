import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFunnelLifetime } from "../../lib/FunnelLifetime";
import { useFunnelApi, useFunnelSession } from "../../lib/funnel";
import {
  createLegalReviewLifetime,
  legalReviewIdentity,
} from "../../lib/legal-review-lifetime";
import { Btn, FunnelShell } from "../../ui/primitives";
import { ErrorText } from "./shared";
import { LegalReview } from "./LegalReview";

/** Current read admission is separate from the consent editor for that exact read. */
export function LegalPage() {
  const api = useFunnelApi();
  const cache = useQueryClient();
  const lifetime = useFunnelLifetime();
  const session = useFunnelSession();
  const plan = session.data?.plan ?? null;
  const key = useMemo(() => [...lifetime.key, "legal", plan], [lifetime, plan]);
  const docs = useQuery({
    queryKey: key,
    queryFn: () => lifetime.read(api.getLegal),
    enabled: plan !== null,
    retry: false,
    staleTime: 0,
  });
  // Track successful/current-read notifications even when structural sharing
  // preserves identical document objects. Loading or failed reads end review.
  const generation = cache.getQueryState(key)?.dataUpdateCount;
  const identity =
    session.data && docs.data
      ? legalReviewIdentity(session.data, docs.data)
      : null;
  const review = useMemo(
    () =>
      identity
        ? createLegalReviewLifetime(cache, key, identity, generation)
        : null,
    [cache, key, identity, generation],
  );
  if (
    !session.isSuccess ||
    session.error ||
    !session.data ||
    !docs.isSuccess ||
    docs.error ||
    docs.isFetching ||
    !identity ||
    !review
  )
    return (
      <FunnelShell step={3}>
        <ErrorText>
          {docs.error || session.error
            ? "Current legal documents are unavailable. Retry before signing."
            : "Loading current legal documents…"}
        </ErrorText>
        <Btn disabled={docs.isFetching} onClick={() => void docs.refetch()}>
          Retry current documents
        </Btn>
      </FunnelShell>
    );
  return (
    <LegalReview
      key={JSON.stringify([identity, generation, docs.dataUpdatedAt])}
      snapshot={session.data}
      documents={docs.data}
      review={review}
    />
  );
}
