"use client";
import { useState, type ReactNode } from "react";
import type { IntentsResearchShareProposal } from "@capiro/meri-client/intents";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { StatusPanel } from "../../../../shared/module-ui";
import { ShareExposure } from "../../../modules/research-portfolios/share/ShareExposure";
import { ResearchDashboardView } from "../../../modules/research-portfolios/share/ResearchDashboardView";

/** The existing Meri decision is enabled only after the exact retained publish preview is reviewed. */
export function ResearchShareReview({
  proposal,
  children,
}: {
  proposal: IntentsResearchShareProposal;
  children: (ready: boolean) => ReactNode;
}) {
  if (proposal.operation === "revoke_research_portfolio_share_link")
    return children(true);
  if (!("snapshotId" in proposal.request) || !proposal.preview.portfolioId)
    return (
      <>
        <p role="alert">
          The prepared publication has no reviewable preview. Ask Meri to
          prepare it again.
        </p>
        {children(false)}
      </>
    );
  return (
    <PublishReview
      key={proposal.commandSha256}
      proposal={proposal}
      request={proposal.request}
      portfolioId={proposal.preview.portfolioId}
    >
      {children}
    </PublishReview>
  );
}

function PublishReview({
  proposal,
  request,
  portfolioId,
  children,
}: {
  proposal: IntentsResearchShareProposal;
  request: Extract<
    IntentsResearchShareProposal["request"],
    { snapshotId: string }
  >;
  portfolioId: string;
  children: (ready: boolean) => ReactNode;
}) {
  const [reviewedHash, setReviewedHash] = useState<string>();
  const preview = useCapiroQuery("research.sharePreview", {
    params: { id: portfolioId },
    body: {
      snapshotId: request.snapshotId,
      designId: request.designId,
      clientId: request.clientId,
      branding: request.branding,
    },
  });
  const matches =
    preview.data?.previewHash === request.previewHash &&
    preview.data.designVersion === request.expectedDesignVersion;
  return (
    <>
      <StatusPanel
        loading={preview.loading}
        error={preview.error}
        onRetry={preview.reload}
      >
        {preview.data && !matches && (
          <p role="alert">
            The prepared dashboard has changed. Ask Meri to prepare this action
            again before confirming it.
          </p>
        )}
        {preview.data && matches && (
          <>
            <ShareExposure dashboard={preview.data.dashboard} />
            <section aria-label="Recipient preview">
              <ResearchDashboardView
                preview
                dashboard={preview.data.dashboard}
                logoUrl={preview.data.logoUrl}
              />
            </section>
            <label>
              <input
                type="checkbox"
                checked={reviewedHash === proposal.commandSha256}
                onChange={(event) =>
                  setReviewedHash(
                    event.target.checked ? proposal.commandSha256 : undefined,
                  )
                }
              />
              I reviewed this frozen dashboard and everything it exposes.
            </label>
          </>
        )}
      </StatusPanel>
      {children(
        Boolean(
          matches &&
          !preview.loading &&
          !preview.error &&
          reviewedHash === proposal.commandSha256,
        ),
      )}
    </>
  );
}
