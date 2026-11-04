"use client";
import { useState } from "react";
import { z } from "zod";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { usePortfolioCommand, usePortfolioDepth } from "./depth-api";
import {
  canBulkApprove,
  portfolioProposalSchema,
  type AlignmentProposal,
} from "./proposal-contracts";
import { ProposalActions } from "./ProposalActions";
import { ProposalEvidence } from "./ProposalEvidence";
import { EvidenceFields, evidenceFromForm } from "./EvidenceFields";
import styles from "./depth.module.css";
import { PortfolioResearch } from "./PortfolioResearch";

export function CapabilityAlignment({
  clientId,
  capabilityId,
}: {
  clientId: string;
  capabilityId: string;
}) {
  const query = usePortfolioDepth(clientId);
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const proposals =
    query.isSuccess && !query.error
      ? query.data.proposals.filter(
          (p): p is AlignmentProposal =>
            p.kind === "alignment" && p.capabilityId === capabilityId,
        )
      : [];
  const eligible = proposals.filter(
    (p) => selected.includes(p.id) && canBulkApprove(p),
  );
  const bulk = usePortfolioCommand(
    clientId,
    `alignment-bulk:${capabilityId}`,
    () => ({
      path: `capabilities/${capabilityId}/alignment/bulk-approve`,
      schema: z.array(portfolioProposalSchema),
      body: {
        items: eligible.map((p) => ({ id: p.id, expectedVersion: p.version })),
      },
    }),
  );
  return (
    <section className={styles.section} aria-label="Capability alignment">
      <header className="row between">
        <div>
          <h3>Alignment and approved terms</h3>
          <p className="muted">
            Program lines require individual approval. Scores rank fit; they are
            not calibrated probabilities.
          </p>
        </div>
        <div className={styles.actions}>
          <PortfolioResearch
            clientId={clientId}
            disabled={!query.isSuccess || Boolean(query.error)}
            scope={{ purpose: "alignment", capabilityId }}
          />
          <button
            className="button"
            onClick={() => setAdding((value) => !value)}
          >
            Add sourced alignment
          </button>
        </div>
      </header>
      <QueryState
        pending={query.isPending}
        error={query.error ?? bulk.error}
        retry={() => void query.refetch()}
      />
      {adding && (
        <AlignmentForm
          clientId={clientId}
          capabilityId={capabilityId}
          onSaved={() => setAdding(false)}
        />
      )}
      {eligible.length > 0 && (
        <button
          className="button primary"
          disabled={!bulk.canWrite}
          onClick={() =>
            bulk.mutate(undefined, { onSuccess: () => setSelected([]) })
          }
        >
          Approve selected eligible terms ({eligible.length})
        </button>
      )}
      <div className={styles.grid}>
        {proposals.map((proposal) => (
          <article
            className={styles.card}
            key={`${proposal.id}:${proposal.version}`}
          >
            <p className="eyebrow" data-status={proposal.status}>
              {proposal.payload.targetType} · {proposal.status}
            </p>
            <h4>{proposal.payload.value}</h4>
            <p>{proposal.payload.rationale}</p>
            {proposal.payload.score != null && (
              <p className="muted">Fit score {proposal.payload.score}/100</p>
            )}
            {["naics", "psc"].includes(proposal.payload.targetType) && (
              <p className="muted">
                Classification field; excluded from active watch terms.
              </p>
            )}
            <ProposalEvidence evidence={proposal.evidence} />
            <ProposalActions
              clientId={clientId}
              proposal={proposal}
              approveLabel={
                ["pe", "program"].includes(proposal.payload.targetType)
                  ? "Approve program line"
                  : "Approve term"
              }
            />
            {canBulkApprove(proposal) && (
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(proposal.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, proposal.id]
                        : current.filter((id) => id !== proposal.id),
                    )
                  }
                />{" "}
                Include in selected approval
              </label>
            )}
          </article>
        ))}
      </div>
      {query.isSuccess && proposals.length === 0 && (
        <p className={styles.notice}>
          No sourced alignment proposals yet. Research sources to suggest terms
          and program lines, or add evidence you have reviewed.
        </p>
      )}
    </section>
  );
}
function AlignmentForm({
  clientId,
  capabilityId,
  onSaved,
}: {
  clientId: string;
  capabilityId: string;
  onSaved: () => void;
}) {
  const add = usePortfolioCommand(
    clientId,
    `alignment-add:${capabilityId}`,
    (form: FormData) => ({
      path: `capabilities/${capabilityId}/alignment/proposals`,
      schema: portfolioProposalSchema,
      body: {
        kind: "alignment",
        capabilityId,
        payload: {
          targetType: form.get("targetType"),
          value: form.get("value"),
          rationale: form.get("rationale"),
        },
        evidence: [evidenceFromForm(form)],
      },
    }),
  );
  return (
    <form
      className={styles.card}
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate(new FormData(event.currentTarget), { onSuccess: onSaved });
      }}
    >
      <div className={styles.fields}>
        <label>
          Type
          <select name="targetType">
            {["keyword", "tag", "pe", "program", "naics", "psc"].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Term or identifier
          <input name="value" required maxLength={180} />
        </label>
        <label className={styles.full}>
          Why this fits
          <textarea name="rationale" required maxLength={4000} rows={3} />
        </label>
      </div>
      <EvidenceFields />
      <QueryState error={add.error} />
      <button className="button primary" disabled={!add.canWrite}>
        Add for review
      </button>
    </form>
  );
}
