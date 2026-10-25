import type { ApiClient } from "@/shared/portfolio/api/http";
import { clientSchema } from "@/shared/session/client-contract";
import {
  readPeople,
  type Person,
} from "@/features/portfolio/relationships/contact-public";
import { readContacts } from "../contacts/api";
import type { ProspectContact } from "../contacts/contracts";
import { prospectForIdSchema, type Prospect } from "../contracts";
import { transferTimestamp, type TransferAttempt } from "./contracts";

export type TransferReview = {
  prospect: Prospect;
  client: { id: string; name: string };
  contacts: ProspectContact[];
  people: Person[];
};
export type TransferDecision =
  | { sourceId: string; action: "create" | "skip" }
  | { sourceId: string; action: "link"; personId: string };
export type FreshTransferReview = {
  review: TransferReview;
  decisions: TransferDecision[];
  notices: { sourceId: string; message: string }[];
};

/** Preserve the user's actions, while exposing every unavailable or changed selection for a new confirmation. */
export function restoreTransferChoices(
  attempt: TransferAttempt,
  current: TransferReview,
): FreshTransferReview {
  const decisions: TransferDecision[] = [],
    notices: FreshTransferReview["notices"] = [];
  for (const item of attempt.command.items) {
    const source = current.contacts.find((row) => row.id === item.sourceId);
    const original = attempt.summary.find(
      (row) => row.sourceId === item.sourceId,
    )!;
    if (!source) {
      notices.push({
        sourceId: item.sourceId,
        message: `${original.name} is no longer available and is not included in this new review (previous choice: ${item.action}).`,
      });
      continue;
    }
    decisions.push(
      item.action === "link"
        ? { sourceId: item.sourceId, action: "link", personId: item.personId }
        : { sourceId: item.sourceId, action: item.action },
    );
    if (source.version !== item.expectedVersion)
      notices.push({
        sourceId: item.sourceId,
        message: `${source.name} changed. Review its current details before confirming the retained ${item.action} choice.`,
      });
    const matches = exactContactMatches(source, current.people);
    if (item.action === "create" && matches.length)
      notices.push({
        sourceId: item.sourceId,
        message: `${source.name} now has an exact client match. Choose an explicit link or skip instead of the previous create choice.`,
      });
    if (item.action === "link") {
      const target = matches.find((row) => row.id === item.personId);
      if (!target || !transferTimestamp.safeParse(target.updatedAt).success)
        notices.push({
          sourceId: item.sourceId,
          message: `The previous link for ${source.name} is unavailable or no longer an exact match. Choose a current action.`,
        });
      else if (target.updatedAt !== item.expectedUpdatedAt)
        notices.push({
          sourceId: item.sourceId,
          message: `The previous linked target for ${source.name} changed. Review its current timestamp and retained choice.`,
        });
    }
  }
  return { review: current, decisions, notices };
}
type Fields = Pick<
  ProspectContact,
  "name" | "title" | "email" | "phone" | "notes"
>;
export const contactTuple = (value: Fields) =>
  JSON.stringify({
    name: value.name.trim(),
    title: value.title?.trim() || null,
    email: value.email?.trim() || null,
    phone: value.phone?.trim() || null,
    notes: value.notes?.trim() || null,
  });
export const exactContactMatches = (source: Fields, people: Person[]) =>
  people.filter((person) => contactTuple(source) === contactTuple(person));

export async function readTransferReview(
  api: ApiClient,
  prospectId: string,
  clientId: string,
  signal: AbortSignal,
  guard: () => void,
): Promise<TransferReview> {
  guard();
  signal.throwIfAborted();
  const [prospect, source, people, client] = await Promise.all([
    api.request(
      "core",
      `business-development/prospects/${prospectId}`,
      prospectForIdSchema(prospectId),
      { signal },
    ),
    readContacts(api, prospectId, signal),
    readPeople(api, clientId, signal),
    api.request(
      "core",
      `clients/${clientId}`,
      clientSchema.refine(
        (row) => row.id === clientId && row.status !== "archived",
      ),
      { signal },
    ),
  ]);
  guard();
  signal.throwIfAborted();
  if (
    !prospect.convertedAt ||
    prospect.linkedClientId !== clientId ||
    prospect.status !== "active"
  )
    throw new Error(
      "Refresh the prospect and its linked client before reviewing contacts.",
    );
  transferTimestamp.parse(prospect.updatedAt);
  return {
    prospect,
    client: { id: client.id, name: client.name },
    contacts: source.contacts,
    people,
  };
}

/** Fresh reads invalidate changed review facts; only Core decides authorization and commit. */
export function assertTransferReview(
  reviewed: TransferReview,
  current: TransferReview,
  decisions: TransferDecision[],
) {
  if (
    decisions.length < 1 ||
    decisions.length > 50 ||
    new Set(decisions.map((item) => item.sourceId)).size !== decisions.length
  )
    throw new Error("Choose between 1 and 50 distinct source contacts.");
  if (
    reviewed.prospect.id !== current.prospect.id ||
    reviewed.prospect.updatedAt !== current.prospect.updatedAt ||
    reviewed.client.id !== current.client.id ||
    reviewed.client.name !== current.client.name
  )
    throw new Error(
      "The prospect or linked client changed. Refresh and review the transfer again.",
    );
  const creates = new Set<string>();
  for (const decision of decisions) {
    const before = reviewed.contacts.find(
      (row) => row.id === decision.sourceId,
    );
    const source = current.contacts.find((row) => row.id === decision.sourceId);
    if (
      !before ||
      !source ||
      before.version !== source.version ||
      contactTuple(before) !== contactTuple(source)
    )
      throw new Error(
        "A selected source contact changed. Refresh and review the transfer again.",
      );
    const matches = exactContactMatches(source, current.people);
    if (decision.action === "create") {
      const tuple = contactTuple(source);
      if (matches.length || creates.has(tuple))
        throw new Error(
          "A selected contact has an exact match. Explicitly link or skip it instead.",
        );
      creates.add(tuple);
    } else if (decision.action === "link") {
      const target = matches.find((row) => row.id === decision.personId);
      const original = reviewed.people.find(
        (row) => row.id === decision.personId,
      );
      if (
        !target ||
        !original ||
        !transferTimestamp.safeParse(target.updatedAt).success ||
        target.updatedAt !== original.updatedAt ||
        contactTuple(original) !== contactTuple(source)
      )
        throw new Error(
          "The exact matching client contact changed or has no current version. Refresh the review.",
        );
    }
  }
}
