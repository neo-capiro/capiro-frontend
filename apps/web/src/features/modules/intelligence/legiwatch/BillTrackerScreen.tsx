"use client";
import { BillTrackerPage } from "@/features/portfolio/bill-tracker/public";
import type { TrackerRuntime } from "@/shared/portfolio/config/config";

export function BillTrackerScreen({ config }: { config?: TrackerRuntime }) {
  return (
    <BillTrackerPage
      embedded
      backend={config?.trackerBackend}
      metricsVersion={config?.trackerMetricsVersion}
      destinations={config?.destinations ?? {}}
    />
  );
}
