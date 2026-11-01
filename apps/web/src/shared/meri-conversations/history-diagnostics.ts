import { randomBytes } from "node:crypto";

// Optional transport diagnostic only, not a product DTO, request ID or authority.
// Control admits this exact grammar; the proxy never forwards a browser value.
export const historyTraceHeader = "x-meri-history-trace";
type Stage = "session" | "request" | "configuration" | "fetch" | "receive";
type Outcome = "response" | "failure";
const stages: readonly string[] = [
  "session",
  "request",
  "configuration",
  "fetch",
  "receive",
];
const outcomes: readonly string[] = ["response", "failure"];

/** One terminal line per read; at most 20 lines + one suppression marker/minute/process. */
export function createHistoryTransportDiagnostics({
  write = (line: string) => console.warn(line),
  now = () => performance.now(),
  newTrace = () => `h1_${randomBytes(16).toString("hex")}`,
} = {}) {
  let windowStart = -Infinity,
    count = 0;
  return () => {
    try {
      const trace = newTrace();
      if (
        typeof trace !== "string" ||
        trace.length !== 35 ||
        !/^h1_[0-9a-f]{32}$/.test(trace)
      )
        return undefined;
      let stage: Stage = "request",
        upstreamStatus = 0,
        finished = false;
      return {
        trace,
        stage(value: Stage) {
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
            if (at - windowStart >= 60_000) {
              windowStart = at;
              count = 0;
            }
            if (count > 20) return;
            if (count++ === 20) {
              write("MERI_HISTORY_FE_SUPPRESSED");
              return;
            }
            const result =
              outcome === "failure"
                ? outcome
                : upstreamStatus
                  ? "upstream_response"
                  : "local_response";
            write(
              JSON.stringify({
                event: "MERI_HISTORY_FE",
                trace,
                stage,
                outcome: result,
                status,
                upstreamStatus,
              }),
            );
          } catch {
            /* Diagnostic failure cannot affect transport. */
          }
        },
      };
    } catch {
      return undefined;
    }
  };
}

export const beginHistoryTransportDiagnostic =
  createHistoryTransportDiagnostics();
