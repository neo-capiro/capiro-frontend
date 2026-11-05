"use client";
import { useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  usePortfolioDepth,
  type OfficeRelationship,
  type CapabilitySupport,
} from "@/features/portfolio/capabilities/public";
import { useProfileMemberOptions } from "@/features/portfolio/client-profile/public";
import type { GovernmentTarget } from "./target-contracts";
import {
  relationshipGaps,
  filterOfficeRelationships,
} from "./relationship-coverage";
import { OfficeRelationshipMap } from "./OfficeRelationshipMap";
import { RelationshipEditor } from "./RelationshipEditor";
import { CapabilitySupportEditor } from "./CapabilitySupportEditor";
import { OfficeMemberBrief } from "./OfficeMemberBrief";
import styles from "./office-depth.module.css";
import { OfficeRelationshipCard } from "./OfficeRelationshipCard";
import { OfficeGeographicCoverage } from "./OfficeGeographicCoverage";

export function OfficeRelationships({
  clientId,
  targets,
  onOpen,
}: {
  clientId: string;
  targets: GovernmentTarget[];
  onOpen: (memberId: string) => void;
}) {
  const query = usePortfolioDepth(clientId);
  const owners = useProfileMemberOptions();
  const [filters, setFilters] = useState({
    capability: "",
    status: "",
    geography: "",
    owner: "",
  });
  const [view, setView] = useState("map");
  const [editing, setEditing] = useState<OfficeRelationship>();
  const [supporting, setSupporting] = useState<{
    targetId: string;
    support?: CapabilitySupport;
  }>();
  const [brief, setBrief] = useState<GovernmentTarget>();
  const data = query.isSuccess && !query.error ? query.data : undefined;
  const visible = data
    ? filterOfficeRelationships(
        data.relationships,
        targets,
        data.supports,
        filters,
      )
    : [];
  const gaps = data
    ? relationshipGaps(data.relationships, data.capabilities, data.supports)
    : undefined;
  return (
    <section
      className={styles.section}
      aria-label="Office relationships and capability support"
    >
      <header className="row between">
        <div>
          <h2>Office relationships</h2>
          <p className="muted">
            Client-to-office links with optional capability support underneath.
          </p>
        </div>
        <label>
          View
          <select
            value={view}
            onChange={(event) => setView(event.target.value)}
          >
            <option value="map">Relationship map</option>
            <option value="geography">Geographic coverage</option>
            <option value="list">Relationship list</option>
            <option value="gaps">Coverage gaps</option>
          </select>
        </label>
      </header>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {data && (
        <>
          {data.relationshipConflicts.map((conflict) => (
            <p
              key={`${conflict.targetId}:${conflict.otherClientId}`}
              className={styles.note}
              role="alert"
            >
              <strong>Relationship needs review</strong> ·{" "}
              {conflict.otherClientName}: {conflict.reason}
            </p>
          ))}
          <div className={styles.filters}>
            <label>
              Capability
              <select
                value={filters.capability}
                onChange={(event) =>
                  setFilters({ ...filters, capability: event.target.value })
                }
              >
                <option value="">All capabilities</option>
                {data.capabilities.map((capability) => (
                  <option key={capability.id} value={capability.id}>
                    {capability.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters({ ...filters, status: event.target.value })
                }
              >
                <option value="">All statuses</option>
                {[
                  ...new Set(
                    data.relationships.map((row) => row.relationshipStatus),
                  ),
                ].map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              State, district or site
              <input
                value={filters.geography}
                onChange={(event) =>
                  setFilters({ ...filters, geography: event.target.value })
                }
              />
            </label>
            <label>
              Owner
              <select
                value={filters.owner}
                onChange={(event) =>
                  setFilters({ ...filters, owner: event.target.value })
                }
              >
                <option value="">All owners</option>
                {owners.data?.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {[owner.firstName, owner.lastName]
                      .filter(Boolean)
                      .join(" ") || owner.email}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {view === "map" && (
            <OfficeRelationshipMap
              relationships={visible}
              targets={targets}
              supports={data.supports}
              onOpen={onOpen}
            />
          )}
          {view === "geography" && (
            <OfficeGeographicCoverage
              clientId={clientId}
              targets={targets.filter((target) =>
                visible.some((row) => row.id === target.id),
              )}
            />
          )}
          {view === "gaps" && gaps && (
            <div className={styles.grid}>
              <article className={styles.card}>
                <h3>Offices without capability support</h3>
                {gaps.officesWithoutCapabilities.map((row) => (
                  <button
                    className="button"
                    key={row.id}
                    onClick={() => setSupporting({ targetId: row.id })}
                  >
                    {targets.find((target) => target.id === row.id)
                      ?.memberName ?? "Saved office"}{" "}
                    · Add support
                  </button>
                ))}
                {!gaps.officesWithoutCapabilities.length && (
                  <p>No gaps in saved office links.</p>
                )}
              </article>
              <article className={styles.card}>
                <h3>Capabilities without an office</h3>
                {gaps.capabilitiesWithoutOffices.map((row) => (
                  <p key={row.id}>{row.name}</p>
                ))}
                {!gaps.capabilitiesWithoutOffices.length && (
                  <p>No gaps in capability coverage.</p>
                )}
              </article>
            </div>
          )}
          <div
            id="office-relationship-list"
            tabIndex={-1}
            className={styles.grid}
          >
            {visible.map((relationship) => (
              <OfficeRelationshipCard
                key={`${relationship.id}:${relationship.version}`}
                relationship={relationship}
                target={targets.find((target) => target.id === relationship.id)}
                supports={data.supports.filter(
                  (support) => support.targetId === relationship.id,
                )}
                capabilities={data.capabilities}
                ownerName={owners.data
                  ?.filter((owner) => owner.id === relationship.ownerUserId)
                  .map(
                    (owner) =>
                      [owner.firstName, owner.lastName]
                        .filter(Boolean)
                        .join(" ") || owner.email,
                  )
                  .join("")}
                onOpen={onOpen}
                onEdit={() => setEditing(relationship)}
                onSupport={(support) =>
                  setSupporting({ targetId: relationship.id, support })
                }
                onBrief={setBrief}
              />
            ))}
          </div>
          {!visible.length && (
            <p className="muted">
              No office relationships match these filters.
            </p>
          )}
        </>
      )}
      {editing && data && (
        <RelationshipEditor
          clientId={clientId}
          relationship={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
      {supporting && data && (
        <CapabilitySupportEditor
          clientId={clientId}
          targetId={supporting.targetId}
          support={supporting.support}
          capabilities={data.capabilities}
          onClose={() => setSupporting(undefined)}
        />
      )}
      {brief && data && (
        <OfficeMemberBrief
          clientId={clientId}
          target={brief}
          capabilities={data.capabilities}
          onClose={() => setBrief(undefined)}
        />
      )}
    </section>
  );
}
