import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import {
  mailThreadPageSchema,
  readMailThreadPage,
  type MailContinuation,
} from "../email/read";

// The current Core page is bounded; callers load more explicitly.
export const fullThreadSchema = mailThreadPageSchema;
export type FullThread = z.infer<typeof fullThreadSchema>;
export interface ThreadScope {
  tenantId: string;
  userId: string;
  clientId: string;
  threadId: string;
}
export const threadKey = (scope: ThreadScope) =>
  [
    "mail-thread",
    scope.tenantId,
    scope.userId,
    scope.clientId,
    scope.threadId,
  ] as const;
export function readTimelineThread(
  api: ApiClient,
  scope: ThreadScope,
  signal?: AbortSignal,
  continuation: MailContinuation = {},
) {
  z.uuid().parse(scope.clientId);
  z.uuid().parse(scope.threadId);
  return readMailThreadPage(api, scope, continuation, signal);
}
