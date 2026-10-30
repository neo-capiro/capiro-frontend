"use client";
import { useId, useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { Facility } from "./contracts";
import { FacilityMap } from "./FacilityMap";
import { useFacilityNexus } from "./facility-map-queries";
import styles from "./facility-map.module.css";

export function FacilityMapDialog({
  clientId,
  clientName,
  facilities,
  open,
  onOpenChange,
  onSelect,
}: {
  clientId: string;
  clientName: string;
  facilities: Facility[];
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onSelect: (facility: Facility) => void;
}) {
  const [district, setDistrict] = useState("");
  const nexus = useFacilityNexus(clientId, open);
  const districtSelectorId = useId();
  const selection = district
    ? (nexus.data?.districts.find((row) => row.districtKey === district) ??
      null)
    : null;
  // A district with no evidence must never sit above the client-wide component
  // list: that reads as if those components were scored for this district.
  const showBreakdown = !district || Boolean(selection && selection.score !== null);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`District nexus · ${clientName}`}
      description="Current congressional boundaries and this client's saved facilities."
      wide
    >
      {open && (
        <FacilityMap
          facilities={facilities}
          onSelect={onSelect}
          selectedDistrict={district}
          onDistrictSelect={setDistrict}
        />
      )}
      <QueryState
        pending={nexus.isPending}
        error={nexus.error}
        retry={() => void nexus.refetch()}
      />
      {nexus.data && (
        <section className="stack" aria-label="District nexus evidence">
          <p>
            Client footprint score:{" "}
            <strong>
              {nexus.data.score === null
                ? "Insufficient evidence"
                : `${nexus.data.score}/100`}
            </strong>{" "}
            · Evidence coverage: {nexus.data.coveragePercent}%
          </p>
          <p className={styles.source}>
            This score describes the client&apos;s footprint. Per-district
            scores describe separate evidence.
          </p>
          <label htmlFor={districtSelectorId}>
            Facility and performance districts
          </label>
          <select
            id={districtSelectorId}
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="">All districts</option>
            {district &&
              !nexus.data.districts.some((row) => row.districtKey === district) && (
                <option value={district}>{district} · No client evidence</option>
              )}
            {nexus.data.districts.map((row) => (
              <option key={row.districtKey} value={row.districtKey}>
                {row.districtKey}
              </option>
            ))}
          </select>
          {district && (
            <div className={styles.districtSelection}>
              District {district} ·{" "}
              {selection
                ? selection.score === null
                  ? "Insufficient evidence to score"
                  : `Score ${selection.score}/100`
                : "No client nexus evidence returned for this district"}
            </div>
          )}
          {showBreakdown && (
            <>
              <small className={styles.source}>
                Client-wide component breakdown
              </small>
              <dl className={styles.facts}>
                {nexus.data.breakdown.map((row) => {
                  const scored = row.evidenceCount > 0;
                  return (
                    <div key={row.component}>
                      <dt>{row.label}</dt>
                      <dd>
                        {scored ? row.credit : 0} / {row.weight} ·{" "}
                        {row.evidenceCount} evidence records
                        <br />
                        {scored
                          ? row.rationale
                          : "No evidence found for this component."}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </>
          )}
          {nexus.data.warnings.map((warning, index) => (
            <p className={styles.source} key={`${warning.code}-${index}`}>
              {warning.message}
            </p>
          ))}
          {nexus.data.freshness.map((source) => (
            <p className={styles.source} key={source.source}>
              {source.label}:{" "}
              {source.freshnessUnavailable
                ? "Freshness unavailable"
                : source.neverSynced
                  ? "Not yet synced"
                  : source.lastSyncedAt
                    ? `Last synced ${new Date(source.lastSyncedAt).toLocaleString()}`
                    : "Sync date unavailable"}
            </p>
          ))}
        </section>
      )}
      <ul className={styles.locations}>
        {facilities.map((facility) => (
          <li key={facility.id}>
            <button
              className={styles.location}
              onClick={() => onSelect(facility)}
            >
              {facility.name}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
