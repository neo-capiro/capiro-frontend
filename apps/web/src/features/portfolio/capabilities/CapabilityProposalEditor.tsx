"use client";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  capabilityPayloadSchema,
  portfolioProposalSchema,
  type CapabilityProposal,
} from "./proposal-contracts";
import { usePortfolioCommand } from "./depth-api";
import styles from "./depth.module.css";

export function CapabilityProposalEditor({
  clientId,
  proposal,
  onClose,
}: {
  clientId: string;
  proposal: CapabilityProposal;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const save = usePortfolioCommand(
    clientId,
    `edit-proposal:${proposal.id}`,
    (form: FormData) => ({
      path: `capabilities/discovery/proposals/${proposal.id}`,
      method: "PATCH",
      schema: portfolioProposalSchema,
      body: {
        expectedVersion: proposal.version,
        proposal: {
          kind: "capability",
          evidence: proposal.evidence,
          capabilityId: proposal.capabilityId ?? undefined,
          payload: capabilityPayloadSchema.parse({
            ...proposal.payload,
            name: form.get("name"),
            type: form.get("type"),
            lifecycle: form.get("lifecycle"),
            description: form.get("description"),
            tags: String(form.get("tags") ?? "")
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          }),
        },
      },
    }),
  );
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value && !save.isPending) onClose();
      }}
      title="Edit capability proposal"
      description="Review the company’s separately named product or service. Its supporting sources stay attached."
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          save.mutate(new FormData(event.currentTarget), {
            onSuccess: onClose,
            onError: (cause) => setError(cause.message),
          });
        }}
      >
        <div className={styles.fields}>
          <label>
            Name
            <input
              name="name"
              required
              maxLength={180}
              defaultValue={proposal.payload.name}
            />
          </label>
          <label>
            Type
            <select name="type" defaultValue={proposal.payload.type}>
              {["product", "platform", "service", "program", "component"].map(
                (type) => (
                  <option key={type}>{type}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Lifecycle
            <select name="lifecycle" defaultValue={proposal.payload.lifecycle}>
              {["in_service", "in_development", "planned", "unspecified"].map(
                (status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            Family and domain tags
            <input
              name="tags"
              defaultValue={proposal.payload.tags.join(", ")}
            />
          </label>
          <label className={styles.full}>
            Description
            <textarea
              name="description"
              required
              maxLength={4000}
              rows={4}
              defaultValue={proposal.payload.description}
            />
          </label>
        </div>
        {error && <p role="alert">{error}</p>}
        <QueryState error={save.error} />
        <div className={styles.actions}>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={!save.canWrite}>
            Save proposal
          </button>
        </div>
      </form>
    </Dialog>
  );
}
