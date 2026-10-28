/**
 * Read-only access to the bounded native-result page of a captured run.
 *
 * The receiver is additive and separately named (`nativeResultsVersion` 1.0.0): it stays outside
 * DocumentAccessRoute 0.2, admits no version for inspect or download and describes no bytes. Every
 * row is a metadata selector, so reading an entry still goes through the existing current-authorized
 * inspect/download owner, which re-checks context, retention and revocation before releasing.
 *
 * The browser supplies no run, actor, client or path binding: the request is the contract's closed
 * empty object bound to the action session that asked, and the canonical receiver admits the answer.
 */
import {
  receiveNativeResultsRequest,
  type NativeResultsSnapshot,
} from "@capiro/meri-client/document-access";
import { withActionDeadline } from "../meri-actions/bounded-json";
import type { ArtifactReply } from "./artifact-access";
import {
  DocumentAccessUnavailable,
  documentAccessTransport,
} from "./workflow-transport";

/** One captured workspace entry: a relative workspace path plus the identity of its immutable object. */
export type NativeResultRow = NativeResultsSnapshot["results"][number];
export type NativeResultsPage = Readonly<NativeResultsSnapshot>;
export interface NativeResultsAccess {
  /** Keeps early session renewal from cutting an active bounded read. */
  pending(): boolean;
  /**
   * One bounded page for the captured run of this session's own context. `truncated` means the
   * receiver's bound was reached; it never means the library ended.
   */
  results(signal: AbortSignal): Promise<ArtifactReply<NativeResultsPage>>;
}

const failure = (code: string, accessDenied = false) => ({
  ok: false as const,
  code,
  ...(accessDenied ? { accessDenied: true as const } : {}),
});
/** Only a closed refusal code from the receiver travels; nothing usable is invented locally. */
const closedCode = (error: unknown) => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && /^[A-Z][A-Z_]*$/.test(code) ? code : null;
};
const refused = (error: unknown, cancelled: boolean) =>
  cancelled
    ? failure("CANCELLED")
    : error instanceof DocumentAccessUnavailable
      ? failure("SESSION_REFUSED", true)
      : failure(closedCode(error) ?? "NATIVE_RESULTS_UNAVAILABLE");

export function createNativeResultsAccess(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
): NativeResultsAccess {
  let active = 0;
  const documents = documentAccessTransport(credential, lifetime, fetcher);
  return {
    pending: () => active > 0,
    async results(caller) {
      active++;
      try {
        return await withActionDeadline([caller, lifetime], async (signal) => {
          const request = receiveNativeResultsRequest(
            new TextEncoder().encode("{}"),
          );
          const { value } = await documents.results(request, signal);
          signal.throwIfAborted();
          return { ok: true as const, value };
        });
      } catch (error) {
        return refused(error, caller.aborted || lifetime.aborted);
      } finally {
        active--;
      }
    },
  };
}
