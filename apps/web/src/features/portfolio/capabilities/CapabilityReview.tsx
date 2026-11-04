"use client";
import { useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { usePortfolioDepth, useDiscoveryResults } from "./depth-api";
import type { CapabilityProposal } from "./proposal-contracts";
import { ProposalEvidence } from "./ProposalEvidence";
import { ProposalActions } from "./ProposalActions";
import { CapabilityProposalEditor } from "./CapabilityProposalEditor";
import { MergeCapabilities, SplitCapability } from "./CapabilityReorganize";
import { CapabilityDiscovery } from "./CapabilityDiscovery";
import { BusinessUnitSelection } from "./BusinessUnitSelection";
import styles from "./depth.module.css";

export function CapabilityReview({ clientId }: { clientId: string }) {
  const query = usePortfolioDepth(clientId);
  const [status, setStatus] = useState("proposed");
  const [selected, setSelected] = useState<string[]>([]);
  const [unit, setUnit] = useState("");
  const [editing, setEditing] = useState<CapabilityProposal>();
  const [splitting, setSplitting] = useState<CapabilityProposal>();
  const [merging, setMerging] = useState(false);
  const results = useDiscoveryResults(clientId, unit || undefined);
  const proposals =
    results.isSuccess && !results.error
      ? results.data.pages
          .flatMap((page) => page.proposals)
          .filter((p): p is CapabilityProposal => p.kind === "capability")
      : [];
  const visible = proposals.filter(
    (p) => p.status === status && (!unit || p.payload.businessUnitId === unit),
  );
  const selectedProposals = proposals.filter(
    (p) => selected.includes(p.id) && p.status === "proposed",
  );
  return (
    <section
      className={styles.section}
      aria-label="Capability discovery and review"
    >
      <header className="row between">
        <div>
          <h2>Discover and review capabilities</h2>
          <p className="muted">
            Named products and services, with sources that remain available
            after approval.
          </p>
        </div>
        <CapabilityDiscovery
          clientId={clientId}
          businessUnitId={unit || undefined}
        />
      </header>
      <QueryState
        pending={query.isPending || results.isPending}
        error={query.error ?? results.error}
        retry={() => {
          void query.refetch();
          void results.refetch();
        }}
      />
      {query.isSuccess && !query.error && (
        <>
          <BusinessUnitSelection
            clientId={clientId}
            proposals={query.data.businessUnits}
            value={unit}
            onChange={(value) => {
              setUnit(value);
              setSelected([]);
            }}
          />
          <div className={styles.actions}>
            <label>
              Review status{" "}
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setSelected([]);
                }}
              >
                {["proposed", "approved", "rejected", "merged", "split"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </label>
            <span>{visible.length} loaded capabilities</span>
            <button
              className="button"
              disabled={
                selectedProposals.length < 2 ||
                selectedProposals.length > 12 ||
                query.isFetching ||
                results.isFetching
              }
              onClick={() => setMerging(true)}
            >
              Merge selected duplicates
            </button>
          </div>
          <div className={styles.grid}>
            {visible.map((proposal) => (
              <CapabilityProposalCard
                key={`${proposal.id}:${proposal.version}`}
                clientId={clientId}
                proposal={proposal}
                selected={selected.includes(proposal.id)}
                onSelect={(checked) =>
                  setSelected((current) =>
                    checked
                      ? [...current, proposal.id]
                      : current.filter((id) => id !== proposal.id),
                  )
                }
                onEdit={() => setEditing(proposal)}
                onSplit={() => setSplitting(proposal)}
              />
            ))}
          </div>
          {visible.length === 0 && (
            <p className={styles.notice}>
              No {status} capabilities in the loaded results.{" "}
              {results.hasNextPage
                ? "Show more to continue reviewing saved proposals."
                : "Research the profile to discover named capabilities."}
            </p>
          )}
          {results.hasNextPage && (
            <button
              className="button"
              disabled={results.isFetchingNextPage}
              onClick={() => void results.fetchNextPage()}
            >
              Show more
            </button>
          )}
        </>
      )}
      {editing &&
        query.isSuccess &&
        !query.error &&
        results.isSuccess &&
        !results.error && (
          <CapabilityProposalEditor
            clientId={clientId}
            proposal={editing}
            onClose={() => setEditing(undefined)}
          />
        )}
      {splitting &&
        query.isSuccess &&
        !query.error &&
        results.isSuccess &&
        !results.error && (
          <SplitCapability
            clientId={clientId}
            proposal={splitting}
            onClose={() => setSplitting(undefined)}
          />
        )}
      {merging && selectedProposals.length >= 2 && (
        <MergeCapabilities
          clientId={clientId}
          proposals={selectedProposals}
          onClose={() => {
            setMerging(false);
            setSelected([]);
          }}
        />
      )}
    </section>
  );
}
function CapabilityProposalCard({
  clientId,
  proposal,
  selected,
  onSelect,
  onEdit,
  onSplit,
}: {
  clientId: string;
  proposal: CapabilityProposal;
  selected: boolean;
  onSelect: (value: boolean) => void;
  onEdit: () => void;
  onSplit: () => void;
}) {
  return (
    <article className={styles.card}>
      <p className="eyebrow" data-status={proposal.status}>
        {proposal.status}
      </p>
      <h3>{proposal.payload.name}</h3>
      <p className="muted">
        {proposal.payload.type} ·{" "}
        {proposal.payload.lifecycle.replaceAll("_", " ")}
      </p>
      <p>{proposal.payload.description}</p>
      <div className={styles.chips}>
        {proposal.payload.tags.map((tag) => (
          <span className="chip" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <ProposalEvidence evidence={proposal.evidence} />
      <ProposalActions clientId={clientId} proposal={proposal} />
      {proposal.status === "proposed" && (
        <div className={styles.actions}>
          <button className="button" onClick={onEdit}>
            Edit
          </button>
          <button className="button" onClick={onSplit}>
            Split
          </button>
          <label>
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onSelect(event.target.checked)}
            />{" "}
            Select duplicate
          </label>
        </div>
      )}
    </article>
  );
}
