import { z } from "zod";
import {
  outreachCampaignState,
  type OutreachCampaignState,
  type OutreachRecipient,
} from "../../../../shared/capiro/operations/outreach-campaign-schemas";
export const sameId = (left: string, right: string) =>
  left.toLowerCase() === right.toLowerCase();
export function newCampaign(clientId = ""): OutreachCampaignState {
  return {
    title: "",
    direction: "on-behalf",
    clientId: clientId || null,
    templateId: null,
    mainIdea: "",
    tone: "professional",
    length: "standard",
    recipients: [],
    contextItems: [],
    styleSamples: [],
    attachmentIds: [],
    sender: { connectionId: null, signature: "" },
    lastStep: 1,
  };
}
export type CampaignUnit = {
  key: string;
  name: string;
  to: { name: string; email: string }[];
  cc: string[];
  bcc: string[];
};
export function savedEnvelope(snapshot: Record<string, unknown>) {
  const source = z
    .object({
      name: z.string().nullish(),
      email: z.string().nullish(),
      groupMembers: z
        .array(z.object({ email: z.string(), name: z.string().nullish() }))
        .optional(),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
    })
    .safeParse(snapshot);
  if (!source.success) return null;
  const value = source.data;
  const group = (value.groupMembers ?? [])
    .map((row) => ({ email: row.email.trim(), name: row.name ?? "" }))
    .filter((row) => row.email);
  const to = group.length
    ? group
    : value.email?.trim()
      ? [{ email: value.email.trim(), name: value.name ?? "" }]
      : [];
  const cc = (value.cc ?? []).map((email) => email.trim()).filter(Boolean),
    bcc = (value.bcc ?? []).map((email) => email.trim()).filter(Boolean);
  if (
    !to.length ||
    [...to.map((row) => row.email), ...cc, ...bcc].some(
      (email) => !z.email().safeParse(email).success,
    )
  )
    return null;
  return { to, cc, bcc };
}
export function sameEnvelope(
  left: Pick<CampaignUnit, "to" | "cc" | "bcc">,
  right: Pick<CampaignUnit, "to" | "cc" | "bcc">,
) {
  const normalized = (items: string[]) =>
    [...new Set(items.map((value) => value.trim().toLowerCase()))]
      .sort()
      .join("\n");
  return (
    normalized(left.to.map((row) => row.email)) ===
      normalized(right.to.map((row) => row.email)) &&
    normalized(left.cc) === normalized(right.cc) &&
    normalized(left.bcc) === normalized(right.bcc)
  );
}
export function sameCampaignContent(
  left: OutreachCampaignState,
  right: OutreachCampaignState,
) {
  const a = outreachCampaignState.safeParse({ ...left, lastStep: 1 }),
    b = outreachCampaignState.safeParse({ ...right, lastStep: 1 });
  return (
    a.success && b.success && JSON.stringify(a.data) === JSON.stringify(b.data)
  );
}
/** Mirrors the producer's visible envelope expansion; server validation remains authoritative. */
export function campaignUnits(state: OutreachCampaignState): CampaignUnit[] {
  const copies = (role: "cc" | "bcc") =>
    state.recipients
      .filter((r) => r.kind === "individual" && r.role === role)
      .map((r) => r.email ?? "");
  const output: CampaignUnit[] = [];
  const add = (
    key: string,
    name: string,
    to: { name: string; email?: string }[],
    members: OutreachRecipient["members"] = [],
    inherited: { cc?: string[]; bcc?: string[] }[] = [],
  ) =>
    output.push({
      key,
      name,
      to: to.map((member) => ({
        name: member.name,
        email: member.email ?? "",
      })),
      cc: [
        ...new Set([
          ...copies("cc"),
          ...inherited.flatMap((row) => row.cc ?? []),
          ...members.filter((m) => m.role === "cc").map((m) => m.email ?? ""),
        ]),
      ],
      bcc: [
        ...new Set([
          ...copies("bcc"),
          ...inherited.flatMap((row) => row.bcc ?? []),
          ...members.filter((m) => m.role === "bcc").map((m) => m.email ?? ""),
        ]),
      ],
    });
  for (const recipient of state.recipients) {
    if (recipient.role !== "to") continue;
    if (recipient.kind === "individual")
      add(
        `individual:${recipient.id}`,
        recipient.name,
        [recipient],
        [],
        [recipient],
      );
    else if (recipient.kind === "group")
      add(
        `group:${recipient.id}`,
        recipient.name,
        (recipient.members ?? []).filter((m) => m.role === "to"),
        recipient.members,
        [recipient, ...(recipient.members ?? [])],
      );
    else
      for (const member of recipient.members ?? [])
        if (member.role === "to")
          add(
            `list:${recipient.id}:${member.id}`,
            member.name,
            [member],
            recipient.members,
            [recipient, member],
          );
  }
  return output;
}
export function recipientProblem(state: OutreachCampaignState) {
  const units = campaignUnits(state);
  if (!units.length) return "Add at least one To recipient.";
  if (units.length > 500)
    return "Choose at most 500 generated messages per campaign.";
  if (units.some((unit) => unit.key.length > 512))
    return "A recipient identifier is too long for a saved draft. Remove and re-add that recipient.";
  if (new Set(units.map((unit) => unit.key)).size !== units.length)
    return "Remove repeated recipient identities.";
  if (
    units.some(
      (unit) =>
        !unit.to.length ||
        [...unit.to.map((r) => r.email), ...unit.cc, ...unit.bcc].some(
          (email) => !z.email().safeParse(email).success,
        ),
    )
  )
    return "Every selected recipient needs a valid email address.";
  return undefined;
}
export function campaignProblem(state: OutreachCampaignState) {
  if (!state.title.trim()) return "Name your campaign.";
  return (
    recipientProblem(state) ??
    (!(state.mainIdea.trim() || state.decisions?.goal.trim())
      ? "Add the main idea for this campaign."
      : undefined)
  );
}
export function routeReceipt(
  key: "campaignRequest" | "generationRequest" | "sendRequest",
  value: string | null,
) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", url);
}
export function readReceipt(key: string) {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const value = params.get(key);
  return params.getAll(key).length === 1 && z.uuid().safeParse(value).success
    ? value
    : null;
}

