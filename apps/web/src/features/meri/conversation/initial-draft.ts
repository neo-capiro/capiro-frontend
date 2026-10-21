import {
  submissionIdentity,
  type ConversationIntent,
} from "../../../shared/meri-conversations/query-journal";
import type { ActionContext } from "../../../shared/meri-actions/session-receipt";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";

const runKey = (context: ActionContext) =>
  JSON.stringify([
    context.tenantId,
    context.actorId,
    context.selectedClientId,
    context.conversationId,
    context.runId,
  ]);

/** Local draft consumption follows the conversation lifetime, including replacement sessions. */
export function createInitialDraftOwner() {
  let editRevision = 0;
  let pending: {
    run: string;
    request: string;
    draft: string;
    edited: boolean;
  } | null = null;
  return {
    begin(
      context: ActionContext,
      request: ConversationSubmitRequest,
      draft: string,
      capturedRevision = editRevision,
    ) {
      pending = {
        run: runKey(context),
        request: submissionIdentity(request),
        draft,
        edited: capturedRevision !== editRevision,
      };
    },
    select(context: ActionContext) {
      // A new accepted run retires the old local capture, never the person's draft text.
      // Replacement sessions for the same run keep the exact pending acknowledgement.
      if (pending && pending.run !== runKey(context)) pending = null;
    },
    edit() {
      editRevision++;
      if (pending) pending.edited = true;
    },
    revision: () => editRevision,
    reset() {
      pending = null;
      editRevision++;
    },
    hasPending: (context: ActionContext) => pending?.run === runKey(context),
    acknowledge(
      context: ActionContext,
      submit: ConversationIntent["submit"],
      draft: string,
    ) {
      if (
        !pending ||
        submit?.state !== "observed" ||
        pending.run !== runKey(context)
      )
        return false;
      const request = { ...submit };
      Reflect.deleteProperty(request, "state");
      Reflect.deleteProperty(request, "workflow");
      if (submissionIdentity(request) !== pending.request) return false;
      const clear = !pending.edited && draft === pending.draft;
      pending = null;
      return clear;
    },
  };
}

export type InitialDraftOwner = ReturnType<typeof createInitialDraftOwner>;
