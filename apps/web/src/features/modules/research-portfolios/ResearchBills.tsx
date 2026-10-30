"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import type {
  ResearchBillKind,
  ResearchBillMatch,
} from "../../../shared/capiro/operations/research-bills";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { BillDetailPanel } from "./members/BillDetailPanel";
import styles from "./research.module.css";

/**
 * Bill detail (requirement 14c): authoritative identity, status, latest action and the
 * fields the source family actually carries. Fields it does not carry are listed rather
 * than shown blank, and coverage names the source so a user is not told every state is
 * supported.
 */
export function ResearchBills({
  portfolio,
  onReload,
}: {
  portfolio: ResearchDetail;
  onReload: () => void;
}) {
  const [kind, setKind] = useState<ResearchBillKind>("federal_bill");
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<ResearchBillMatch>();
  const search = useCapiroQuery(
    "research.bills.search",
    { query: { q: submitted, limit: 25 } },
    { enabled: submitted.length >= 2 },
  );
  const coverage = search.data?.coverage;
  const matches = (search.data?.items ?? []).filter((bill) => bill.targetKind === kind);
  return (
    <>
      <p>
        Bills are legislative subjects. Their status, session and referrals are tracked
        separately from funding figures and never counted as funding.
      </p>
      <div className={styles.toolbar}>
        <Field label="Bill type" htmlFor="research-bill-kind">
          <select
            id="research-bill-kind"
            className={styles.select}
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as ResearchBillKind);
              setSelected(undefined);
              setSubmitted("");
              setTerm("");
            }}
          >
            <option value="federal_bill">Federal bill</option>
            <option value="state_bill">State bill</option>
          </select>
        </Field>
        <form
          className={styles.toolbar}
          onSubmit={(event) => {
            event.preventDefault();
            if (term.trim().length >= 2) {
              setSubmitted(term.trim());
              setSelected(undefined);
              search.reload();
            }
          }}
        >
          <Field label="Find by number, title or subject" htmlFor="research-bill-term">
            <TextInput
              id="research-bill-term"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </Field>
          <ActionButton primary type="submit" disabled={term.trim().length < 2}>
            Search bills
          </ActionButton>
        </form>
      </div>
      <StatusPanel
        loading={search.loading}
        error={search.error}
        onRetry={search.reload}
      />
      {coverage && (
        <p role="status">
          {coverage.note}
          {coverage.state === "unavailable" && " State bills are unavailable right now."}
          {coverage.statesWithData.length > 0 &&
            ` States with bills in this environment: ${coverage.statesWithData.join(", ")}.`}
        </p>
      )}
      {search.data && (
        <DataTable
          rows={matches}
          rowKey={(bill) => `${bill.targetKind}:${bill.targetId}`}
          caption="Bill matches"
          columns={[
            {
              key: "identifier",
              label: "Bill",
              render: (bill) => <strong>{bill.identifier}</strong>,
            },
            { key: "title", label: "Title", render: (bill) => bill.title },
            {
              key: "where",
              label: "Jurisdiction",
              render: (bill) => (
                <>
                  {bill.jurisdiction}
                  {bill.session ? ` · session ${bill.session}` : ""}
                </>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (bill) => (
                <>
                  <Badge>{bill.status || "status not reported"}</Badge>
                  {bill.latestActionDate && <p>Action {bill.latestActionDate}</p>}
                </>
              ),
            },
            {
              key: "action",
              label: "Open",
              render: (bill) => (
                <ActionButton onClick={() => setSelected(bill)}>View bill</ActionButton>
              ),
            },
          ]}
        />
      )}
      {selected && (
        <BillDetailPanel
          key={`${selected.targetKind}:${selected.targetId}`}
          bill={selected}
          portfolio={portfolio}
          onReload={onReload}
        />
      )}
    </>
  );
}
