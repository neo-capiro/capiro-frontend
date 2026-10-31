import type { OutreachCampaignSummary } from "../../../../shared/capiro/operations/outreach-campaign-schemas";

export type CampaignCategory = "drafts" | "sent" | "attention";
export const categoryLabels = {
  drafts: "Campaign drafts",
  sent: "Sent campaigns",
  attention: "Needs attention",
} as const;
export type CampaignListRow = {
  id: string;
  title: string;
  goal: string | null;
  workflow: string;
  targets: number;
  recordedSend: string | null;
  category: CampaignCategory;
  sentAt: string | null;
};
export function recordedCategory(status: string | null): CampaignCategory {
  if (!status || status === "draft") return "drafts";
  return status === "sent" ? "sent" : "attention";
}
export function readableStatus(status: string | null) {
  if (!status || status === "draft") return "No recorded send";
  const text = status.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
export function canonicalListRow(
  row: OutreachCampaignSummary,
): CampaignListRow {
  return {
    id: row.id,
    title: row.state.title,
    goal: row.state.decisions?.goal ?? null,
    workflow: row.status === "draft" ? "active" : row.status,
    targets: row.recipientCount,
    recordedSend: row.recordedSendStatus,
    category: row.category,
    sentAt: row.sentAt,
  };
}
export function recordTypeLabel(type: string) {
  return (
    (
      {
        follow_up: "Follow-up",
        campaign: "Campaign",
        outbound_campaign: "Outbound campaign",
        prep: "Preparation",
      } as Record<string, string>
    )[type] ?? type.replaceAll("_", " ")
  );
}
export function dateWindow(from: string, to: string) {
  return {
    ...(from ? { from: new Date(from + "T00:00:00Z").toISOString() } : {}),
    ...(to
      ? { to: new Date(Date.parse(to + "T00:00:00Z") + 86400000).toISOString() }
      : {}),
  };
}

/**
 * Single admission rule for the ancillary campaign-session query.
 *
 * A cohort that explicitly states the surface is disabled must never dispatch the request, while a
 * client-scoped, deleted-only or invalid-date view keeps its existing behaviour of not asking for
 * global sessions. Search and pagination never participate: they cannot turn a disabled request on.
 */
export function campaignSessionsQueryEnabled({
  capability,
  clientId,
  deleted,
  invalid,
}: {
  capability: "enabled" | "disabled" | "unknown";
  clientId: string;
  deleted: boolean;
  invalid: boolean;
}): boolean {
  return capability !== "disabled" && !clientId && !deleted && !invalid;
}
