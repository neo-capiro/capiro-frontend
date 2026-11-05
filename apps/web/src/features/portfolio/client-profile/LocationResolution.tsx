import type { Facility } from "./contracts";
import {
  isConfirmedSite,
  locationResolutionLabels,
  locationResolutionState,
  safeEvidenceUrl,
} from "./location-resolution";
import styles from "./location-resolution.module.css";

export function LocationResolution({ facility }: { facility: Facility }) {
  const state = locationResolutionState(facility);
  const resolution = facility.geographicResolution;
  return (
    <section className={styles.card} aria-label="Location resolution">
      <p className="eyebrow" data-state={state}>
        {locationResolutionLabels[state]}
      </p>
      <h4>
        {facility.name} ·{" "}
        {facility.siteStatus?.replaceAll("_", " ") ??
          "Operating status not supplied"}
      </h4>
      <p className="muted">
        {facility.siteRole ?? "Role not supplied"} ·{" "}
        {facility.country ?? "Country not supplied"}
      </p>
      {!isConfirmedSite(facility) && (
        <p role="note" className={styles.evidence}>
          <strong>Unconfirmed site</strong>
          <br />
          District calculation does not verify company occupancy. Confirm the
          site evidence before using it for office recommendations.
        </p>
      )}
      <ResolutionDetails facility={facility} />
      {resolution?.overrideConflict && (
        <p role="alert">
          Saved manual district {resolution.overrideConflict.handEntered}{" "}
          differs from resolved district {resolution.overrideConflict.geocoded}.
          Review both before relying on office links.
        </p>
      )}
      {resolution?.boundaryAdjacent && (
        <p role="note">
          This point is near a district boundary. Review the physical site
          location.
        </p>
      )}
      {resolution?.reason && <p className="muted">{resolution.reason}</p>}
      {resolution?.requiresReview && (
        <p role="status">
          Review this resolution and the office links for its boundary term.
        </p>
      )}
      {facility.sourceEvidenceUnavailable && (
        <p className="muted">
          Some original site evidence is no longer shared with this account.
          Saved site facts are retained.
        </p>
      )}
      {facility.sourceEvidence?.length ? (
        <details className={styles.evidence}>
          <summary>Site evidence · {facility.sourceEvidence.length}</summary>
          {facility.sourceEvidence.map((source, index) => (
            <article key={index}>
              {safeEvidenceUrl(source.sourceUrl) ? (
                <a
                  href={safeEvidenceUrl(source.sourceUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open site source ↗
                </a>
              ) : (
                <strong>
                  {source.attachmentId
                    ? "Supporting document"
                    : "Source details"}
                </strong>
              )}
              {source.evidence && <p>{source.evidence}</p>}
              <small>
                {source.sourceType} ·{" "}
                {facility.sourceObservedAt ?? "Observation date unavailable"}
              </small>
            </article>
          ))}
        </details>
      ) : !facility.sourceEvidenceUnavailable ? (
        <p className="muted">Site source evidence has not been supplied.</p>
      ) : null}
      {Boolean(facility.geographicHistory?.length) && (
        <details className={styles.evidence}>
          <summary>Previous district resolutions</summary>
          {facility.geographicHistory?.map((prior, index) => (
            <p key={index}>
              {prior.resolvedAt ?? "Date unavailable"} · Congress{" "}
              {prior.version?.congress ?? "unavailable"} ·{" "}
              {prior.districts.map((d) => `${d.chamber} ${d.code}`).join(" / ")}{" "}
              · {prior.source ?? "Source unavailable"}
            </p>
          ))}
        </details>
      )}
      {facility.economicImpact?.sourceUnavailable && (
        <p className="muted">
          Some original impact evidence is no longer shared with this account.
          Saved figures are retained; changes require new evidence.
        </p>
      )}
      {(facility.economicImpact?.evidence.length ||
        facility.economicImpact?.sourceUnavailable) &&
      facility.economicImpact.observedAt ? (
        <details className={styles.evidence}>
          <summary>
            {facility.economicImpact.sourceUnavailable
              ? "Saved company impact"
              : "Sourced company impact"}
          </summary>
          <p>Observed {facility.economicImpact.observedAt}</p>
          {(
            [
              "jobs",
              "payroll",
              "investment",
              "facilitySize",
              "suppliersInState",
            ] as const
          ).map(
            (field) =>
              facility.economicImpact?.[field] != null && (
                <p key={field}>
                  {field.replace(/([A-Z])/g, " $1")}:{" "}
                  {facility.economicImpact[field]?.toLocaleString()}
                  {field === "facilitySize"
                    ? ` ${facility.economicImpact.facilitySizeUnit ?? "unit not supplied"}`
                    : ""}
                </p>
              ),
          )}
          {facility.economicImpact.evidence.map((source, index) => (
            <p key={index}>
              {safeEvidenceUrl(source.sourceUrl) ? (
                <a
                  href={safeEvidenceUrl(source.sourceUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Impact source ↗
                </a>
              ) : (
                "Supporting document"
              )}{" "}
              · {source.evidence}
            </p>
          ))}
        </details>
      ) : (
        <p className="muted">
          Company jobs, payroll, investment, facility size and supplier impact
          need dated source evidence.
        </p>
      )}
    </section>
  );
}
function ResolutionDetails({ facility }: { facility: Facility }) {
  const state = locationResolutionState(facility);
  const resolution = facility.geographicResolution;
  const messages = {
    needs_address:
      "A physical street address or verified map point is required. City and ZIP alone cannot assign a district.",
    ambiguous:
      "Several physical addresses match this site. Select the correct address below; its evidence will be retained.",
    source_unavailable:
      "The location is saved. Any previous verified resolution is retained below. Retry the lookup when the source is available.",
    not_applicable:
      "US congressional and state legislative districts are not applicable.",
    stale_boundary:
      "The saved boundary no longer matches the requested term. Resolve it again and review changed office links.",
    resolved:
      "Geography resolved. Site confirmation remains a separate review.",
  };
  return (
    <div className={styles.evidence}>
      <p>{messages[state]}</p>
      {state !== "not_applicable" && (
        <dl className={styles.facts}>
          <div>
            <dt>Precision</dt>
            <dd>
              {resolution?.precision?.replaceAll("_", " ") ?? "Not supplied"}
            </dd>
          </div>
          <div>
            <dt>Boundary Congress</dt>
            <dd>
              {resolution?.version?.congress ??
                facility.congressionalDistrictCongress ??
                "Not supplied"}
            </dd>
          </div>
          <div>
            <dt>Boundary vintage</dt>
            <dd>{resolution?.version?.vintage ?? "Not supplied"}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>
              {resolution?.source ?? facility.districtSource ?? "Not supplied"}
            </dd>
          </div>
          <div>
            <dt>Resolved</dt>
            <dd>
              {resolution?.resolvedAt ?? facility.geocodedAt ?? "Not supplied"}
            </dd>
          </div>
          {resolution?.districts.map((district) => (
            <div key={`${district.chamber}:${district.code}`}>
              <dt>{district.chamber.replaceAll("_", " ")}</dt>
              <dd>{district.code}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
