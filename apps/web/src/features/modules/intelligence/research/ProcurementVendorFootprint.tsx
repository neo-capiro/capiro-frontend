"use client";
import { useState } from "react";
import type { ProcurementFlowGroup } from "@capiro/shared";
import { ActionButton, Badge, DataTable } from "../../../../shared/module-ui";
import { procurementUsd } from "./procurement-selection";
import styles from "./procurement.module.css";

type FiscalFilter = "all" | "2025" | "2026" | "2025-2026";

/** Aggregate signed exact-cent decimal strings using scale-normalized BigInt.
 * Returns a canonical decimal string (no comma formatting) or null when all
 * inputs are null (unavailable, not zero). */
export function sumDecimalStrings(values: (string | null)[]): string | null {
  const present = values.filter((v): v is string => v !== null);
  if (present.length === 0) return null;
  const scale = present.reduce((max, v) => {
    const frac = v.split(".")[1] ?? "";
    return Math.max(max, frac.length);
  }, 0);
  let total = 0n;
  for (const v of present) {
    const frac = v.split(".")[1] ?? "";
    const intStr = v.replace(".", "");
    total += BigInt(intStr) * 10n ** BigInt(scale - frac.length);
  }
  const negative = total < 0n;
  const abs = negative ? -total : total;
  const divisor = 10n ** BigInt(scale);
  const intPart = abs / divisor;
  const fracPart = abs % divisor;
  if (scale === 0) {
    return `${negative ? "-" : ""}${intPart.toString()}`;
  }
  const fracStr = fracPart.toString().padStart(scale, "0");
  return `${negative ? "-" : ""}${intPart.toString()}.${fracStr}`;
}

/** A vendor entry aggregated from multiple fiscal/agency groups sharing the same vendorKey. */
export type VendorEntry = {
  vendorKey: string;
  vendorIdentityState: ProcurementFlowGroup["vendorIdentityState"];
  recipientUei: string | null;
  nameVariants: string[];
  obligationUsd: string | null;
  actions: bigint;
  latestSourceRevision: string;
};

/** Aggregate raw fiscal/agency groups by vendorKey.
 * Different UEIs are never merged. Same UEI retains all name variants. */
export function aggregateByVendor(groups: readonly ProcurementFlowGroup[]): VendorEntry[] {
  const map = new Map<string, VendorEntry>();
  for (const g of groups) {
    const existing = map.get(g.vendorKey);
    if (!existing) {
      map.set(g.vendorKey, {
        vendorKey: g.vendorKey,
        vendorIdentityState: g.vendorIdentityState,
        recipientUei: g.recipientUei,
        nameVariants: g.contractorName ? [g.contractorName] : [],
        obligationUsd: g.obligationUsd,
        actions: BigInt(g.actions),
        latestSourceRevision: g.latestSourceRevision,
      });
    } else {
      existing.actions += BigInt(g.actions);
      existing.obligationUsd = sumDecimalStrings([existing.obligationUsd, g.obligationUsd]);
      if (g.contractorName && !existing.nameVariants.includes(g.contractorName)) {
        existing.nameVariants.push(g.contractorName);
      }
      if (g.latestSourceRevision > existing.latestSourceRevision) {
        existing.latestSourceRevision = g.latestSourceRevision;
      }
    }
  }
  return Array.from(map.values());
}

type FilteredResult = {
  vendors: VendorEntry[];
  totalActions: string;
  totalObligationUsd: string | null;
};

function computeFilteredResult(
  groups: readonly ProcurementFlowGroup[],
  filter: FiscalFilter,
): FilteredResult {
  let filtered: readonly ProcurementFlowGroup[];
  if (filter === "all") {
    filtered = groups;
  } else if (filter === "2025") {
    filtered = groups.filter((g) => g.fiscalYear === 2025);
  } else if (filter === "2026") {
    filtered = groups.filter((g) => g.fiscalYear === 2026);
  } else {
    filtered = groups.filter((g) => g.fiscalYear === 2025 || g.fiscalYear === 2026);
  }

  const vendors = aggregateByVendor(filtered);
  let totalActions = 0n;
  for (const v of vendors) totalActions += v.actions;
  const totalObligationUsd = sumDecimalStrings(vendors.map((v) => v.obligationUsd));
  return { vendors, totalActions: totalActions.toString(), totalObligationUsd };
}

