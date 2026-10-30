import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmedInputRefusal } from "./attempt-journal";
import { useOnboardAttempt } from "./use-onboard-attempt";
import { useLocalOnboardRecord } from "./use-local-record";
import {
  importClientSelection,
  InterruptedImport,
  type ImportSelectionResult,
  type PendingImportRequest,
} from "./import-client-selection";
import {
  clearImportRequest,
  ImportIdentityUnavailableError,
  readImportRequest,
  retainImportRequest,
  type ImportRequestScope,
} from "./import-request-intent";
import type { CapiroApi, ImportChunkJobSummary } from "./capiro-api";

export type ImportEvidence = {
  requested: number[];
  receipt: ImportSelectionResult;
  unknownIds: number[];
  unattemptedIds: number[];
  unknownRequestId: string | null;
  jobs: ImportChunkJobSummary[];
};
const empty = (): ImportSelectionResult => ({
  created: 0,
  items: [],
  skipped: [],
  capMessage: null,
});
const emptyEvidence = (requested: number[]): ImportEvidence => ({
  requested,
  receipt: empty(),
  unknownIds: [],
  unattemptedIds: requested,
  unknownRequestId: null,
  jobs: [],
});

const scopeKeyOf = (scope: ImportRequestScope | null) =>
  `${scope?.orgId ?? "no-org"}:${scope?.userId ?? "anonymous"}`;

/**
 * The importer journal/evidence is scoped to the current Clerk org+user, and a
 * pending dispatch identity is retained in session recovery BEFORE the request
 * leaves. A reload reads that identity back for the SAME job; it never
 * resubmits. Late responses from a previous account fail the current-owner
 * guard and publish nothing.
 */
export function useClientImport(
  api: CapiroApi,
  scope: ImportRequestScope | null,
) {
  const liveScope = useRef(scope);
  useEffect(() => {
    liveScope.current = scope;
  }, [scope]);
  const submittedScope = useRef<ImportRequestScope | null>(null);
  const isCurrent = useCallback(() => {
    const live = liveScope.current;
    const submitted = submittedScope.current;
    return (
      !!live &&
      !!submitted &&
      live.orgId === submitted.orgId &&
      live.userId === submitted.userId
    );
  }, []);
  const scopeKey = scopeKeyOf(scope);
  const attempt = useOnboardAttempt(
    api,
    `client-import:${scopeKey}`,
    isCurrent,
  );
  const [evidence, save] = useLocalOnboardRecord<ImportEvidence>(
    `client-import-receipts:${scopeKey}`,
  );
  const [retainedState, setRetainedState] = useState<{
    scopeKey: string;
    request: PendingImportRequest | null;
  }>(() => ({
    scopeKey,
    request: scope ? readImportRequest(scope) : null,
  }));
  // Account switch: read the new account's own record during render; the old
  // account's retained identity is never displayed.
  if (retainedState.scopeKey !== scopeKey)
    setRetainedState({
      scopeKey,
      request: scope ? readImportRequest(scope) : null,
    });
  const retained =
    retainedState.scopeKey === scopeKey ? retainedState.request : null;
  const [lastJobState, setLastJobState] = useState<{
    scopeKey: string;
    job: ImportChunkJobSummary | null;
  }>({ scopeKey, job: null });
  if (lastJobState.scopeKey !== scopeKey)
    setLastJobState({ scopeKey, job: null });
  const lastJob = lastJobState.scopeKey === scopeKey ? lastJobState.job : null;

  const run = (selected: number[]) => {
    const activeScope = liveScope.current;
    if (!activeScope)
      return Promise.reject(new Error("A current account is required."));
    // The shared attempt owner asserts current identity BEFORE invoking the
    // perform callback, so the submitted scope must be installed first. It is
    // replaced by a later run on the current account and never by a switch.
    submittedScope.current = activeScope;
    return attempt.run(
      `Import ${selected.length} reviewed client IDs`,
      async (guard) => {
        const requested = [...selected];
        let receipt = empty();
        let offset = 0;
        const jobs: ImportChunkJobSummary[] = [];
        setLastJobState({ scopeKey, job: null });
        save(emptyEvidence(requested));
        try {
          const result = await importClientSelection(
            requested,
            async (ids, requestId) => {
              guard.assertCurrent();
              const next = await guard.wait(() =>
                api.importClientChunk(ids, requestId),
              );
              receipt = {
                created: receipt.created + next.created,
                items: [...receipt.items, ...next.items],
                skipped: [...receipt.skipped, ...next.skipped],
                capMessage: null,
              };
              offset += ids.length;
              jobs.push(next.job);
              setLastJobState({ scopeKey, job: next.job });
              save({
                requested,
                receipt,
                unknownIds: [],
                unattemptedIds: requested.slice(offset),
                unknownRequestId: null,
                jobs: [...jobs],
              });
              return next;
            },
            {
              // Identity is issued and retained before dispatch so a lost answer
              // can only ever be reconciled, never resent.
              retainRequest: (request) => {
                guard.assertCurrent();
                retainImportRequest(activeScope, request);
                setRetainedState({ scopeKey, request });
                save({
                  requested,
                  receipt,
                  unknownIds: request.ids,
                  unattemptedIds: requested.slice(offset + request.ids.length),
                  unknownRequestId: request.requestId,
                  jobs: [...jobs],
                });
              },
              settleRequest: (request) => {
                if (!guard.current()) return;
                clearImportRequest(activeScope, undefined, request.requestId);
                setRetainedState((current) =>
                  current.scopeKey === scopeKey &&
                  current.request?.requestId === request.requestId
                    ? { scopeKey, request: null }
                    : current,
                );
              },
            },
          );
          guard.assertCurrent();
          save({
            requested,
            receipt: result,
            unknownIds: [],
            unattemptedIds: requested.slice(offset),
            unknownRequestId: null,
            jobs: [...jobs],
          });
          return result;
        } catch (error) {
          if (error instanceof ImportIdentityUnavailableError) {
            // Nothing left the browser. Report a recoverable, definite refusal
            // (the attempt journal must not mark this as an unknown effect).
            throw new ConfirmedInputRefusal(error.message);
          }
          if (guard.current() && error instanceof InterruptedImport) {
            save({
              requested,
              receipt: error.partial,
              unknownIds: error.unknownIds,
              unattemptedIds: error.unattemptedIds,
              unknownRequestId: error.unknownRequestId,
              jobs: [...jobs],
            });
            if (error.unknownRequestId)
              setRetainedState({
                scopeKey,
                request: {
                  requestId: error.unknownRequestId,
                  ids: error.unknownIds,
                },
              });
          }
          throw error;
        }
      },
    );
  };

  const dismissRetained = useCallback(() => {
    if (!scope) return;
    clearImportRequest(scope);
    setRetainedState({ scopeKey, request: null });
  }, [scope, scopeKey]);

  return {
    ...attempt,
    evidence,
    run,
    retained,
    lastJob,
    dismissRetained,
  };
}
