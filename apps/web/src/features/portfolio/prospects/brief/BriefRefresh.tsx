"use client";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import type { BriefScope } from "./api";
import { useBriefRefresh } from "./refresh/useBriefRefresh";
import type { RefreshScope } from "./refresh/api";
import { RefreshControls } from "./refresh/RefreshControls";
import { RefreshReview } from "./refresh/RefreshReview";
export function BriefRefresh({
  scope,
  versionNumber,
}: {
  scope: BriefScope;
  versionNumber: number;
}) {
  const identity = useIdentity(),
    userId = identity.data?.user.id;
  if (
    !identity.isSuccess ||
    identity.error ||
    identity.data.tenant?.id !== scope.tenantId ||
    !userId
  )
    return <p>Sign in to this account to prepare a refresh.</p>;
  return (
    <RefreshSession
      key={JSON.stringify([scope.tenantId, userId, scope.prospectId])}
      scope={{ ...scope, userId }}
      versionNumber={versionNumber}
    />
  );
}
function RefreshSession({
  scope,
  versionNumber,
}: {
  scope: RefreshScope;
  versionNumber: number;
}) {
  const flow = useBriefRefresh(scope);
  const result =
    flow.result?.proposal.proposalId === flow.attempt?.request.proposalId
      ? flow.result
      : null;
  return (
    <section className="stack" aria-label="Refresh comparison">
      <h3>Refresh saved brief</h3>
      <p>
        Prepare a comparison, review the exact proposed text and sources, then
        save it as a new version.
      </p>
      {flow.error && <p role="alert">{flow.error}</p>}
      <RefreshControls
        flow={flow}
        versionNumber={versionNumber}
        result={result}
      />
      {flow.busy && (
        <p role="status">Checking or saving the original refresh…</p>
      )}
      {result?.acceptedVersion && (
        <p role="status">
          Saved as version {result.acceptedVersion.versionNumber}. The exact
          reviewed text and citations are preserved.
        </p>
      )}
      {result && <RefreshReview flow={flow} result={result} />}
    </section>
  );
}
