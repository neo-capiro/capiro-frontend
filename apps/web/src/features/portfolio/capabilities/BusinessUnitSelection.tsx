"use client";
import { useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { usePortfolioCommand } from "./depth-api";
import {
  portfolioProposalSchema,
  type PortfolioProposal,
} from "./proposal-contracts";
import { ProposalEvidence } from "./ProposalEvidence";
import { ProposalActions } from "./ProposalActions";
import { EvidenceFields, evidenceFromForm } from "./EvidenceFields";
import { PortfolioResearch } from "./PortfolioResearch";
import styles from "./depth.module.css";

export function BusinessUnitSelection({
  clientId,
  proposals,
  value,
  onChange,
}: {
  clientId: string;
  proposals: PortfolioProposal[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const units = proposals.filter((p) => p.kind === "business_unit");
  const add = usePortfolioCommand(
    clientId,
    "business-unit",
    (form: FormData) => ({
      path: "capabilities/discovery/proposals",
      schema: portfolioProposalSchema,
      body: {
        kind: "business_unit",
        payload: {
          name: String(form.get("unitName")),
          annualReportYear: Number(form.get("year")),
        },
        evidence: [evidenceFromForm(form)],
      },
    }),
  );
  return (
    <div className={styles.card}>
      <p className="eyebrow">Business unit</p>
      <h3>Which business unit?</h3>
      <p className="muted">
        For a prime, use the current annual report’s segment list before
        reviewing programs. Each view starts with up to 12 sourced programs.
      </p>
      <PortfolioResearch
        clientId={clientId}
        disabled={!add.canWrite}
        scope={{ purpose: "business_units" }}
      />
      <label>
        Business unit
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">All capabilities / no unit selected</option>
          {units
            .filter(
              (p) => p.kind === "business_unit" && p.status === "approved",
            )
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.kind === "business_unit"
                  ? `${p.payload.name} (${p.payload.annualReportYear})`
                  : ""}
              </option>
            ))}
        </select>
      </label>
      {units
        .filter((p) => p.status === "proposed")
        .map((unit) => (
          <div className={styles.evidence} key={unit.id}>
            <strong>
              {unit.kind === "business_unit"
                ? `${unit.payload.name} · ${unit.payload.annualReportYear} annual report`
                : ""}
            </strong>
            <ProposalEvidence evidence={unit.evidence} />
            <ProposalActions
              clientId={clientId}
              proposal={unit}
              approveLabel="Approve business unit"
            />
          </div>
        ))}
      {units.some((unit) => unit.status === "rejected") && (
        <details>
          <summary>Rejected business units</summary>
          {units
            .filter((unit) => unit.status === "rejected")
            .map((unit) => (
              <article className={styles.evidence} key={unit.id}>
                <strong>
                  {unit.kind === "business_unit"
                    ? `${unit.payload.name} · ${unit.payload.annualReportYear} annual report`
                    : ""}
                </strong>
                <ProposalEvidence evidence={unit.evidence} />
                <ProposalActions clientId={clientId} proposal={unit} />
              </article>
            ))}
        </details>
      )}
      <button className="button" onClick={() => setAdding((value) => !value)}>
        {adding ? "Close source form" : "Add sourced business unit"}
      </button>
      {adding && (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            add.mutate(new FormData(event.currentTarget), {
              onSuccess: () => setAdding(false),
            });
          }}
        >
          <div className={styles.fields}>
            <label>
              Business unit name
              <input name="unitName" required maxLength={180} />
            </label>
            <label>
              Annual report year
              <input
                name="year"
                type="number"
                min={2000}
                max={new Date().getFullYear()}
                required
              />
            </label>
          </div>
          <EvidenceFields />
          <QueryState error={add.error} />
          <button className="button primary" disabled={!add.canWrite}>
            Add for review
          </button>
        </form>
      )}
    </div>
  );
}
