import type { FacilityNexus } from "./facility-map-contracts";

function sourceTime(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value)))
    return "Sync date unavailable";
  return `Last synced ${new Date(value).toLocaleString()}`;
}

export function SourceFreshnessRows({
  sources,
}: {
  sources: FacilityNexus["freshness"];
}) {
  return (
    <div className="stack" aria-label="Source freshness">
      {sources.length ? (
        sources.map((source) => (
          <p className="muted" key={source.source}>
            {source.label}:{" "}
            {source.freshnessUnavailable
              ? "Freshness unavailable"
              : source.neverSynced
                ? "Not yet synced"
                : sourceTime(source.lastSyncedAt)}
          </p>
        ))
      ) : (
        <p className="muted">Source freshness unavailable.</p>
      )}
    </div>
  );
}

export function NexusSourceFreshness({ value }: { value: FacilityNexus }) {
  return (
    <div className="stack">
      <SourceFreshnessRows sources={value.freshness} />
      {value.warnings.map((warning, index) => (
        <p className="muted" key={`${warning.code}-${index}`}>
          {warning.message}
        </p>
      ))}
      <p className="muted">
        Response computed{" "}
        {Number.isFinite(Date.parse(value.generatedAt))
          ? new Date(value.generatedAt).toLocaleString()
          : "at an unavailable time"}
        . This is separate from each source&apos;s refresh time.
      </p>
    </div>
  );
}
