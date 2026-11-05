"use client";
import { useState } from "react";
import { z } from "zod";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  usePortfolioDepth,
  usePortfolioCommand,
  ProposalActions,
  ProposalEvidence,
  portfolioProposalSchema,
  hasOfficialEvidence,
} from "@/features/portfolio/capabilities/public";
import { useProfileMemberOptions } from "@/features/portfolio/client-profile/public";
import { memberName } from "@/features/portfolio/index/public";
import type { GovernmentTarget } from "./target-contracts";
import { MemberStatementForm } from "./MemberStatementForm";
import styles from "./office-depth.module.css";

export function TargetRecommendations({
  clientId,
  targets,
}: {
  clientId: string;
  targets: GovernmentTarget[];
}) {
  const query = usePortfolioDepth(clientId);
  const owners = useProfileMemberOptions();
  const ownerLabel = (id?: string) => {
    if (!id) return "Not yet assigned";
    const owner =
      owners.isSuccess && !owners.error
        ? owners.data?.find((value) => value.id === id)
        : undefined;
    return owner ? memberName(owner) : "Owner unavailable";
  };
  const available = query.isSuccess && !query.error;
  const officeName = (office: {
    memberId: string;
    sourceDirectory: string;
    officeTerm: string;
  }) => {
    const relationship = available
      ? query.data.relationships.find(
          (row) =>
            row.memberId === office.memberId &&
            row.sourceDirectory === office.sourceDirectory &&
            row.officeTerm === office.officeTerm,
        )
      : undefined;
    return (
      targets.find((target) => target.id === relationship?.id)?.memberName ??
      `Office ${office.memberId}`
    );
  };
  const [capabilityId, setCapabilityId] = useState("");
  const [status, setStatus] = useState("proposed");
  const [statement, setStatement] = useState(false);
  const refresh = usePortfolioCommand(
    clientId,
    "office-recommendations",
    () => ({
      path: "targets/recommendations/refresh",
      schema: z.object({
        proposals: z.array(portfolioProposalSchema),
        gaps: z.array(z.string()),
      }),
      body: capabilityId ? { capabilityId } : {},
    }),
  );
  const proposals =
    query.isSuccess && !query.error
      ? query.data.proposals.filter(
          (p) =>
            p.kind === "office_recommendation" &&
            p.status === status &&
            (!capabilityId || p.capabilityId === capabilityId) &&
            hasOfficialEvidence(p.evidence),
        )
      : [];
  const statements =
    query.isSuccess && !query.error
      ? query.data.proposals.filter(
          (p) => p.kind === "statement" && hasOfficialEvidence(p.evidence),
        )
      : [];
  return (
    <section
      className={styles.section}
      aria-label="Suggested government targets"
    >
      <header className="row between">
        <div>
          <h2>Recommended offices</h2>
          <p className="muted">
            Dated official evidence, an entry point and reasons to review the
            fit.
          </p>
        </div>
        <button
          className="button"
          disabled={!refresh.canWrite}
          onClick={() => refresh.mutate()}
        >
          {refresh.isPending ? "Refreshing…" : "Refresh recommendations"}
        </button>
      </header>
      <div className={styles.actions}>
        <label>
          Capability
          <select
            value={capabilityId}
            onChange={(event) => setCapabilityId(event.target.value)}
          >
            <option value="">Whole client</option>
            {(available ? query.data.capabilities : []).map((capability) => (
              <option key={capability.id} value={capability.id}>
                {capability.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Review status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {["proposed", "approved", "rejected"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button
          className="button"
          onClick={() => setStatement((value) => !value)}
        >
          Add official statement
        </button>
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error ?? refresh.error}
        retry={() => void query.refetch()}
      />
      {statement && available && (
        <MemberStatementForm
          clientId={clientId}
          targets={targets}
          onSaved={() => setStatement(false)}
        />
      )}
      <div className={styles.grid}>
        {proposals.map(
          (proposal) =>
            proposal.kind === "office_recommendation" && (
              <article
                className={styles.card}
                key={`${proposal.id}:${proposal.version}`}
              >
                <p className="eyebrow">{proposal.status}</p>
                <h3>{officeName(proposal.payload)}</h3>
                {proposal.payload.fitRating && (
                  <p className="eyebrow">
                    Fit rating: {proposal.payload.fitRating}
                  </p>
                )}
                <p>
                  <strong>Fit:</strong> {proposal.payload.rationale}
                </p>
                <p>
                  <strong>Entry point:</strong> {proposal.payload.entryPoint}
                </p>
                <p>
                  <strong>Why not:</strong> {proposal.payload.whyNot}
                </p>
                <p className="muted">
                  Office term: {proposal.payload.officeTerm}
                </p>
                <p className="muted">
                  {proposal.payload.stance === "unknown"
                    ? "No support stance recorded"
                    : `Recorded stance: ${proposal.payload.stance}`}
                </p>
                <p className="muted">
                  Suggested owner:{" "}
                  {ownerLabel(proposal.payload.suggestedOwnerUserId)}
                </p>
                <ProposalEvidence evidence={proposal.evidence} />
                <ProposalActions
                  clientId={clientId}
                  proposal={proposal}
                  approveLabel="Approve relationship"
                />
              </article>
            ),
        )}
      </div>
      {available && !proposals.length && (
        <div className={styles.note}>
          <h3>No sourced {status} recommendation yet</h3>
          <p>
            Review approved capability terms, confirmed sites and dated official
            statements. Missing evidence remains a gap.
          </p>
        </div>
      )}
      {refresh.data?.gaps.map((gap) => (
        <p role="status" key={gap}>
          {gap}
        </p>
      ))}
      <details>
        <summary>Member statements and evidence · {statements.length}</summary>
        <div className={styles.grid}>
          {statements.map(
            (proposal) =>
              proposal.kind === "statement" && (
                <article
                  className={styles.card}
                  key={`${proposal.id}:${proposal.version}`}
                >
                  <p className="eyebrow">
                    {proposal.status} ·{" "}
                    {new Date(
                      proposal.payload.statementDate,
                    ).toLocaleDateString()}
                  </p>
                  <h4>{officeName(proposal.payload)}</h4>
                  <p>{proposal.payload.summary}</p>
                  <ProposalEvidence evidence={proposal.evidence} />
                  <ProposalActions
                    clientId={clientId}
                    proposal={proposal}
                    approveLabel="Approve statement"
                  />
                </article>
              ),
          )}
        </div>
      </details>
    </section>
  );
}
