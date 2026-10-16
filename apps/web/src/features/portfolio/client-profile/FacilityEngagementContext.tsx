"use client";
import Link from "next/link";
import type {
  ProfileDistrictStrategic,
  ProfileEvidenceScope,
} from "./profile-evidence-contracts";
import {
  ProfileEvidenceState,
  ProfileReturnedRows,
  profileTime,
} from "./ProfileEvidenceState";
import styles from "./facility-profile.module.css";

type EvidenceStatus = Parameters<typeof ProfileEvidenceState>[0]["query"];

export function FacilityEngagementContext({
  id,
  scope,
  status,
  data,
}: {
  id: string;
  scope: ProfileEvidenceScope;
  status: EvidenceStatus;
  data: ProfileDistrictStrategic | undefined;
}) {
  const context = data?.strategic;
  const engagement = context?.evidence.filter(
    (row) =>
      row.component === "relationshipEngagement" ||
      row.component === "activeStrategyTarget" ||
      row.component === "hearingTiming",
  );
  return (
    <section
      id={id}
      tabIndex={-1}
      className={styles.card}
      aria-label="Strategy and engagement context"
    >
      <h3>Strategy &amp; engagement</h3>
      <ProfileEvidenceState query={status} />
      {engagement &&
        (engagement.length ? (
          <ProfileReturnedRows
            rows={engagement}
            rowKey={(row, index) =>
              `${row.sourceType}-${row.sourceRecordId}-${index}`
            }
            render={(row) => (
              <>
                <strong>{row.label}</strong>
                <p>{row.summary}</p>
                <p className="muted">
                  {row.sourceType} · Observed {profileTime(row.observedAt)}
                </p>
              </>
            )}
          />
        ) : (
          <p className="muted">
            No qualifying strategy or engagement evidence returned for this
            district.
          </p>
        ))}
      <p className="muted">
        This evidence summary is separate from the complete contact, outreach,
        meeting and commitment workflows.
      </p>
      <div className="row">
        <Link
          className="button"
          href={`/portfolio/${encodeURIComponent(scope.clientId)}/relationships?kind=government`}
        >
          Open relationships
        </Link>
        <Link
          className="button"
          href={`/modules/engagement?clientId=${encodeURIComponent(scope.clientId)}`}
        >
          Open engagement
        </Link>
      </div>
    </section>
  );
}
