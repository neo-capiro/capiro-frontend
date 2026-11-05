"use client";
import { useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  EvidenceFields,
  evidenceFromForm,
  usePortfolioCommand,
  portfolioProposalSchema,
} from "@/features/portfolio/capabilities/public";
import type { GovernmentTarget } from "./target-contracts";
import styles from "./office-depth.module.css";

export function MemberStatementForm({
  clientId,
  targets,
  onSaved,
}: {
  clientId: string;
  targets: GovernmentTarget[];
  onSaved: () => void;
}) {
  const [targetId, setTargetId] = useState("");
  const target = targets.find((target) => target.id === targetId);
  const add = usePortfolioCommand(
    clientId,
    "member-statement",
    (form: FormData) => ({
      path: "targets/recommendations/proposals",
      schema: portfolioProposalSchema,
      body: {
        kind: "statement",
        payload: {
          memberId: target?.memberId ?? String(form.get("memberId")),
          sourceDirectory:
            target?.sourceDirectory ?? form.get("sourceDirectory"),
          officeTerm: form.get("officeTerm"),
          statementDate: `${form.get("statementDate")}T00:00:00.000Z`,
          summary: form.get("summary"),
          tags: String(form.get("tags") ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
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
      <h3>Record an attributable official statement</h3>
      <p>
        Use official member pages, press releases, hearing or floor remarks,
        bills or letters with a publication date. A social post alone is
        insufficient.
      </p>
      <label>
        Saved office
        <select
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
        >
          <option value="">Another office</option>
          {targets
            .filter((target) => target.sourceDirectory !== "staff")
            .map((target) => (
              <option key={target.id} value={target.id}>
                {target.memberName ?? target.memberId}
              </option>
            ))}
        </select>
      </label>
      {!target && (
        <div className={styles.filters}>
          <label>
            Official member identifier
            <input name="memberId" required maxLength={180} />
          </label>
          <label>
            Directory
            <select name="sourceDirectory">
              <option value="congress">Congress</option>
              <option value="state">State legislature</option>
            </select>
          </label>
        </div>
      )}
      <div className={styles.filters}>
        <label>
          Office term
          <input name="officeTerm" required maxLength={180} />
        </label>
        <label>
          Statement date
          <input
            name="statementDate"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
          />
        </label>
      </div>
      <label>
        Supported summary
        <textarea name="summary" required maxLength={4000} rows={4} />
      </label>
      <label>
        Source topic tags, separated by commas
        <input name="tags" />
      </label>
      <EvidenceFields />
      <QueryState error={add.error} />
      <button className="button primary" disabled={!add.canWrite}>
        Add statement for review
      </button>
    </form>
  );
}
