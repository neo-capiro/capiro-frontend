import { CapiroApiError } from "@/shared/capiro/http";
import type { ImportResult } from "@/shared/capiro/onboard-contracts";

/** Existing Core import limit; each receipt is retained if a later chunk reaches the cap. */
export const IMPORT_CHUNK_SIZE = 100;

/** One chunk's legacy receipt; the durable job summary is tracked separately. */
export type ImportChunkReceipt = Omit<ImportResult, "capMessage" | "job">;
export type ImportSelectionResult = ImportChunkReceipt & {
  capMessage: string | null;
};

/** A dispatched chunk's durable identity, retained before the request leaves. */
export type PendingImportRequest = { requestId: string; ids: number[] };

export class InterruptedImport extends Error {
  constructor(
    public readonly partial: ImportSelectionResult,
    public readonly unknownIds: number[],
    public readonly unattemptedIds: number[],
    cause: unknown,
    /** Identity of the dispatched-but-unconfirmed request, when it left the browser. */
    public readonly unknownRequestId: string | null = null,
  ) {
    super(
      "Some import outcomes are unknown. Review current status before another import.",
      { cause },
    );
    this.name = "InterruptedImport";
  }
}

export type ImportChunkDispatch = (
  ids: number[],
  requestId: string,
) => Promise<ImportChunkReceipt>;

export type ImportSelectionOptions = {
  issueRequestId?: () => string;
  /** Runs BEFORE dispatch so a reload can reconcile the same identity. */
  retainRequest?: (request: PendingImportRequest) => void;
  /** Runs when the request is definitively resolved (acknowledged or refused). */
  settleRequest?: (request: PendingImportRequest) => void;
};

/**
 * No automatic retry: a dispatched chunk whose answer was lost keeps a retained
 * identity and is reported as unknown, never resent. The caller reconciles it
 * through the read-only job/request lookup.
 */
export async function importClientSelection(
  ids: number[],
  importChunk: ImportChunkDispatch,
  options: ImportSelectionOptions = {},
): Promise<ImportSelectionResult> {
  const issueRequestId = options.issueRequestId ?? (() => crypto.randomUUID());
  const result: ImportSelectionResult = {
    created: 0,
    items: [],
    skipped: [],
    capMessage: null,
  };
  for (let index = 0; index < ids.length; index += IMPORT_CHUNK_SIZE) {
    const request: PendingImportRequest = {
      requestId: issueRequestId(),
      ids: ids.slice(index, index + IMPORT_CHUNK_SIZE),
    };
    const unattemptedIds = ids.slice(index + IMPORT_CHUNK_SIZE);
    options.retainRequest?.(request);
    try {
      const chunk = await importChunk(request.ids, request.requestId);
      options.settleRequest?.(request);
      result.created += chunk.created;
      result.items.push(...chunk.items);
      result.skipped.push(...chunk.skipped);
    } catch (error) {
      if (error instanceof CapiroApiError && error.status === 402) {
        // Definite refusal before any work; the identity was not admitted.
        options.settleRequest?.(request);
        result.capMessage = error.message;
        break;
      }
      if (index === 0 && isDefiniteRefusal(error)) throw error;
      // Anything else may have executed: keep the identity and report the
      // dispatched-but-unconfirmed chunk separately from unattempted ids.
      throw new InterruptedImport(
        result,
        request.ids,
        unattemptedIds,
        error,
        request.requestId,
      );
    }
  }
  return result;
}

/** A 4xx other than the cap refusal is a definite answer, not an unknown effect. */
function isDefiniteRefusal(error: unknown): boolean {
  return (
    error instanceof CapiroApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 402
  );
}
