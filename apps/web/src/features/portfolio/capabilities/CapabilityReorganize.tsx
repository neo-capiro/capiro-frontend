"use client";
import { z } from "zod";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { usePortfolioCommand } from "./depth-api";
import {
  portfolioProposalSchema,
  type CapabilityProposal,
} from "./proposal-contracts";
import { ProposalEvidence } from "./ProposalEvidence";
import styles from "./depth.module.css";

export function MergeCapabilities({
  clientId,
  proposals,
  onClose,
}: {
  clientId: string;
  proposals: CapabilityProposal[];
  onClose: () => void;
}) {
  const merge = usePortfolioCommand(
    clientId,
    "merge-capabilities",
    (name: string) => ({
      path: "capabilities/discovery/merge",
      schema: portfolioProposalSchema,
      body: {
        ids: proposals.map((p) => p.id),
        expectedVersions: proposals.map((p) => p.version),
        name,
      },
    }),
  );
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title="Merge duplicate capabilities"
      description="Use one name for the same product. Evidence from every selected proposal is retained."
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          merge.mutate(String(new FormData(event.currentTarget).get("name")), {
            onSuccess: onClose,
          });
        }}
      >
        <ul>
          {proposals.map((proposal) => (
            <li key={proposal.id}>{proposal.payload.name}</li>
          ))}
        </ul>
        <label>
          Capability name
          <input
            name="name"
            required
            maxLength={180}
            defaultValue={proposals[0]?.payload.name}
          />
        </label>
        <QueryState error={merge.error} />
        <div className={styles.actions}>
          <button className="button primary" disabled={!merge.canWrite}>
            Merge
          </button>
          <button type="button" className="button" onClick={onClose}>
            Keep separate
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function SplitCapability({
  clientId,
  proposal,
  onClose,
}: {
  clientId: string;
  proposal: CapabilityProposal;
  onClose: () => void;
}) {
  const split = usePortfolioCommand(
    clientId,
    `split-capability:${proposal.id}`,
    (form: FormData) => ({
      path: `capabilities/discovery/proposals/${proposal.id}/split`,
      schema: z.array(portfolioProposalSchema),
      body: {
        expectedVersion: proposal.version,
        parts: [0, 1].map((index) => ({
          ...proposal.payload,
          name: String(form.get(`name${index}`)),
          description: String(form.get(`description${index}`)),
        })),
      },
    }),
  );
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title="Split distinct capabilities"
      description="Use the company’s separately named products. Confirm that the retained source evidence supports each new capability."
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          split.mutate(new FormData(event.currentTarget), {
            onSuccess: onClose,
          });
        }}
      >
        <ProposalEvidence evidence={proposal.evidence} />
        {[0, 1].map((index) => (
          <fieldset key={index} className={styles.fields}>
            <legend>Capability {index + 1}</legend>
            <label>
              Name
              <input name={`name${index}`} required maxLength={180} />
            </label>
            <label>
              Description
              <textarea
                name={`description${index}`}
                required
                maxLength={4000}
                rows={3}
              />
            </label>
          </fieldset>
        ))}
        <label>
          <input type="checkbox" required /> The retained sources support both
          named capabilities.
        </label>
        <QueryState error={split.error} />
        <div className={styles.actions}>
          <button className="button primary" disabled={!split.canWrite}>
            Review split
          </button>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}
