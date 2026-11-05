"use client";
import { useState } from "react";
import type {
  ProcurementFlowGroup,
  ProcurementMeasure,
  ProcurementObservedFlowGroup,
} from "@capiro/shared";
import { ActionButton, DataTable } from "../../../../shared/module-ui";
import { procurementUsd } from "./procurement-selection";
import styles from "./procurement.module.css";

export type FiscalFilter = "all" | "2025" | "2026" | "2025-2026";

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
  /** Present for old-contract groups; absent for observed groups (no certified publisher revision order). */
  latestSourceRevision?: string;
};

/** Aggregate raw fiscal/agency groups by vendorKey.
 * Different UEIs are never merged. Same UEI retains all name variants. */
export function aggregateByVendor(
  groups: readonly (ProcurementFlowGroup | ProcurementObservedFlowGroup)[],
): VendorEntry[] {
  const map = new Map<string, VendorEntry>();
  for (const g of groups) {
    const existing = map.get(g.vendorKey);
    const srcRev =
      "latestSourceRevision" in g ? g.latestSourceRevision : undefined;
    if (!existing) {
      map.set(g.vendorKey, {
        vendorKey: g.vendorKey,
        vendorIdentityState: g.vendorIdentityState,
        recipientUei: g.recipientUei,
        nameVariants: g.contractorName ? [g.contractorName] : [],
        obligationUsd: g.obligationUsd,
        actions: BigInt(g.actions),
        latestSourceRevision: srcRev,
      });
    } else {
      existing.actions += BigInt(g.actions);
      existing.obligationUsd = sumDecimalStrings([
        existing.obligationUsd,
        g.obligationUsd,
      ]);
      if (
        g.contractorName &&
        !existing.nameVariants.includes(g.contractorName)
      ) {
        existing.nameVariants.push(g.contractorName);
      }
      if (
        srcRev &&
        (!existing.latestSourceRevision ||
          srcRev > existing.latestSourceRevision)
      ) {
        existing.latestSourceRevision = srcRev;
      }
    }
  }
  return Array.from(map.values());
}

export type ProcurementDisplayFilters = {
  fiscalYear: FiscalFilter;
  vendor: string;
};

/** Both views and the export use this same bounded display subset. */
export function filterProcurementGroups(
  groups: readonly (ProcurementFlowGroup | ProcurementObservedFlowGroup)[],
  filters: ProcurementDisplayFilters,
): (ProcurementFlowGroup | ProcurementObservedFlowGroup)[] {
  const period = groups.filter(
    (g) =>
      filters.fiscalYear === "all" ||
      (filters.fiscalYear === "2025-2026"
        ? g.fiscalYear === 2025 || g.fiscalYear === 2026
        : String(g.fiscalYear) === filters.fiscalYear),
  );
  const query = filters.vendor.trim().toLowerCase();
  if (!query) return period;
  // A matching label selects its existing source identity, including its other name variants.
  const keys = new Set(
    period
      .filter(
        (g) =>
          g.vendorKey.toLowerCase().includes(query) ||
          g.contractorName?.toLowerCase().includes(query),
      )
      .map((g) => g.vendorKey),
  );
  return period.filter((g) => keys.has(g.vendorKey));
}

export function procurementGroupTotals(
  groups: readonly (ProcurementFlowGroup | ProcurementObservedFlowGroup)[],
): ProcurementMeasure | null {
  if (!groups.length) return null;
  const count = (field: "actions" | "obligationKnown" | "outlayKnown") =>
    groups
      .reduce((total, group) => total + BigInt(group[field]), 0n)
      .toString();
  return {
    actions: count("actions"),
    obligationKnown: count("obligationKnown"),
    outlayKnown: count("outlayKnown"),
    obligationUsd: sumDecimalStrings(groups.map((g) => g.obligationUsd)),
    outlayUsd: sumDecimalStrings(groups.map((g) => g.outlayUsd)),
  };
}

export function ProcurementVendorFootprint({
  groups,
}: {
  groups: readonly (ProcurementFlowGroup | ProcurementObservedFlowGroup)[];
}) {
  const [page, setPage] = useState(0);
  const vendors = aggregateByVendor(groups);
  const lastPage = Math.max(0, Math.ceil(vendors.length / 20) - 1);
  const currentPage = Math.min(page, lastPage);
  return (
    <>
      <DataTable
        caption="Vendor footprint grouped by source-reported vendor key"
        scrollRegion
        rows={vendors.slice(currentPage * 20, currentPage * 20 + 20)}
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
            render: (row) => row.nameVariants.join(" / ") || "Unreported",
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
            render: (row) =>
              row.latestSourceRevision ?? "Not applicable (observed)",
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
            Page {currentPage + 1} of {lastPage + 1} · {vendors.length} vendors
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
  );
}
