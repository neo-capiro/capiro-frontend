"use client";
import { useCapabilities } from "@/features/portfolio/capabilities/public";
import type { Facility } from "./contracts";
import styles from "./facilities-manager.module.css";

export function FacilityEvidenceFields({
  clientId,
  facility,
}: {
  clientId: string;
  facility?: Facility;
}) {
  const capabilities = useCapabilities(clientId);
  const available = capabilities.isSuccess && !capabilities.error;
  return (
    <>
      <details className="stack">
        <summary>Site evidence and verified point</summary>
        <p className="muted">
          New evidence is added to the saved source history.
        </p>
        {facility?.sourceEvidenceUnavailable && (
          <p className="muted">
            Some original site evidence is no longer shared with this account.
            An unrelated edit preserves the saved evidence.
          </p>
        )}
        <label>
          Additional source URL
          <input name="siteSourceUrl" type="url" />
        </label>
        <label>
          Supporting evidence
          <textarea name="siteEvidence" maxLength={4000} rows={3} />
        </label>
        <label>
          Observed date
          <input
            name="siteObservedAt"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
          />
        </label>
        <div className={styles.locality}>
          <label>
            Verified latitude
            <input
              name="pointLatitude"
              type="number"
              step="any"
              min={-90}
              max={90}
              defaultValue={facility?.verifiedPoint?.latitude}
            />
          </label>
          <label>
            Verified longitude
            <input
              name="pointLongitude"
              type="number"
              step="any"
              min={-180}
              max={180}
              defaultValue={facility?.verifiedPoint?.longitude}
            />
          </label>
          <label>
            Point verified on
            <input
              name="pointVerifiedAt"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              defaultValue={facility?.verifiedPoint?.verifiedAt.slice(0, 10)}
            />
          </label>
        </div>
        <p className="muted">
          Use a verified physical site point. A city or ZIP centroid cannot
          resolve its districts.
        </p>
        <label>
          <input name="pointReverified" type="checkbox" /> I reverified this map
          point for the current physical address.
        </label>
      </details>
      <fieldset>
        <legend>Capabilities at this site</legend>
        {(available ? capabilities.data : []).map((capability) => (
          <label key={capability.id}>
            <input
              type="checkbox"
              name={`capability:${capability.id}`}
              defaultChecked={facility?.capabilityIds?.includes(capability.id)}
            />{" "}
            {capability.name}
          </label>
        ))}
        {!available && (
          <p className="muted">
            Capability links are unavailable; saved associations will be
            preserved.
          </p>
        )}
        <input
          type="hidden"
          name="capabilitiesLoaded"
          value={
            capabilities.isSuccess && !capabilities.error ? "true" : "false"
          }
        />
      </fieldset>
      <details className="stack">
        <summary>Evidence-backed company impact</summary>
        <p className="muted">
          Enter sourced figures only. Add the source, observation date and
          currency or unit in its evidence passage.
        </p>
        {facility?.economicImpact?.sourceUnavailable && (
          <p className="muted">
            Some original impact evidence is no longer shared with this account.
            Leave figures unchanged to preserve the saved record, or provide new
            evidence for changes.
          </p>
        )}
        <div className={styles.locality}>
          {(
            [
              "jobs",
              "payroll",
              "investment",
              "facilitySize",
              "suppliersInState",
            ] as const
          ).map((field) => (
            <label key={field}>
              {field.replace(/([A-Z])/g, " $1")}
              <input
                name={`impact:${field}`}
                type="number"
                min={0}
                step="any"
                defaultValue={facility?.economicImpact?.[field]}
              />
            </label>
          ))}
        </div>
        <label>
          Facility size unit
          <input
            name="impactUnit"
            maxLength={80}
            defaultValue={facility?.economicImpact?.facilitySizeUnit}
          />
        </label>
        <label>
          Impact source URL
          <input name="impactSourceUrl" type="url" />
        </label>
        <label>
          Impact source passage
          <textarea name="impactEvidence" maxLength={4000} rows={3} />
        </label>
        <label>
          Impact observation date
          <input
            name="impactObservedAt"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
          />
        </label>
      </details>
    </>
  );
}
