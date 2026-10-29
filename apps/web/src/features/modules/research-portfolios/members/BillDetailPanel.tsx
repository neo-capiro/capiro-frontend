"use client";
import { useState } from "react";
import { useCapiroMutation, useCapiroQuery } from "../../../../shared/capiro/queries";
import type { ResearchDetail } from "../../../../shared/capiro/operations/research-schemas";
import type { ResearchBillMatch } from "../../../../shared/capiro/operations/research-bills";
import {
  ActionButton,
  DataTable,
  StatusPanel,
} from "../../../../shared/module-ui";

/**
 * One bill, as the source reports it (requirement 14c). Fields the source family does
 * not carry are listed instead of shown blank, and the coverage note names the source so
 * a user is never told that every state is supported.
 */
export function BillDetailPanel({
  bill,
  portfolio,
  onReload,
}: {
  bill: ResearchBillMatch;
  portfolio: ResearchDetail;
  onReload: () => void;
}) {
  const [added, setAdded] = useState<string>();
  const add = useCapiroMutation("research.members.add");
  const detail = useCapiroQuery("research.bills.detail", {
    params: { kind: bill.targetKind, billId: bill.targetId },
  });
  const editable = portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const alreadyMember = portfolio.members.some(
    (member) => member.targetKind === bill.targetKind && member.targetId === bill.targetId,
  );
  async function addBill() {
    if (!editable) return;
    try {
      await add.run({
        params: { id: portfolio.id },
        body: {
          expectedRevision: portfolio.revision,
          idempotencyKey: crypto.randomUUID(),
          targetKind: bill.targetKind,
          targetId: bill.targetId,
          label: `${bill.identifier} — ${bill.title}`.slice(0, 500),
        },
      });
      setAdded(bill.targetId);
      onReload();
    } catch {
      // The request error is surfaced by the status panel; no receipt is claimed.
      setAdded(undefined);
    }
  }
  return (
    <>
      <h2>
        {bill.identifier} — {bill.title}
      </h2>
      <StatusPanel loading={detail.loading} error={detail.error} onRetry={detail.reload} />
      {detail.data && (
        <>
          <dl>
            {[
              ["Jurisdiction", detail.data.jurisdiction],
              ["Session", detail.data.session || "not reported"],
              ["Status", detail.data.status || "not reported"],
              ["Status as of", detail.data.statusAt || "not reported"],
              ["Latest action", detail.data.latestActionText || "not reported"],
              ["Latest action date", detail.data.latestActionDate || "not reported"],
              ["Source revision", detail.data.sourceRevision || "not reported"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {detail.data.sourceUrl && (
            <p>
              <a href={detail.data.sourceUrl} rel="noreferrer" target="_blank">
                Open the source record
              </a>
            </p>
          )}
          <h3>Sponsors</h3>
          <DataTable
            rows={[...detail.data.sponsors]}
            rowKey={(sponsor) => `${sponsor.name}:${sponsor.role}`}
            caption="Bill sponsors"
            columns={[
              { key: "name", label: "Name", render: (sponsor) => sponsor.name },
              { key: "party", label: "Party", render: (sponsor) => sponsor.party || "—" },
              { key: "role", label: "Role", render: (sponsor) => sponsor.role },
            ]}
          />
          <h3>Committees</h3>
          <DataTable
            rows={[...detail.data.committees]}
            rowKey={(committee) => `${committee.name}:${committee.role}`}
            caption="Bill committees"
            columns={[
              { key: "name", label: "Committee", render: (committee) => committee.name },
              {
                key: "chamber",
                label: "Chamber",
                render: (committee) => committee.chamber || "—",
              },
            ]}
          />
          <h3>Text versions</h3>
          <DataTable
            rows={[...detail.data.textVersions]}
            rowKey={(version) => `${version.label}:${version.date ?? ""}`}
            caption="Bill text versions"
            columns={[
              { key: "label", label: "Version", render: (version) => version.label },
              { key: "date", label: "Date", render: (version) => version.date || "—" },
            ]}
          />
          <h3>Votes</h3>
          <DataTable
            rows={[...detail.data.votes]}
            rowKey={(vote) => `${vote.date ?? ""}:${vote.question}`}
            caption="Bill votes"
            columns={[
              { key: "date", label: "Date", render: (vote) => vote.date || "—" },
              { key: "question", label: "Question", render: (vote) => vote.question },
              { key: "result", label: "Result", render: (vote) => vote.result },
            ]}
          />
          {detail.data.relatedBills.length > 0 && (
            <>
              <h3>Related bills</h3>
              <DataTable
                rows={[...detail.data.relatedBills]}
                rowKey={(related) => `${related.identifier}:${related.relation}`}
                caption="Related bills"
                columns={[
                  { key: "identifier", label: "Bill", render: (related) => related.identifier },
                  { key: "relation", label: "Relation", render: (related) => related.relation },
                ]}
              />
            </>
          )}
          {detail.data.unavailable.length > 0 && (
            <p>Not provided by this source: {detail.data.unavailable.join(", ")}.</p>
          )}
          <p role="status">{detail.data.coverage.note}</p>
          {editable && (
            <ActionButton
              primary
              disabled={add.pending || alreadyMember || added === bill.targetId}
              onClick={addBill}
            >
              {alreadyMember
                ? "Already in this portfolio"
                : added === bill.targetId
                  ? "Added"
                  : "Add to portfolio"}
            </ActionButton>
          )}
        </>
      )}
    </>
  );
}
