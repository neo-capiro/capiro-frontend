import { parseNewsletterRecordDiscriminator } from "@capiro/shared/newsletter";
import type { OutreachRecord } from "../../../shared/capiro/operations/engagement";
import { richNewsletterId } from "../../../shared/capiro/operations/newsletter-routing";

export type NewsletterDestination =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "record" | "stage"; id: string };

/** Route hints never authorize a read, create a record, or identify a V3 version. */
export function newsletterDestination(
  params: URLSearchParams,
): NewsletterDestination {
  const keys = ["newsletter", "newsletterStage"];
  const present = keys.filter((key) => params.has(key));
  if (!present.length) return { kind: "none" };
  if (
    present.length !== 1 ||
    params.getAll("view").length > 1 ||
    params.getAll(present[0]!).length !== 1 ||
    [
      "draft",
      "session",
      "create",
      "objectiveId",
      "objectiveVersion",
      "directoryContactId",
    ].some((key) => params.has(key)) ||
    (params.has("view") && params.get("view") !== "outreach")
  )
    return { kind: "invalid" };
  const key = present[0]!;
  const parsed = richNewsletterId.safeParse(params.get(key));
  return parsed.success
    ? { kind: key === "newsletter" ? "record" : "stage", id: parsed.data }
    : { kind: "invalid" };
}

export function newsletterRecordKind(record: OutreachRecord) {
  const parsed = parseNewsletterRecordDiscriminator(record);
  if (!parsed.ok) return "invalid";
  return parsed.value.kind === "rich" ? "candidate" : "ordinary";
}

export function newsletterBackHref(clientId?: string | null) {
  const params = new URLSearchParams({
    view: "outreach",
  });
  if (richNewsletterId.safeParse(clientId).success)
    params.set("clientId", clientId!);
  return `/modules/engagement?${params}`;
}
