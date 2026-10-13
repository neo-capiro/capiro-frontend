import type { useCapiro } from "@/shared/capiro/CapiroBoundary";
import type { BriefCopySource } from "@/shared/capiro/operations/workspace-brief-copy";
import { verifyProspectWriter } from "../prospects/recovery-authority";
import {
  assertCopyDetail,
  assertCopyReceipt,
  assertCopyScope,
  type CopyScope,
} from "./admission";
import { copyIntentSchema, type CopyIntent } from "./intent";
type Api = ReturnType<typeof useCapiro>;
type Lifetime = { signal: AbortSignal; guard: () => void };

export async function readCopyState(
  api: Api,
  scope: CopyScope,
  lifetime: Lifetime,
) {
  lifetime.guard();
  await verifyProspectWriter(api, scope.actor, lifetime.signal, lifetime.guard);
  const state = await api.request(
    "workspace.brief-copy.state",
    { params: { draftId: scope.draftId } },
    { signal: lifetime.signal },
  );
  lifetime.guard();
  assertCopyScope(state, scope);
  return state;
}
/** Detail is admitted only alongside an independently fresh matching baseline. */
export async function readCopyDocument(
  api: Api,
  scope: CopyScope,
  documentId: string,
  source: BriefCopySource,
  lifetime: Lifetime,
) {
  const detail = await api.request(
    "workspace.brief-copy.detail",
    { params: { draftId: scope.draftId, docId: documentId } },
    { signal: lifetime.signal },
  );
  lifetime.guard();
  const state = await readCopyState(api, scope, lifetime);
  assertCopyDetail(detail, state, scope, documentId, source);
  return { detail, state };
}
/** A single deliberate submission. Hashes remain opaque; replay input is unchanged. */
export async function submitCopyIntent(
  api: Api,
  scope: CopyScope,
  intent: CopyIntent,
  lifetime: Lifetime,
) {
  copyIntentSchema.parse(intent);
  if (
    intent.source.prospectId !== scope.prospectId ||
    intent.command.body.expectedClientId !== scope.clientId
  )
    throw new Error(
      "The retained command belongs to a different prospect or client.",
    );
  await readCopyState(api, scope, lifetime);
  if (intent.command.kind === "save")
    await readCopyDocument(
      api,
      scope,
      intent.command.documentId,
      intent.source,
      lifetime,
    );
  lifetime.guard();
  const result =
    intent.command.kind === "copy"
      ? await api.request(
          "workspace.brief-copy.create",
          { params: { draftId: scope.draftId }, body: intent.command.body },
          { signal: lifetime.signal },
        )
      : await api.request(
          "workspace.brief-copy.save",
          {
            params: {
              draftId: scope.draftId,
              docId: intent.command.documentId,
            },
            body: intent.command.body,
          },
          { signal: lifetime.signal },
        );
  lifetime.guard();
  assertCopyReceipt(
    result,
    scope,
    {
      requestId: intent.command.body.requestId,
      operation:
        intent.command.kind === "copy" ? "copy_core_brief" : "save_brief_copy",
      source: intent.source,
      documentId:
        intent.command.kind === "save" ? intent.command.documentId : undefined,
    },
    intent.receipt,
  );
  return result;
}
