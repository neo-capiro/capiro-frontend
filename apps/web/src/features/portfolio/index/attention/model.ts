import type { AttentionClient, PortfolioAlert } from "./contracts";
import { normalizeBillId } from "@/shared/capiro/operations/intelligence";

const categoryLabels: Readonly<Record<string, string>> = {
  comment_deadline: "Comment deadline",
  comment_overdue: "Comment closed",
  competitor_filing: "Competitor filing",
  contract_award: "Contract award",
  hearing: "Hearing",
  bill_movement: "Bill movement",
};

export function accessibleAlerts(
  alerts: readonly PortfolioAlert[],
  clients: readonly AttentionClient[],
) {
  const names = new Map(clients.map((client) => [client.id, client.name]));
  return alerts.flatMap((alert) => {
    const name = names.get(alert.clientId);
    return name === undefined ? [] : [{ ...alert, clientName: name }];
  });
}

export function alertCategory(type: string) {
  return categoryLabels[type] ?? (type || "Unclassified alert");
}

export function alertClientHref(clientId: string) {
  return `/portfolio/${encodeURIComponent(clientId)}`;
}

export function alertRecordHref(alert: PortfolioAlert) {
  return `/portfolio?alert=${encodeURIComponent(alert.id)}`;
}

export function alertSourceReference(alert: PortfolioAlert) {
  return alert.id.slice(`${alert.clientId}:`.length);
}

export function alertSourceHref(alert: PortfolioAlert) {
  const prefix = `${alert.clientId}:bill:`;
  const billId = alert.id.startsWith(prefix)
    ? normalizeBillId(alert.id.slice(prefix.length))
    : null;
  // Only Bill 360 has a verified identifier receiver here. Other source hrefs
  // may point at retired routes and must not be promoted into working links.
  return billId ? `/bills/${encodeURIComponent(billId)}` : undefined;
}

export function alertTiming(alert: PortfolioAlert) {
  // The server label can describe recency as well as a countdown. The event
  // timestamp alone never establishes a deadline or an overdue state.
  return alert.countdownLabel || undefined;
}
