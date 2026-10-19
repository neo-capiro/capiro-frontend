"use client";
import type { ProfileDistrictPriority } from "./profile-evidence-contracts";
import {
  ProfileEvidenceState,
  ProfileReturnedRows,
  profileTime,
} from "./ProfileEvidenceState";
import styles from "./facility-profile.module.css";

type EvidenceStatus = Parameters<typeof ProfileEvidenceState>[0]["query"];

export function FacilityEvidenceChanges({
  id,
  status,
  data,
}: {
  id: string;
  status: EvidenceStatus;
  data: ProfileDistrictPriority | undefined;
}) {
  const signals = data?.priorityIntelligence;
  return (
    <section
      id={id}
      tabIndex={-1}
      className={styles.card}
      aria-label="Changes and evidence"
    >
      <h3>Changes &amp; evidence</h3>
      <ProfileEvidenceState query={status} />
      {data && (
        <>
          <p className="muted">
            Response computed {profileTime(data.computedAt)}; source observation
            and dataset vintage remain separate.
          </p>
          <p className="muted">
            Priority context {data.districtKey} · Source boundary Congress{" "}
            {data.geographyVintage.boundaryCongress ?? "unavailable"}.
          </p>
          {data.geographyVintage.conflict && (
            <p role="status">
              Geography vintage conflict:{" "}
              {data.geographyVintage.detail ?? "Details unavailable"}
            </p>
          )}
          {signals?.recentChanges.length ? (
            <ProfileReturnedRows
              rows={signals.recentChanges}
              rowKey={(row, index) =>
                `${row.source}-${row.sourceRecordId}-${index}`
              }
              render={(row) => (
                <>
                  <strong>{row.changeKind.replaceAll("_", " ")}</strong>
                  <p>
                    {row.source} · {row.severity} · Source year{" "}
                    {row.sourceYear ?? "unavailable"}
                  </p>
                  <p className="muted">
                    Source geography{" "}
                    {[row.state, row.district].filter(Boolean).join("-") ||
                      "unavailable"}{" "}
                    · Boundary Congress {row.boundaryCongress ?? "unavailable"}{" "}
                    · Vintage {row.geographyVintage ?? "unavailable"}
                  </p>
                  <p className="muted">
                    Observed {profileTime(row.observedAt)} · Effective{" "}
                    {profileTime(row.effectiveAt)} · Source record{" "}
                    {row.sourceRecordId}
                  </p>
                </>
              )}
            />
          ) : (
            <p className="muted">
              No recent change observations returned. This does not prove the
              feed is current.
            </p>
          )}
          <dl className={styles.facts}>
            {data.freshness.map((row) => (
              <div key={row.rail}>
                <dt>{row.rail.replaceAll("_", " ")}</dt>
                <dd>
                  {row.status}
                  {row.stale ? " · stale" : ""} · Source year{" "}
                  {row.sourceYear ?? "unavailable"}
                  <br />
                  Last success {profileTime(row.lastSuccessAt)}
                </dd>
              </div>
            ))}
          </dl>
          {data.missingPrioritySources.length > 0 && (
            <p className="muted">
              Missing priority inputs: {data.missingPrioritySources.join(", ")}
            </p>
          )}
          {data.warnings.map((text, index) => (
            <p className="muted" key={index}>
              {text}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
