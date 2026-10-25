import { canonicalWorkspaceSnapshot } from "@capiro/shared";
import type { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { CapiroApiError } from "@/shared/capiro/http";
import {
  clientBriefCopyCommandSchema,
  clientBriefCopyReceiptSchema,
  type ClientBriefCopyCommand,
} from "@/shared/capiro/operations/workspace-client-brief-copy";
import {
  prospectIntentScope,
  type ProspectWriter,
} from "@/features/modules/workspace/prospect-actions-public";
import {
  clientBriefCopyAttemptSchema,
  type ClientBriefCopyAttempt,
} from "./contracts";
import type { ClientBriefReview } from "./review";

export const clientBriefCopyScope = (
  actor: ProspectWriter,
  prospectId: string,
) => prospectIntentScope("prospect-client-brief-copy", actor, prospectId);
export async function clientBriefCopyDigest(
  actor: ProspectWriter,
  command: ClientBriefCopyCommand,
) {
  const value = canonicalWorkspaceSnapshot({
    operation: "copy_core_brief_to_client",
    tenantId: actor.tenantId,
    actorId: actor.ownerId,
    command,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function prepareClientBriefCopy(
  actor: ProspectWriter,
  review: ClientBriefReview,
  docTitle: string,
  requestId: string = crypto.randomUUID(),
): Promise<ClientBriefCopyAttempt> {
  const command = clientBriefCopyCommandSchema.parse({
    schemaVersion: 1,
    requestId,
    prospectId: review.prospect.id,
    clientId: review.client.id,
    expectedProspectUpdatedAt: review.prospect.updatedAt,
    docTitle: docTitle.trim(),
    source: review.selection.source,
  });
  return clientBriefCopyAttemptSchema.parse({
    tenantId: actor.tenantId,
    userId: actor.userId,
    actorId: actor.ownerId,
    command,
    payloadDigest: await clientBriefCopyDigest(actor, command),
    clientName: review.client.name,
    sourceTitle: review.selection.title,
  });
}
export async function clientBriefCopyRequest(
  api: ReturnType<typeof useCapiro>,
  actor: ProspectWriter,
  attempt: ClientBriefCopyAttempt,
  send: boolean,
  signal: AbortSignal,
  guard: () => void,
) {
  guard();
  signal.throwIfAborted();
  const saved = clientBriefCopyAttemptSchema.parse(attempt);
  if (
    saved.tenantId !== actor.tenantId ||
    saved.userId !== actor.userId ||
    saved.actorId !== actor.ownerId ||
    saved.payloadDigest !== (await clientBriefCopyDigest(actor, saved.command))
  )
    throw new Error(
      "The saved brief copy does not match this account or its original command.",
    );
  guard();
  signal.throwIfAborted();
  const { prospectId, clientId, requestId } = saved.command;
  const receipt = clientBriefCopyReceiptSchema.parse(
    send
      ? await api.request(
          "workspace.client-brief-copy.create",
          { params: { prospectId, clientId }, body: saved.command },
          { signal },
        )
      : await api.request(
          "workspace.client-brief-copy.receipt",
          { params: { prospectId, clientId, requestId } },
          { signal },
        ),
  );
  guard();
  signal.throwIfAborted();
  if (
    receipt.tenantId !== saved.tenantId ||
    receipt.actorId !== saved.actorId ||
    receipt.prospectId !== prospectId ||
    receipt.clientId !== clientId ||
    receipt.requestId !== requestId ||
    receipt.payloadDigest !== saved.payloadDigest
  )
    throw new CapiroApiError(
      502,
      "The brief copy receipt does not match the original review. Keep the saved command for recovery.",
    );
  return receipt;
}
