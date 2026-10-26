import { canonicalWorkspaceSnapshot } from "@capiro/shared";
import { z } from "zod";
import {
  ordinaryDraftState,
  ordinarySaveBody,
  manualSaveBody,
  ordinarySaveResponse,
  type OrdinaryDraftState,
  type OrdinarySaveBody,
  type OrdinarySaveResponse,
} from "@/shared/capiro/operations/workspace-documents";
import type { RecoveryContract } from "@/shared/session/recovery/journal";
import {
  manualDraftInput,
  type ManualDraftInput,
} from "../prospects/manual-draft";

export type OrdinarySaveScope = {
  tenantId: string;
  userId: string;
  actorId: string;
  draftId: string;
  clientId: string | null;
};
export class OrdinaryScopeError extends Error {
  constructor() {
    super(
      "This document no longer matches the current account or client. Reopen it from Workspace.",
    );
  }
}
export function ordinaryRecoveryScope(scope: OrdinarySaveScope) {
  return JSON.stringify([
    "ordinary-draft-save",
    scope.tenantId,
    scope.userId,
    scope.actorId,
    scope.draftId,
    scope.clientId,
  ]);
}
export function bindOrdinaryState(value: unknown, scope: OrdinarySaveScope) {
  const state = ordinaryDraftState.parse(value);
  if (
    state.tenantId !== scope.tenantId ||
    state.draftId !== scope.draftId ||
    state.clientId !== scope.clientId ||
    state.draft.id !== scope.draftId ||
    state.draft.tenantId !== scope.tenantId ||
    state.draft.clientId !== scope.clientId
  )
    throw new OrdinaryScopeError();
  return state;
}
export function ordinaryInput(state: OrdinaryDraftState): ManualDraftInput {
  return manualDraftInput(state.draft);
}
export function captureOrdinarySave(
  state: OrdinaryDraftState,
  input: ManualDraftInput,
  requestId: string,
) {
  return manualSaveBody.parse({
    requestId,
    expectedStateHash: state.stateHash,
    expectedClientId: state.clientId,
    label: "Manual save",
    draft: {
      docTitle: input.title,
      config: { sectionContent: input.sections },
    },
  });
}
export async function ordinaryRequestHash(
  scope: OrdinarySaveScope,
  body: OrdinarySaveBody,
) {
  const bytes = new TextEncoder().encode(
    canonicalWorkspaceSnapshot({
      operation: "save_ordinary_draft",
      tenantId: scope.tenantId,
      draftId: scope.draftId,
      actorId: scope.actorId,
      input: JSON.parse(JSON.stringify(body)),
    }),
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function bindOrdinaryReceipt(
  value: unknown,
  scope: OrdinarySaveScope,
  body: OrdinarySaveBody,
): Promise<OrdinarySaveResponse> {
  const response = ordinarySaveResponse.parse(value);
  const receipt = response.receipt;
  if (
    receipt.tenantId !== scope.tenantId ||
    receipt.actorId !== scope.actorId ||
    receipt.draftId !== scope.draftId ||
    receipt.clientId !== scope.clientId ||
    receipt.clientId !== body.expectedClientId ||
    receipt.requestId !== body.requestId ||
    receipt.versionId !== body.requestId ||
    receipt.requestHash !== (await ordinaryRequestHash(scope, body))
  )
    throw new Error(
      "The save receipt does not match this request. The save remains unconfirmed.",
    );
  return response;
}

export const ordinaryRetainedSchema = z
  .object({
    body: ordinarySaveBody,
    names: z.array(z.string().max(200)).max(100),
    outcome: z
      .discriminatedUnion("kind", [
        z
          .object({ kind: z.literal("saved"), response: ordinarySaveResponse })
          .strict(),
        z.object({ kind: z.literal("conflict") }).strict(),
      ])
      .optional(),
  })
  .strict();
export type OrdinaryRetained = z.infer<typeof ordinaryRetainedSchema>;
export const ordinaryRecoveryContract: RecoveryContract<OrdinaryRetained> = {
  schema: ordinaryRetainedSchema,
  requestId: (value) => value.body.requestId,
  validateUpdate(previous, next) {
    if (
      canonicalWorkspaceSnapshot(previous.body) !==
        canonicalWorkspaceSnapshot(next.body) ||
      canonicalWorkspaceSnapshot(previous.names) !==
        canonicalWorkspaceSnapshot(next.names) ||
      (previous.outcome &&
        canonicalWorkspaceSnapshot(previous.outcome) !==
          canonicalWorkspaceSnapshot(next.outcome))
    )
      throw new Error(
        "A retained save cannot change its original request or known outcome.",
      );
  },
};
export function retainedOrdinaryInput(
  value: OrdinaryRetained,
): ManualDraftInput {
  if (value.body.label !== "Manual save")
    throw new Error("The retained request belongs to a different editor.");
  return {
    title: value.body.draft.docTitle,
    names: value.names,
    sections: value.body.draft.config.sectionContent,
  };
}
export type OrdinarySaveModel<Input> = {
  input: (state: OrdinaryDraftState) => Input;
  retained: (record: OrdinaryRetained) => Input;
  capture: (
    state: OrdinaryDraftState,
    input: Input,
    requestId: string,
  ) => OrdinaryRetained;
};
export const manualSaveModel: OrdinarySaveModel<ManualDraftInput> = {
  input: ordinaryInput,
  retained: retainedOrdinaryInput,
  capture: (state, input, requestId) => ({
    body: captureOrdinarySave(state, input, requestId),
    names: input.names,
  }),
};
export function sameOrdinaryRequest(a: OrdinaryRetained, b: OrdinaryRetained) {
  return (
    canonicalWorkspaceSnapshot(a.body) === canonicalWorkspaceSnapshot(b.body)
  );
}
