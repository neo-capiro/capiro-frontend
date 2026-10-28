import type { CapiroApi } from "../capiro/http";
import {
  completedReportOperations,
  type CompletedReport,
  type CompletedReportPage,
} from "../capiro/operations/meri-completed-reports";
export type {
  CompletedReport,
  CompletedReportSummary,
} from "../capiro/operations/meri-completed-reports";

export interface LegacyReportClient {
  list(
    cursor: string | null,
    signal: AbortSignal,
  ): Promise<CompletedReportPage>;
  read(id: string, signal: AbortSignal): Promise<CompletedReport>;
}

/** Selection only narrows the list; Core still owns every current report read. */
export function createLegacyReportClient(
  api: Pick<CapiroApi<typeof completedReportOperations>, "request">,
  clientId?: string,
): LegacyReportClient {
  const inScope = (report: { clientId: string | null }) =>
    clientId === undefined || report.clientId === clientId;
  return {
    async list(cursor, signal) {
      const page = await api.request(
        "meri.reports.completed.list",
        {
          query: {
            limit: 10,
            ...(clientId ? { clientId } : {}),
            ...(cursor ? { cursor } : {}),
          },
        },
        { signal },
      );
      signal.throwIfAborted();
      if (
        page.reports.some((row) => !inScope(row)) ||
        new Set(page.reports.map((row) => row.id)).size !== page.reports.length
      )
        throw Error("Completed report list did not match this scope");
      return page;
    },
    async read(id, signal) {
      const report = await api.request(
        "meri.reports.completed.read",
        { params: { id } },
        { signal },
      );
      signal.throwIfAborted();
      if (report.id !== id || !inScope(report))
        throw Error("Completed report did not match this selection");
      return report;
    },
  };
}
