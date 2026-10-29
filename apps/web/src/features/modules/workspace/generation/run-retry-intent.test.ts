// The deliberate paid retry versus the check/re-read, at the planner.
//
// The two acts reach the SAME route and the same run, so the only thing that
// keeps them apart is the caller's own body: the deliberate retry carries Core's
// closed paid acknowledgement (`intent: "retry-failed-units"`) and the check
// never does. These cases pin that difference and pin that the paid intent is
// never inferred from a run's status.
import { describe, expect, it } from "vitest";

import { planRunRetry } from "./run-retry";

const RECEIPT = { runId: "run-1" } as never;

const args = (status: string) => ({
  activated: true,
  capability: { enabled: true },
  record: { receipt: RECEIPT } as never,
  run: { runId: "run-1", status } as never,
});

describe("workspace run retry: deliberate paid retry vs check", () => {
  it("carries the paid intent for a run that failed, from the retry control only", () => {
    const plan = planRunRetry({ ...args("failed"), kind: "retry-failed-units" });
    expect(plan).toMatchObject({
      kind: "request",
      operation: "workspace.generation.run.retryFailed",
      input: {
        params: { runId: "run-1" },
        body: { workflow: "native-retained", intent: "retry-failed-units" },
      },
    });
  });

  it("retries a partially complete run too, and never a run with nothing failed", () => {
    expect(
      planRunRetry({ ...args("partial"), kind: "retry-failed-units" }),
    ).toMatchObject({ kind: "request" });
    for (const status of ["queued", "active", "complete", "cancelled", "awaiting-current-access"]) {
      expect(planRunRetry({ ...args(status), kind: "retry-failed-units" })).toMatchObject({
        kind: "refusal",
      });
    }
  });

  it("never carries the paid intent on the check/re-read plan", () => {
    const live = planRunRetry(args("active"));
    expect(live).toMatchObject({ kind: "request" });
    expect(JSON.stringify(live)).not.toContain("intent");
    // A resolved run is not silently retried by the check: it is reported, and the
    // separate deliberate control is named as the act that would generate again.
    const resolved = planRunRetry(args("failed"));
    expect(resolved).toMatchObject({ kind: "refusal" });
    expect(JSON.stringify(resolved)).toContain("does not generate");
    expect(JSON.stringify(resolved)).not.toContain("intent");
  });
});
