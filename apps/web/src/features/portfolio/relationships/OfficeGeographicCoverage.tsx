"use client";
import { useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  useFacilities,
  FacilityMap,
  FacilityDetailDialog,
  type Facility,
} from "@/features/portfolio/client-profile/public";
import type { GovernmentTarget } from "./target-contracts";
import styles from "./office-depth.module.css";
export function OfficeGeographicCoverage({
  clientId,
  targets,
}: {
  clientId: string;
  targets: GovernmentTarget[];
}) {
  const facilities = useFacilities(clientId);
  const [selected, setSelected] = useState<Facility>();
  return (
    <div className="stack">
      <QueryState
        pending={facilities.isPending}
        error={facilities.error}
        retry={() => void facilities.refetch()}
      />
      {facilities.data && (
        <>
          <FacilityMap facilities={facilities.data} onSelect={setSelected} />
          <div className={styles.grid}>
            {facilities.data.map((facility) => (
              <article className={styles.card} key={facility.id}>
                <h4>{facility.name}</h4>
                <p>
                  {targets
                    .filter((target) =>
                      target.representedFacilities?.some(
                        (row) => row.id === facility.id,
                      ),
                    )
                    .map((target) => target.memberName)
                    .filter(Boolean)
                    .join(" · ") ||
                    "No saved office relationship with verified site coverage"}
                </p>
                <button
                  className="button"
                  onClick={() => setSelected(facility)}
                >
                  Review site and district
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {selected && (
        <FacilityDetailDialog
          clientId={clientId}
          clientName="Client"
          facility={selected}
          open
          onOpenChange={(value) => {
            if (!value) setSelected(undefined);
          }}
        />
      )}
    </div>
  );
}
