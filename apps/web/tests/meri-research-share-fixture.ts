import { canonicalSha256 } from "./meri-action-wire-fixtures";
import { ids } from "../test/browser/research-sharing-fixture";
export const conversationId = "00000000-0000-4000-8000-000000000001";
export function prepared(revoke = false) {
  const createdAt = new Date(Date.now() - 60_000).toISOString();
  const bound = {
    kind: "research_share",
    proposalId: "00000000-0000-4000-8000-000000000102",
    binding: {
      tenantId: "tenant",
      actorId: "actor",
      conversationId,
      runId: "00000000-0000-4000-8000-000000000002",
      attemptId: "00000000-0000-4000-8000-000000000003",
      workerId: "00000000-0000-4000-8000-000000000004",
      writerFence: 1,
    },
    scopes: [
      {
        tenantId: "tenant",
        kind: "client",
        resourceId: ids.client,
        policyRevision: "p1",
      },
    ],
    operation: revoke
      ? "revoke_research_portfolio_share_link"
      : "publish_research_portfolio_share_link",
    request: revoke
      ? { conversationId, linkId: ids.link }
      : {
          conversationId,
          snapshotId: ids.snapshot,
          designId: ids.design,
          clientId: ids.client,
          branding: true,
          operationKey: `meri-share-${"a".repeat(64)}`,
          previewHash: "d".repeat(64),
          expectedDesignVersion: 1,
        },
    preview: revoke
      ? { label: "Revoke client share link" }
      : {
          label: "Publish client share link",
          clientName: "Synthetic client",
          portfolioId: ids.portfolio,
        },
    createdAt,
    expiresAt: new Date(Date.now() + 1_800_000).toISOString(),
  };
  return {
    deliveryId: `sdk:${"1".repeat(64)}`,
    createdAt,
    operation: { id: bound.operation, version: "0.2.0" },
    state: "prepared",
    kind: "research_share",
    proposal: { ...bound, commandSha256: canonicalSha256(bound) },
    proposalStatus: "proposed",
  };
}
