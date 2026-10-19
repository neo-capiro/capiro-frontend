"use client";
import type { ProfileDistrictStrategic } from "./profile-evidence-contracts";
import { ProfileEvidenceState, profileTime } from "./ProfileEvidenceState";
import { SourceFreshnessRows } from "./NexusSourceFreshness";
import styles from "./facility-profile.module.css";

type EvidenceStatus = Parameters<typeof ProfileEvidenceState>[0]["query"];

export function FacilityStrategicRelevance({
  id,
  status,
  data,
}: {
  id: string;
  status: EvidenceStatus;
  data: ProfileDistrictStrategic | undefined;
}) {
  const context = data?.strategic;
  return (
    <section
      id={id}
      tabIndex={-1}
      className={styles.card}
      aria-label="Strategic relevance"
    >
      <h3>Strategic relevance</h3>
      <p className="muted">
        District-level relevance for this client, separate from physical Nexus
        Strength.
      </p>
      <ProfileEvidenceState query={status} />
      {context && (
        <>
          <p>
            <strong>
              {context.score === null
                ? "Insufficient evidence"
                : `${context.score}/100`}
            </strong>{" "}
            · Coverage {context.coveragePercent}%
          </p>
          <p className="muted">
            Score {context.scoreVersion} · Weights {context.weightsVersion} ·
            Computed {profileTime(context.computedAt)}
          </p>
          <dl className={styles.facts}>
            {context.breakdown.map((row) => (
              <div key={row.component}>
                <dt>{row.label}</dt>
                <dd>
                  {row.status} ·{" "}
                  {row.credit === null
                    ? "Credit unavailable"
                    : `${row.credit} / ${row.weight}`}
                  <br />
                  {row.rationale}
                </dd>
              </div>
            ))}
          </dl>
          {context.conflicts.map((row, index) => (
            <p className="muted" key={`${row.code}-${index}`}>
              {row.message}
            </p>
          ))}
          {context.missingComponents.length > 0 && (
            <p className="muted">
              Missing components: {context.missingComponents.join(", ")}
            </p>
          )}
          {context.unavailableComponents.length > 0 && (
            <p className="muted">
              Unavailable components: {context.unavailableComponents.join(", ")}
            </p>
          )}
          <SourceFreshnessRows sources={context.freshness} />
        </>
      )}
    </section>
  );
}
