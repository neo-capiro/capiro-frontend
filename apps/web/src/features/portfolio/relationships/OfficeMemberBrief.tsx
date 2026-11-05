"use client";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import {
  CaseForSupport,
  usePortfolioDepth,
} from "@/features/portfolio/capabilities/public";
import type { GovernmentTarget } from "./target-contracts";

export function OfficeMemberBrief({
  clientId,
  target,
  capabilities,
  onClose,
}: {
  clientId: string;
  target: GovernmentTarget;
  capabilities: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [capabilityId, setCapabilityId] = useState(capabilities[0]?.id ?? "");
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const depth = usePortfolioDepth(clientId);
  const relationship =
    depth.isSuccess && !depth.error
      ? depth.data.relationships.find((row) => row.id === target.id)
      : undefined;
  const savedTerm =
    relationship?.officeTerm === "unknown"
      ? undefined
      : relationship?.officeTerm;
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title={`Member view · ${target.memberName ?? "Saved office"}`}
    >
      <div className="stack">
        <label>
          Office term
          <input
            value={selectedTerm ?? savedTerm ?? ""}
            onChange={(event) => setSelectedTerm(event.target.value)}
            placeholder="Select the term supported by the evidence"
            maxLength={180}
          />
        </label>
        <label>
          Capability
          <select
            value={capabilityId}
            onChange={(event) => setCapabilityId(event.target.value)}
          >
            {capabilities.map((capability) => (
              <option key={capability.id} value={capability.id}>
                {capability.name}
              </option>
            ))}
          </select>
        </label>
        {capabilityId ? (
          <CaseForSupport
            clientId={clientId}
            capabilityId={capabilityId}
            memberId={target.memberId}
            memberName={target.memberName ?? undefined}
            sourceDirectory={target.sourceDirectory}
            officeTerm={selectedTerm ?? savedTerm ?? undefined}
          />
        ) : (
          <p>No capability is available for a member brief.</p>
        )}
      </div>
    </Dialog>
  );
}
