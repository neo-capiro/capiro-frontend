"use client";
import {
  ProposalEvidence,
  type OfficeRelationship,
  type CapabilitySupport,
} from "@/features/portfolio/capabilities/public";
import type { GovernmentTarget } from "./target-contracts";
import styles from "./office-depth.module.css";
export function OfficeRelationshipCard({
  relationship,
  target,
  supports,
  capabilities,
  ownerName,
  onOpen,
  onEdit,
  onSupport,
  onBrief,
}: {
  relationship: OfficeRelationship;
  target?: GovernmentTarget;
  supports: CapabilitySupport[];
  capabilities: { id: string; name: string }[];
  ownerName?: string;
  onOpen: (id: string) => void;
  onEdit: () => void;
  onSupport: (support?: CapabilitySupport) => void;
  onBrief: (target: GovernmentTarget) => void;
}) {
  return (
    <article className={styles.card}>
      <p className="eyebrow">
        {supports.length ? "Capability support" : "Client only"}
      </p>
      <h3>{target?.memberName ?? "Saved office"}</h3>
      <p>
        {[target?.state, target?.chamber, target?.committee]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <dl className={styles.facts}>
        <div>
          <dt>Status</dt>
          <dd>{relationship.relationshipStatus.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{ownerName || "Unassigned"}</dd>
        </div>
        <div>
          <dt>Last contact</dt>
          <dd>
            {relationship.lastContactAt
              ? new Date(relationship.lastContactAt).toLocaleDateString()
              : "Not recorded"}
          </dd>
        </div>
        <div>
          <dt>Next step</dt>
          <dd>{relationship.nextStep || "Not recorded"}</dd>
        </div>
      </dl>
      {supports.map((support) => (
        <div className={styles.child} key={support.id}>
          <strong>
            {capabilities.find(
              (capability) => capability.id === support.capabilityId,
            )?.name ?? "Capability"}{" "}
            ·{" "}
            {support.stance === "unknown"
              ? "No support stance recorded"
              : support.stance}
          </strong>
          <ProposalEvidence evidence={support.evidence} />
          <button className="button" onClick={() => onSupport(support)}>
            Edit stance
          </button>
          {support.history.length > 0 && (
            <details>
              <summary>Stance history</summary>
              {support.history.map((event, index) => (
                <div className="stack" key={index}>
                  <p>
                    {new Date(event.at).toLocaleString()} ·{" "}
                    {event.previousStance
                      ? `${event.previousStance === "unknown" ? "No support stance recorded" : event.previousStance} → `
                      : ""}
                    {event.stance === "unknown"
                      ? "No support stance recorded"
                      : event.stance}
                  </p>
                  {event.sourceUnavailable ? (
                    <p className="muted">
                      Historical source is no longer available to this account.
                    </p>
                  ) : (
                    <ProposalEvidence evidence={event.evidence} />
                  )}
                </div>
              ))}
            </details>
          )}
        </div>
      ))}
      <div className={styles.actions}>
        <button className="button" onClick={() => onOpen(relationship.id)}>
          View office
        </button>
        <button className="button" onClick={onEdit}>
          Edit relationship
        </button>
        <button className="button" onClick={() => onSupport()}>
          Add capability support
        </button>
        {target && (
          <button className="button" onClick={() => onBrief(target)}>
            Member view
          </button>
        )}
      </div>
    </article>
  );
}
