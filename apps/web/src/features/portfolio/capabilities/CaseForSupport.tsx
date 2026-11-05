"use client";
import { useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { usePortfolioCommand, usePortfolioDepth } from "./depth-api";
import {
  caseFields,
  portfolioProposalSchema,
  type PortfolioProposal,
} from "./proposal-contracts";
import { ProposalActions } from "./ProposalActions";
import { ProposalEvidence } from "./ProposalEvidence";
import { EvidenceFields, evidenceFromForm } from "./EvidenceFields";
import styles from "./depth.module.css";

export const caseFieldLabels = {
  impact: "District or state impact",
  priorities: "Member priorities",
  government_need: "Government need",
  readiness: "Readiness",
  cost: "Cost",
  backing: "Backing",
  timing: "Timing",
  jobs: "Jobs",
  payroll: "Payroll",
  investment: "Investment",
  facility_size: "Facility size",
  suppliers: "Suppliers",
};
type CaseProposal = Extract<PortfolioProposal, { kind: "case_field" }>;
export function memberCaseFields(
  proposals: PortfolioProposal[],
  capabilityId: string,
  memberId?: string,
  sourceDirectory?: string,
  officeTerm?: string,
) {
  return proposals.filter(
    (p): p is CaseProposal =>
      p.kind === "case_field" &&
      p.capabilityId === capabilityId &&
      p.status === "approved" &&
      p.evidence.length > 0 &&
      (!p.payload.memberId ||
        (p.payload.memberId === memberId &&
          Boolean(sourceDirectory && officeTerm) &&
          p.payload.sourceDirectory === sourceDirectory &&
          p.payload.officeTerm === officeTerm)),
  );
}
export function replaceableCaseFields(
  proposals: PortfolioProposal[],
  capabilityId: string,
  field: string,
  memberId?: string,
  sourceDirectory?: string,
  officeTerm?: string,
) {
  return memberCaseFields(
    proposals,
    capabilityId,
    memberId,
    sourceDirectory,
    officeTerm,
  ).filter(
    (proposal) =>
      proposal.payload.field === field &&
      !proposal.payload.facilityId &&
      proposal.payload.memberId === memberId,
  );
}
export function CaseForSupport({
  clientId,
  capabilityId,
  memberId,
  memberName,
  sourceDirectory,
  officeTerm,
}: {
  clientId: string;
  capabilityId: string;
  memberId?: string;
  memberName?: string;
  sourceDirectory?: string;
  officeTerm?: string;
}) {
  const query = usePortfolioDepth(clientId);
  const [adding, setAdding] = useState(false);
  const memberCaseAvailable = !memberId || sourceDirectory !== "staff";
  const [reviewing, setReviewing] = useState(false);
  const proposals = query.isSuccess && !query.error ? query.data.proposals : [];
  const fields = memberCaseFields(
    proposals,
    capabilityId,
    memberId,
    sourceDirectory,
    officeTerm,
  );
  const pending = proposals.filter(
    (p) =>
      p.kind === "case_field" &&
      p.capabilityId === capabilityId &&
      (!p.payload.memberId ||
        (p.payload.memberId === memberId &&
          p.payload.sourceDirectory === sourceDirectory &&
          p.payload.officeTerm === officeTerm)) &&
      ["proposed", "rejected"].includes(p.status),
  );
  return (
    <section
      className={styles.section}
      aria-label={memberId ? "Member brief" : "Case for support"}
    >
      <header className="row between">
        <div>
          <p className="eyebrow">{memberId ? "Member view" : "Sourced case"}</p>
          <h3>
            {memberId
              ? `Member brief${memberName ? ` · ${memberName}` : ""}`
              : "Case for support"}
          </h3>
        </div>
        <div className={styles.actions}>
          <button
            className="button"
            disabled={!memberCaseAvailable}
            onClick={() => setAdding((value) => !value)}
          >
            Add sourced fact
          </button>
          <button
            className="button"
            onClick={() => setReviewing((value) => !value)}
          >
            Review evidence ({pending.length})
          </button>
        </div>
      </header>
      <p className="muted">
        Every populated line links to dated evidence. Missing impact, cost or
        backing remains a gap.
      </p>
      {!memberCaseAvailable && (
        <p role="status">
          Member-specific case facts are unavailable for staff profiles.
          Approved capability-wide facts remain available.
        </p>
      )}
      {memberId && !officeTerm && (
        <p role="status">
          Office term is not recorded. Member-specific facts stay unavailable
          until their term is confirmed.
        </p>
      )}
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {adding && memberCaseAvailable && query.isSuccess && !query.error && (
        <CaseFactForm
          key={`${capabilityId}:${memberId ?? "client"}:${sourceDirectory ?? ""}:${officeTerm ?? ""}`}
          clientId={clientId}
          capabilityId={capabilityId}
          memberId={memberId}
          sourceDirectory={sourceDirectory}
          officeTerm={officeTerm}
          proposals={proposals}
          onSaved={() => setAdding(false)}
        />
      )}
      <div className={styles.grid}>
        {caseFields.map((field) => (
          <article className={styles.card} key={field}>
            <h4>{caseFieldLabels[field]}</h4>
            {fields.filter((row) => row.payload.field === field).length ? (
              fields
                .filter((row) => row.payload.field === field)
                .map((row) => (
                  <div className="stack" key={row.id}>
                    <p>{row.payload.text}</p>
                    <ProposalEvidence evidence={row.evidence} />
                  </div>
                ))
            ) : (
              <p className="muted">Evidence missing</p>
            )}
          </article>
        ))}
      </div>
      {reviewing && (
        <div className={styles.grid}>
          {pending.map((proposal) => (
            <article
              className={styles.card}
              key={`${proposal.id}:${proposal.version}`}
            >
              <p className="eyebrow">{proposal.status}</p>
              {proposal.kind === "case_field" && (
                <>
                  <h4>{caseFieldLabels[proposal.payload.field]}</h4>
                  <p>{proposal.payload.text}</p>
                </>
              )}
              <ProposalEvidence evidence={proposal.evidence} />
              <ProposalActions clientId={clientId} proposal={proposal} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
function CaseFactForm({
  clientId,
  capabilityId,
  memberId,
  sourceDirectory,
  officeTerm,
  proposals,
  onSaved,
}: {
  clientId: string;
  capabilityId: string;
  memberId?: string;
  sourceDirectory?: string;
  officeTerm?: string;
  proposals: PortfolioProposal[];
  onSaved: () => void;
}) {
  const [field, setField] = useState<string>(caseFields[0]);
  const replacements = replaceableCaseFields(
    proposals,
    capabilityId,
    field,
    memberId,
    sourceDirectory,
    officeTerm,
  );
  const add = usePortfolioCommand(
    clientId,
    `case:${capabilityId}`,
    (form: FormData) => ({
      path: "portfolio/case/proposals",
      schema: portfolioProposalSchema,
      body: {
        kind: "case_field",
        capabilityId,
        payload: {
          field: form.get("field"),
          text: form.get("text"),
          ...(form.get("supersedesProposalId")
            ? { supersedesProposalId: form.get("supersedesProposalId") }
            : {}),
          ...(memberId
            ? {
                memberId,
                sourceDirectory: sourceDirectory ?? form.get("sourceDirectory"),
                officeTerm: officeTerm || form.get("officeTerm"),
              }
            : {}),
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
      <label>
        Case field
        <select
          name="field"
          value={field}
          onChange={(event) => setField(event.target.value)}
        >
          {caseFields.map((field) => (
            <option key={field} value={field}>
              {caseFieldLabels[field]}
            </option>
          ))}
        </select>
      </label>
      {replacements.length > 0 && (
        <label>
          Approved fact to replace
          <select
            key={field}
            name="supersedesProposalId"
            required
            defaultValue=""
          >
            <option value="">Choose the prior approved fact</option>
            {replacements.map((proposal) => (
              <option key={proposal.id} value={proposal.id}>
                {proposal.payload.text.slice(0, 160)}
              </option>
            ))}
          </select>
          <span className="muted">
            Replacement is reviewed separately. The previous fact and its
            evidence remain in history.
          </span>
        </label>
      )}
      <label>
        Supported fact
        <textarea name="text" required maxLength={4000} rows={4} />
      </label>
      {memberId && (
        <div className={styles.fields}>
          <label>
            Office directory
            <select
              name="sourceDirectory"
              defaultValue={sourceDirectory ?? "congress"}
              disabled={Boolean(sourceDirectory)}
            >
              <option value="congress">Congress</option>
              <option value="state">State legislature</option>
            </select>
          </label>
          <label>
            Office term
            <input
              name="officeTerm"
              required
              maxLength={180}
              defaultValue={officeTerm}
              readOnly={Boolean(officeTerm)}
            />
          </label>
        </div>
      )}
      <EvidenceFields />
      <QueryState error={add.error} />
      <button className="button primary" disabled={!add.canWrite}>
        Add for review
      </button>
    </form>
  );
}