export function ProcurementVendorFootprint({
  groups,
  totalObligationUsd,
  sourceThrough,
}: {
  groups: readonly ProcurementFlowGroup[];
  totalActions: string;
  totalObligationUsd: string | null;
  totalOutlayUsd: string | null;
  obligationKnown: string;
  outlayKnown: string;
  sourceThrough: string | null;
}) {
  const [filter, setFilter] = useState<FiscalFilter>("all");
  const [vendorFilter, setVendorFilter] = useState("");
  const [page, setPage] = useState(0);

  const result = computeFilteredResult(groups, filter);
  const visibleVendors = vendorFilter
    ? result.vendors.filter(
        (v) =>
          v.vendorKey.toLowerCase().includes(vendorFilter.toLowerCase()) ||
          v.nameVariants.some((n) => n.toLowerCase().includes(vendorFilter.toLowerCase())),
      )
    : result.vendors;

  const lastPage = Math.max(0, Math.ceil(visibleVendors.length / 20) - 1);
  const currentPage = Math.min(page, lastPage);
  const pageVendors = visibleVendors.slice(currentPage * 20, currentPage * 20 + 20);

  const handleFilterChange = (newFilter: FiscalFilter) => {
    setFilter(newFilter);
    setPage(0);
  };

  const handleVendorFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVendorFilter(e.target.value);
    setPage(0);
  };

  const noMatch =
    vendorFilter.length > 0 && visibleVendors.length === 0 && result.vendors.length > 0;

  return (
    <div className={styles.content}>
      <div className={styles.actions} style={{ flexWrap: "wrap" }}>
        <Badge>Vendor Footprint</Badge>
        <span>Fiscal year:</span>
        <ActionButton onClick={() => handleFilterChange("all")} disabled={filter === "all"}>
          All
        </ActionButton>
        <ActionButton onClick={() => handleFilterChange("2025")} disabled={filter === "2025"}>
          FY2025
        </ActionButton>
        <ActionButton onClick={() => handleFilterChange("2026")} disabled={filter === "2026"}>
          FY2026
        </ActionButton>
        <ActionButton
          onClick={() => handleFilterChange("2025-2026")}
          disabled={filter === "2025-2026"}
        >
          FY2025–FY2026
        </ActionButton>
      </div>

      <div className={styles.actions}>
        <label htmlFor="vendor-filter">Filter vendors:</label>
        <input
          id="vendor-filter"
          type="search"
          value={vendorFilter}
          onChange={handleVendorFilterChange}
          placeholder="Name or vendor key"
          style={{ flexGrow: 1 }}
        />
        {vendorFilter && (
          <ActionButton
            onClick={() => {
              setVendorFilter("");
              setPage(0);
            }}
          >
            Clear filter
          </ActionButton>
        )}
      </div>

      <dl className={styles.measures}>
        <div>
          <dt>Filtered obligations (USD)</dt>
          <dd>
            {noMatch ? (
              <span className={styles.subtext}>No matching vendors</span>
            ) : (
              procurementUsd(result.totalObligationUsd)
            )}
          </dd>
        </div>
        <div>
          <dt>Filtered actions</dt>
          <dd>
            {noMatch ? (
              <span className={styles.subtext}>No matching vendors</span>
            ) : (
              result.totalActions
            )}
          </dd>
        </div>
        <div>
          <dt>Vendors matched</dt>
          <dd>
            {noMatch ? (
              <span className={styles.subtext}>No matching vendors</span>
            ) : (
              `${visibleVendors.length} of ${result.vendors.length}`
            )}
          </dd>
        </div>
      </dl>

      {noMatch ? (
        <p role="status">
          No vendors match the current filter. This does not mean zero spending; no results
          were matched in the bounded cohort.
        </p>
      ) : (
        <>
          <DataTable
            caption="Vendor footprint grouped by source-reported vendor key"
            scrollRegion
            rows={pageVendors}
            rowKey={(row) => row.vendorKey}
            columns={[
              {
                key: "vendor",
                label: "Vendor identity",
                render: (row) => (
                  <>
                    {row.vendorIdentityState === "source_uei" ? (
                      <>
                        <strong>Source UEI</strong> · {row.recipientUei}
                      </>
                    ) : (
                      <>
                        <strong>Unresolved</strong> · {row.vendorKey}
                      </>
                    )}
                  </>
                ),
              },
              {
                key: "name",
                label: "Vendor name(s)",
                render: (row) =>
                  row.nameVariants.length > 0
                    ? row.nameVariants.join(" / ")
                    : "Unreported",
              },
              {
                key: "obligation",
                label: "Obligations (USD)",
                render: (row) => procurementUsd(row.obligationUsd),
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => row.actions.toString(),
              },
              {
                key: "clock",
                label: "Latest source revision",
                render: (row) => (
                  <span className={styles.subtext}>{row.latestSourceRevision}</span>
                ),
              },
            ]}
          />
          <nav className={styles.content} aria-label="Vendor footprint pages">
            <div className={styles.actions}>
              <ActionButton
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous vendors
              </ActionButton>
              <span>
                Page {currentPage + 1} of {lastPage + 1} · {visibleVendors.length}{" "}
                vendor{visibleVendors.length !== 1 ? "s" : ""}
              </span>
              <ActionButton
                disabled={currentPage === lastPage}
                onClick={() => setPage(currentPage + 1)}
              >
                Next vendors
              </ActionButton>
            </div>
          </nav>
        </>
      )}

      <div className={styles.evidence}>
        <details>
          <summary>Source coverage disclosures</summary>
          <p>
            SAM.gov Contract Awards API supports AWARD A/B/C/D record types only. IDVs and
            OTAs are not supported by the current adapter. Related/descendant awards are
            excluded. Partial observed actions are reported; outlays are not reported by the
            source. DoD-funded AND DoD-awarded records are subject to a 90-day public
            disclosure delay per official GSA documentation (see open.gsa.gov/api/contract-awards/).
            Actual source revision dates are displayed above.
          </p>
          {sourceThrough && (
            <p>
              Source cutoff: {sourceThrough} · This snapshot captured data as of this
              revision timestamp.
            </p>
          )}
          <p>
            Obligations shown are signed qualified observed action amounts for the selected
            explicit awards only. They are not complete award values
            {totalObligationUsd !== null ? (
              <>
                ; the unfiltered total obligation is{" "}
                <strong>{procurementUsd(totalObligationUsd)}</strong>
              </>
            ) : (
              "; total obligation is not reported"
            )}
            .
          </p>
        </details>
      </div>
    </div>
  );
}
