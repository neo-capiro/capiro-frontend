"use client";
import { useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { usePortfolioCommand, usePortfolioDepth } from "./depth-api";
import {
  portfolioProposalSchema,
  sectorPayloadSchema,
} from "./proposal-contracts";
import { ProposalEvidence } from "./ProposalEvidence";
import { ProposalActions } from "./ProposalActions";
import { EvidenceFields, evidenceFromForm } from "./EvidenceFields";
import styles from "./depth.module.css";

export function SectorAnchors({
  clientId,
  capabilityId,
}: {
  clientId: string;
  capabilityId: string;
}) {
  const query = usePortfolioDepth(clientId);
  const [adding, setAdding] = useState(false);
  const available = query.isSuccess && !query.error;
  const anchors = available
    ? query.data.sectorAnchors.filter(
        (p) => p.kind === "sector_anchor" && p.capabilityId === capabilityId,
      )
    : [];
  return (
    <section className={styles.section} aria-label="Funding and policy anchors">
      <header className="row between">
        <h3>Funding and policy anchors</h3>
        <button className="button" onClick={() => setAdding((value) => !value)}>
          Add anchor
        </button>
      </header>
      <p className={styles.notice}>
        Sector references remain Draft until their source packet and
        practitioner review are available.
      </p>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {anchors.map((anchor) => (
        <article className={styles.card} key={anchor.id}>
          <p className="eyebrow">
            Draft ·{" "}
            {anchor.kind === "sector_anchor" ? anchor.payload.sector : ""}
          </p>
          {anchor.kind === "sector_anchor" && (
            <>
              <h4>
                {anchor.payload.sector === "defense"
                  ? `PE ${anchor.payload.pe}`
                  : anchor.payload.sector === "health"
                    ? `${anchor.payload.agency} / ${anchor.payload.account} / ${anchor.payload.program}`
                    : `USDA / ${anchor.payload.program} / ${anchor.payload.farmBillTitle}`}
              </h4>
              <p>Maturity: {anchor.payload.maturity.current}</p>
              <p className="muted">
                {anchor.payload.maturity.steps.join(" → ")}
              </p>
            </>
          )}
          <ProposalEvidence evidence={anchor.evidence} />
          <ProposalActions
            clientId={clientId}
            proposal={anchor}
            approvalDisabled
          />
        </article>
      ))}
      {available && anchors.length === 0 && (
        <p className="muted">No sourced sector anchor yet.</p>
      )}
      {adding && available && (
        <SectorAnchorForm
          clientId={clientId}
          capabilityId={capabilityId}
          onSaved={() => setAdding(false)}
        />
      )}
    </section>
  );
}
function SectorAnchorForm({
  clientId,
  capabilityId,
  onSaved,
}: {
  clientId: string;
  capabilityId: string;
  onSaved: () => void;
}) {
  const [sector, setSector] = useState("defense");
  const add = usePortfolioCommand(
    clientId,
    "sector-anchor",
    (form: FormData) => {
      const maturity = {
        current: String(form.get("current")),
        steps: String(form.get("steps"))
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      };
      const payload = sectorPayloadSchema.parse(
        sector === "defense"
          ? { sector, pe: form.get("pe"), maturity }
          : sector === "health"
            ? {
                sector,
                agency: form.get("agency"),
                account: form.get("account"),
                program: form.get("program"),
                maturity,
              }
            : {
                sector,
                agency: "USDA",
                program: form.get("program"),
                farmBillTitle: form.get("farmBillTitle"),
                maturity,
              },
      );
      return {
        path: "portfolio/sectors/proposals",
        schema: portfolioProposalSchema,
        body: {
          kind: "sector_anchor",
          capabilityId,
          payload,
          evidence: [evidenceFromForm(form)],
        },
      };
    },
  );
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate(new FormData(event.currentTarget), { onSuccess: onSaved });
      }}
    >
      <div className={styles.fields}>
        <label>
          Sector
          <select
            value={sector}
            onChange={(event) => setSector(event.target.value)}
          >
            <option value="defense">Defense</option>
            <option value="health">Health</option>
            <option value="agriculture">Agriculture</option>
          </select>
        </label>
        {sector === "defense" ? (
          <label>
            Program element
            <input name="pe" pattern="[0-9]{7}[A-Z]" required />
          </label>
        ) : (
          <>
            <label>
              Program
              <input name="program" required maxLength={180} />
            </label>
            {sector === "health" ? (
              <>
                <label>
                  Agency
                  <input name="agency" required maxLength={180} />
                </label>
                <label>
                  Account
                  <input name="account" required maxLength={180} />
                </label>
              </>
            ) : (
              <label>
                Farm Bill title
                <input name="farmBillTitle" required maxLength={180} />
              </label>
            )}
          </>
        )}
        <label>
          Current maturity
          <input name="current" required maxLength={180} />
        </label>
        <label>
          Ordered maturity steps, separated by commas
          <input name="steps" required />
        </label>
      </div>
      <EvidenceFields />
      <QueryState error={add.error} />
      <button className="button primary" disabled={!add.canWrite}>
        Save draft anchor
      </button>
    </form>
  );
}
