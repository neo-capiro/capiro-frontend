import { useEffect, useState } from "react";
import { strategyChangeSet } from "../../src/shared/capiro/operations/strategy-change-set";
import { ReviewProposal } from "../../src/features/modules/strategies/review/ProposalReview";

const id = "51000000-0000-4000-8000-000000000001";
const replacementPin = "51000000-0000-4000-8000-000000000002";
const initialOps = [
  {
    op: "synthetic-unrecognized",
    title: "Original unsupported audit",
    privateFixture: { nested: [1, null] },
  },
  { op: "remove", nodeId: id, title: "Original removable step" },
  {
    op: "update",
    nodeId: id,
    title: "Original recognized step",
    sources: [{ section: "Synthetic original", ref: "fixture/audit" }],
  },
];
function initialProposal() {
  const requested = new URLSearchParams(location.search).get("status");
  const status = strategyChangeSet.shape.status.safeParse(requested);
  return strategyChangeSet.parse({
    id,
    strategyId: id,
    summary: "Synthetic refreshed proposal",
    ops: initialOps,
    risk: "low",
    status: status.success ? status.data : "proposed",
    strategyVersionId: id,
    appliedVersionId: null,
    createdAt: "2026-10-14T12:00:00Z",
    appliedAt: null,
    approvedAt: null,
  });
}
/** Test-only mount changes props on the canonical review, without product hooks. */
export function ProposalRefreshProbe() {
  const [proposal, setProposal] = useState(initialProposal);
  const [open, setOpen] = useState(true);
  const [available, setAvailable] = useState(true);
  const [saved, setSaved] = useState(0);
  const [closed, setClosed] = useState(0);
  useEffect(() => {
    function refresh(event: Event) {
      const kind = (event as CustomEvent<unknown>).detail;
      if (kind === "unavailable") {
        setAvailable(false);
        return;
      }
      setProposal((current) => {
        if (kind === "content")
          return {
            ...current,
            ops: [
              initialOps[0],
              { ...initialOps[1], title: "Replacement recognized step" },
              null,
            ],
          };
        if (kind === "status") return { ...current, status: "stale" };
        if (kind === "pin")
          return { ...current, strategyVersionId: replacementPin };
        if (kind === "approved-empty")
          return { ...current, status: "approved", approvedOps: [] };
        return current;
      });
    }
    window.addEventListener("test:proposal-refresh", refresh);
    return () => window.removeEventListener("test:proposal-refresh", refresh);
  }, []);
  return (
    <section>
      <h1>Synthetic Strategy refresh probe</h1>
      <p data-testid="proposal-saved">Saved callbacks: {saved}</p>
      <p data-testid="proposal-closed">Closed callbacks: {closed}</p>
      {!open && (
        <button onClick={() => setOpen(true)}>Reopen synthetic review</button>
      )}
      {open && (
        <ReviewProposal
          proposal={proposal}
          available={available}
          onSaved={() => setSaved((value) => value + 1)}
          onClose={() => {
            setClosed((value) => value + 1);
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}
