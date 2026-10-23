import type { ApiClient } from "@/shared/portfolio/api/http";
import { threadPageSchema, type MailThreadPage } from "../email/read-contracts";
import {
  mailThreadKey,
  readThreadPage,
  type ThreadContinuation,
} from "../email/read-pages";

// One bounded current page, never the list's previews or all provider history.
export const fullThreadSchema = threadPageSchema;
export type FullThread = MailThreadPage;
export interface ThreadScope {
  tenantId: string;
  userId: string;
  clientId: string;
  threadId: string;
}
export const threadKey = (scope: ThreadScope) =>
  mailThreadKey(scope, scope.threadId);
export function readTimelineThread(
  api: ApiClient,
  scope: ThreadScope,
  signal?: AbortSignal,
  continuation: ThreadContinuation | null = null,
) {
  return readThreadPage(api, scope, scope.threadId, continuation, signal);
}
