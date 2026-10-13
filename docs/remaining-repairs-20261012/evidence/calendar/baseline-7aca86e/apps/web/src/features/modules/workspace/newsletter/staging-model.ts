import { z } from "zod";
import type { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import {
  newsletterStagingBody,
  type SavedNewsletterRevision,
  type NewsletterStagingReceipt,
} from "../../../../shared/capiro/operations/workspace-newsletter-staging";

export type StagingApi = ReturnType<typeof useCapiro>;
export type StagingActor = {
  tenantId: string;
  userId: string;
  clerkUserId: string;
};
const intent = z
  .object({ sessionId: z.uuid(), body: newsletterStagingBody })
  .strict();
export type StagingIntent = z.infer<typeof intent>;
export const stagingRecovery = {
  schema: intent,
  requestId: (value: StagingIntent) => value.body.requestId,
};
export function stagingScope(actor: StagingActor, draftId: string) {
  return JSON.stringify([
    "newsletter-staging",
    actor.tenantId.toLowerCase(),
    actor.userId.toLowerCase(),
    actor.clerkUserId,
    draftId.toLowerCase(),
  ]);
}
export async function verifyStagingActor(
  api: StagingApi,
  actor: StagingActor,
  draftId: string,
  signal: AbortSignal,
  guard: () => void,
) {
  guard();
  const me = await api.request("me.read", {}, { signal });
  guard();
  if (
    me.tenant.id !== actor.tenantId ||
    me.user.id !== actor.userId ||
    me.user.clerkUserId !== actor.clerkUserId ||
    !["standard_user", "user_admin", "capiro_admin"].includes(me.role)
  )
    throw new Error(
      "The current Core identity cannot recover this staging request.",
    );
  const draft = await api.request(
    "workspace.draft",
    { params: { id: draftId } },
    { signal },
  );
  guard();
  if (
    draft.id !== draftId ||
    draft.prospectId ||
    (draft.tenantId && draft.tenantId !== actor.tenantId)
  )
    throw new Error("This document is unavailable for Newsletter staging.");
}
export function requireCompatibleSponsor(
  revision: SavedNewsletterRevision,
  sponsor: { kind: string; clientRefs: { clientId: string }[] },
) {
  const compatible = revision.clientId
    ? sponsor.kind === "client" &&
      sponsor.clientRefs.length === 1 &&
      sponsor.clientRefs[0]!.clientId.toLowerCase() ===
        revision.clientId.toLowerCase()
    : sponsor.kind === "firm" && sponsor.clientRefs.length === 0;
  if (!compatible)
    throw new Error(
      "Select an Outreach session with the exact saved client sponsor, or an explicit firm sponsor for firm content.",
    );
}
export async function readStagingSelection(
  api: StagingApi,
  draftId: string,
  versionId: string,
  sessionId: string,
  signal: AbortSignal,
  guard: () => void,
) {
  const revision = await api.request(
    "workspace.newsletter.revision",
    { params: { draftId, versionId } },
    { signal },
  );
  guard();
  if (revision.draftId !== draftId || revision.versionId !== versionId)
    throw new Error(
      "The selected saved revision does not match the source receipt.",
    );
  const session = await api.request(
    "engagement.session",
    { params: { sessionId } },
    { signal },
  );
  guard();
  if (session.session.id !== sessionId)
    throw new Error(
      "The selected Outreach session does not match its receipt.",
    );
  requireCompatibleSponsor(revision, session.spec.sponsor);
  return { revision, session };
}
export function verifyStagingReceipt(
  receipt: NewsletterStagingReceipt,
  original: StagingIntent,
  revision: SavedNewsletterRevision,
) {
  const body = original.body;
  const staged = receipt.staged;
  if (
    receipt.batchId !== body.requestId ||
    staged.requestId !== body.requestId ||
    staged.expectedStateVersion !== body.expectedStateVersion ||
    staged.draftId !== body.draftId ||
    staged.versionId !== body.versionId ||
    staged.snapshotHash !== body.snapshotHash ||
    staged.clientId !== revision.clientId ||
    staged.savedAt !== revision.savedAt ||
    staged.authorId !== revision.authorId ||
    staged.authorKind !== revision.authorKind ||
    receipt.stateVersion !==
      body.expectedStateVersion + (receipt.changed ? 1 : 0) ||
    receipt.status !== (receipt.changed ? "applied" : "no_change")
  )
    throw new Error(
      "The staging receipt does not match the original saved revision. Recover the original request; do not stage a replacement.",
    );
}
