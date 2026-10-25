import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  transferAttemptSchema,
  transferCommandSchema,
  transferReceiptSchema,
  type TransferAttempt,
  type TransferCommand,
} from "./contracts";
import {
  assertTransferReview,
  type TransferDecision,
  type TransferReview,
} from "./review";

export const transferScope = (actor: ClientWriter, prospectId: string) =>
  JSON.stringify([
    "prospect-contact-transfer",
    actor.tenantId.toLowerCase(),
    actor.userId.toLowerCase(),
    prospectId,
  ]);
export async function transferDigest(
  actor: ClientWriter,
  command: TransferCommand,
) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        "prospect-contact-transfer",
        1,
        actor.tenantId.toLowerCase(),
        actor.userId.toLowerCase(),
        command,
      ]),
    ),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function prepareContactTransfer(
  actor: ClientWriter,
  review: TransferReview,
  decisions: TransferDecision[],
  nextId: () => string = () => crypto.randomUUID(),
): Promise<TransferAttempt> {
  assertTransferReview(review, review, decisions);
  // Core v1 property order, canonical timestamps, and source ordering are part of the digest.
  const command = transferCommandSchema.parse({
    schemaVersion: 1,
    requestId: nextId(),
    prospectId: review.prospect.id,
    clientId: review.client.id,
    expectedProspectUpdatedAt: review.prospect.updatedAt,
    items: [...decisions]
      .sort((a, b) => a.sourceId.localeCompare(b.sourceId))
      .map((decision) => {
        const source = review.contacts.find(
          (row) => row.id === decision.sourceId,
        )!;
        const common = {
          sourceId: source.id,
          expectedVersion: source.version,
          action: decision.action,
        };
        if (decision.action === "create")
          return { ...common, createRequestId: nextId() };
        if (decision.action === "link")
          return {
            ...common,
            personId: decision.personId,
            expectedUpdatedAt: review.people.find(
              (row) => row.id === decision.personId,
            )!.updatedAt,
          };
        return common;
      }),
  });
  return transferAttemptSchema.parse({
    tenantId: actor.tenantId.toLowerCase(),
    actorUserId: actor.userId.toLowerCase(),
    command,
    payloadDigest: await transferDigest(actor, command),
    clientName: review.client.name,
    summary: command.items.map((item) => ({
      sourceId: item.sourceId,
      name: review.contacts.find((row) => row.id === item.sourceId)!.name,
      targetName:
        item.action === "link"
          ? review.people.find((row) => row.id === item.personId)!.name
          : null,
    })),
  });
}

export async function contactTransferRequest(
  api: ApiClient,
  actor: ClientWriter,
  attempt: TransferAttempt,
  send: boolean,
  signal: AbortSignal,
  guard: () => void,
) {
  guard();
  signal.throwIfAborted();
  const saved = transferAttemptSchema.parse(attempt);
  if (
    saved.tenantId !== actor.tenantId.toLowerCase() ||
    saved.actorUserId !== actor.userId.toLowerCase() ||
    saved.payloadDigest !== (await transferDigest(actor, saved.command))
  )
    throw new Error(
      "The saved contact transfer does not match this account or its original command.",
    );
  guard();
  signal.throwIfAborted();
  const command = saved.command;
  const base = `business-development/prospects/${command.prospectId}/contacts/transfers`;
  const receipt = await api.request(
    "core",
    send ? base : `${base}/${command.requestId}`,
    transferReceiptSchema,
    {
      method: send ? "POST" : "GET",
      ...(send ? { body: command } : {}),
      signal,
    },
  );
  guard();
  signal.throwIfAborted();
  const matched =
    receipt.tenantId === saved.tenantId &&
    receipt.actorUserId === saved.actorUserId &&
    receipt.requestId === command.requestId &&
    receipt.prospectId === command.prospectId &&
    receipt.clientId === command.clientId &&
    receipt.payloadDigest === saved.payloadDigest;
  const items = receipt.status === "completed" ? receipt.result.items : null;
  const creates =
    items
      ?.filter((item) => item.action === "create")
      .map((item) => item.personId) ?? [];
  if (
    !matched ||
    (items &&
      (items.length !== command.items.length ||
        new Set(creates).size !== creates.length ||
        items.some((item, index) => {
          const original = command.items[index]!;
          return (
            item.sourceId !== original.sourceId ||
            item.sourceVersion !== original.expectedVersion ||
            item.action !== original.action ||
            (original.action === "skip"
              ? item.personId !== null
              : !item.personId) ||
            (original.action === "link" && item.personId !== original.personId)
          );
        })))
  )
    throw new ApiError(
      502,
      "The contact transfer receipt does not match the original review. Recover the saved command before continuing.",
    );
  return receipt;
}