/** Test delivery uses exactly the explicitly previewed unit; real send keeps all units. */
export function sendUnits(
  units: CampaignUnit[],
  testMode: boolean,
  previewKey?: string,
) {
  if (!testMode) return units;
  const selected = units.find((unit) => unit.key === previewKey);
  if (!selected) throw new Error("Choose the saved message to test.");
  return [selected];
}

export function recoveredCampaignStep(
  state: OutreachCampaignState,
  generationPending: boolean,
  sendPending: boolean,
): OutreachCampaignState {
  return {
    ...state,
    lastStep: sendPending ? 7 : generationPending ? 6 : state.lastStep,
  };
}
/** Navigation is local presentation state, including for historical read-only records. */
export function navigateCampaign(
  state: OutreachCampaignState,
  step: number,
  pending: boolean,
): OutreachCampaignState {
  return !pending && Number.isInteger(step) && step >= 1 && step <= 7
    ? { ...state, lastStep: step }
    : state;
}
export function historicalMessage(
  record: {
    id: string;
    client?: { id: string } | null;
    subject: string | null;
    body: string | null;
  },
  expected: { id: string; clientId: string | null },
) {
  if (
    !sameId(record.id, expected.id) ||
    (record.client?.id ?? null)?.toLowerCase() !==
      expected.clientId?.toLowerCase()
  )
    return null;
  return record.subject || record.body
    ? { subject: record.subject, body: record.body }
    : null;
}
export function canFinishTest(
  send: {
    testMode: boolean;
    status: string;
    deliveries: { status: string }[];
  } | null,
) {
  return (
    !!send?.testMode &&
    ["complete", "partial", "failed", "canceled"].includes(send.status) &&
    !send.deliveries.some((row) =>
      ["unknown", "sending", "pending"].includes(row.status),
    )
  );
}
