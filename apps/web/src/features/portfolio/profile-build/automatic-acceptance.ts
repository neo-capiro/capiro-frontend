import type { Finding } from "./contracts";
import type { ProfileFact } from "./fact-contracts";
type Acceptance = {
  autoAccepted?: boolean;
  evidence: { metadata?: Record<string, unknown> }[];
};
const exactIdentifier = (value: Acceptance) =>
  value.autoAccepted === true ||
  value.evidence.some(
    (item) => item.metadata?.acceptanceMode === "exact_identifier",
  );
export const isAutomaticFinding = (finding: Finding) =>
  finding.status === "accepted" && exactIdentifier(finding);
export const isAutomaticFact = (fact: ProfileFact) =>
  fact.origin === "official" &&
  fact.status === "approved" &&
  exactIdentifier(fact);
export const canRejectFinding = (finding: Finding | undefined) =>
  Boolean(
    finding && (finding.status === "pending" || isAutomaticFinding(finding)),
  );
