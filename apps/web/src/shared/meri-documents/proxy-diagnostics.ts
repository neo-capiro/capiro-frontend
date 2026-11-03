/**
 * Optional transport diagnostic only: not a product DTO, a request identity or any authority. One closed
 * line per document proxy attempt, so a refused file card can be attributed to the stage that ended it
 * (this edge's own request, configuration or session admission, an upstream that never answered, or an
 * upstream answer this edge could not admit) without reading a header, body, credential or identifier.
 *
 * It shares the closed vocabulary of the conversation/session transport recorder (stage, outcome, status,
 * upstreamStatus, bounded lines per window) and is a separate module only because that recorder is not on
 * this base; the two fold into one factory once both are on main. A line never claims a cause: `stage`
 * names this edge's last reached step and `upstreamStatus` names what the service answered, nothing more.
 */
export const documentProxyDiagnosticEvent = "MERI_DOCUMENT_FE";
/** The last stage a document attempt reached on this edge. */
export type DocumentProxyStage =
  | "request"
  | "configuration"
  | "session"
  | "fetch"
  | "receive";
type Outcome = "response" | "failure";
/** What the proxy may say about one attempt; the recorder never widens this. */
export type DocumentProxyDiagnostic = {
  stage(value: DocumentProxyStage): void;
  received(status: number): void;
  finish(status: number, outcome: Outcome): void;
};
export type BeginDocumentProxyDiagnostic = (
  operation?: string,
) => DocumentProxyDiagnostic | undefined;
const stages: readonly string[] = [
  "request",
  "configuration",
  "session",
  "fetch",
  "receive",
];
const outcomes: readonly string[] = ["response", "failure"];
/** Closed operation grammar: the public documents route itself, never a version, selector or query. */
const operations = /^\/api\/documents\/[a-z][a-z-]*$/u;

/** At most 20 lines and one suppression marker per minute per process; a diagnostic never throws. */
export function createDocumentProxyDiagnostics({
  write = (line: string) => console.warn(line),
  now = () => Date.now(),
  event = documentProxyDiagnosticEvent,
  windowMs = 60_000,
  limit = 20,
} = {}): BeginDocumentProxyDiagnostic {
  let windowStart = -Infinity,
    count = 0;
  return (operation?: string) => {
    let stage: DocumentProxyStage = "request",
      upstreamStatus = 0,
      finished = false;
    const label =
      typeof operation === "string" && operations.test(operation)
        ? operation
        : undefined;
    return {
      stage(value: DocumentProxyStage) {
        if (!finished && stages.includes(value)) stage = value;
      },
      received(status: number) {
        if (
          !finished &&
          Number.isInteger(status) &&
          status >= 100 &&
          status <= 599
        )
          upstreamStatus = status;
      },
      finish(status: number, outcome: Outcome) {
        if (finished) return;
        finished = true;
        try {
          if (
            !Number.isInteger(status) ||
            status < 100 ||
            status > 599 ||
            !outcomes.includes(outcome)
          )
            return;
          const at = now();
          if (!Number.isFinite(at)) return;
          if (at - windowStart >= windowMs) {
            windowStart = at;
            count = 0;
          }
          if (count > limit) return;
          if (count++ === limit) {
            write(`${event}_SUPPRESSED`);
            return;
          }
          write(
            JSON.stringify({
              event,
              ...(label ? { operation: label } : {}),
              stage,
              outcome:
                outcome === "failure"
                  ? "failure"
                  : upstreamStatus
                    ? "upstream_response"
                    : "local_response",
              status,
              upstreamStatus,
            }),
          );
        } catch {
          /* Diagnostic failure cannot affect transport. */
        }
      },
    };
  };
}

export const beginDocumentProxyDiagnostic = createDocumentProxyDiagnostics();
