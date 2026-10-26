import type {
  ResearchDashboardLayout,
  ResearchShareDashboard,
} from "../../../../shared/capiro/operations/research-share-schemas";
import type { ResearchDetail } from "../../../../shared/capiro/operations/research-schemas";

/** The slices of live portfolio data the designer preview is built from. */
export type PreviewSources = {
  portfolio: ResearchDetail;
  clientId: string;
  branding: boolean;
  analytics?: {
    totals: ResearchShareDashboard["data"]["totals"];
    coverage: ResearchShareDashboard["data"]["coverage"];
    limitations: readonly string[];
  };
  fit?: {
    clientFits: readonly {
      clientId: string;
      fitScore: number | null;
      availability?: string;
      refreshedAt: string | null;
    }[];
  };
  changes?: readonly { id: string; eventKind: string; occurredAt: string }[];
};

/** Change kinds a recipient sees; mirrors the Core service's recipient filter. */
export const RECIPIENT_CHANGE_KINDS = new Set([
  "member_added",
  "member_decided",
  "member_excluded",
  "member_reinstated",
  "member_resolved",
  "rule_published",
  "review_updated",
  "annual_reopened",
  "import_created",
  "import_action",
]);

export function changeSummary(eventKind: string): string {
  return eventKind.replaceAll("_", " ");
}

/**
 * Assembles the same shape the recipient page renders, from the live portfolio
 * instead of a frozen snapshot. Preview only: publishing freezes the real payload
 * in the Core service.
 */
export function buildPreviewDashboard(
  sources: PreviewSources,
  layout: ResearchDashboardLayout,
): ResearchShareDashboard {
  const { portfolio } = sources;
  const client = portfolio.clientLinks.find(
    (c) => c.clientId === sources.clientId,
  );
  const fit = sources.fit?.clientFits.find(
    (f) => f.clientId === sources.clientId,
  );
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    portfolioName: portfolio.name,
    portfolioPurpose: portfolio.purpose ?? null,
    asOf: now,
    preparedFor: { clientName: client?.clientName ?? "Client" },
    branding: sources.branding
      ? { firmName: "Your firm", logoAvailable: false }
      : null,
    layout,
    data: {
      totals: sources.analytics?.totals ?? [],
      contributions: [],
      coverage: sources.analytics?.coverage ?? {
        eligibleMembers: portfolio.memberCount,
        supportedMembers: 0,
        includedContributions: 0,
        excludedContributions: 0,
        overlapContributions: 0,
        unavailableMembers: 0,
      },
      limitations: [...(sources.analytics?.limitations ?? [])],
      subjects: portfolio.members.map((m) => ({
        id: m.id,
        targetKind: m.targetKind,
        targetId: m.targetId,
        label: m.label ?? null,
        disposition: m.disposition,
      })),
      sources: [],
      clientFit: fit
        ? {
            availability:
              fit.availability === "available" || fit.availability === "partial"
                ? fit.availability
                : fit.fitScore == null
                  ? "unavailable"
                  : "available",
            fitScore: fit.fitScore,
            basis: null,
            refreshedAt: fit.refreshedAt,
          }
        : null,
      changes: (sources.changes ?? [])
        .filter((c) => RECIPIENT_CHANGE_KINDS.has(c.eventKind))
        .map((c) => ({
          id: c.id,
          eventKind: c.eventKind,
          occurredAt: c.occurredAt,
          summary: changeSummary(c.eventKind),
        })),
      comparison: null,
    },
    snapshot: {
      id: "preview",
      name: "Live preview",
      capturedAt: now,
      portfolioRevision: portfolio.revision,
      calculationVersion: "preview",
    },
    publishedAt: now,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
