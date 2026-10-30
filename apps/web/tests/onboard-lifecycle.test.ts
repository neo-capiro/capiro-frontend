import { describe, expect, it, vi } from "vitest";
import { routeForState } from "../src/features/onboard/lib/funnel-routes";
import { trialChargeDateLabel } from "../src/features/onboard/lib/dates";
import { importClientSelection } from "../src/features/onboard/lib/import-client-selection";
import { CapiroApiError } from "../src/shared/capiro/http";

describe("preserved onboarding local lifecycle", () => {
  it("routes an unregistered identity, verified account, and completed payment to their actual next step", () => {
    expect(routeForState(undefined)).toBe("/register");
    expect(routeForState("registered")).toBe("/verify");
    expect(routeForState("verified")).toBe("/plan");
    expect(routeForState("legal_accepted")).toBe("/billing");
    expect(routeForState("payment_on_file")).toBe("/admins");
  });
  it.each(["org_setup", "provisioning", "provisioned", "failed"] as const)(
    "keeps %s at the provisioning bridge",
    (state) => expect(routeForState(state)).toBe("/confirm"),
  );
  it("retains the original day31 calendar-date rule across a month boundary", () => {
    expect(trialChargeDateLabel(new Date(2026, 0, 31, 12))).toBe(
      "March 3, 2026",
    );
  });
  it("imports selections in sequential100-ID chunks and aggregates actual receipts", async () => {
    const ids = Array.from({ length: 205 }, (_, index) => index + 1);
    const chunk = vi.fn(async (selected: number[]) => ({
      created: selected.length,
      items: selected.map((id) => ({
        id: `client-${id}`,
        name: `Synthetic ${id}`,
        ldaClientId: id,
      })),
      skipped: [],
    }));
    const result = await importClientSelection(ids, chunk);
    expect(chunk.mock.calls.map(([selected]) => selected.length)).toEqual([
      100, 100, 5,
    ]);
    expect(chunk.mock.calls.flatMap(([selected]) => selected)).toEqual(ids);
    expect(result.created).toBe(205);
    expect(result.items.at(-1)?.ldaClientId).toBe(205);
    expect(result.capMessage).toBeNull();
  });
  it("preserves successful import receipts and does not dispatch remaining chunks after402", async () => {
    const first = {
      created: 1,
      items: [{ id: "client-1", name: "Synthetic", ldaClientId: 1 }],
      skipped: [{ ldaClientId: 2, reason: "already imported" }],
    };
    const chunk = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockRejectedValueOnce(new CapiroApiError(402, "Profile limit reached"));
    const result = await importClientSelection(
      Array.from({ length: 250 }, (_, i) => i + 1),
      chunk,
    );
    expect(result).toEqual({ ...first, capMessage: "Profile limit reached" });
    expect(chunk).toHaveBeenCalledTimes(2);
  });
  it("reports a sent-but-unconfirmed first chunk as unknown, never as unattempted", async () => {
    const error = new DOMException("Scope replaced", "AbortError");
    const chunk = vi.fn().mockRejectedValue(error);
    const failure = await importClientSelection(
      Array.from({ length: 201 }, (_, i) => i),
      chunk,
    ).catch((caught) => caught);
    expect(failure).toMatchObject({
      name: "InterruptedImport",
      unknownIds: Array.from({ length: 100 }, (_, i) => i),
      unattemptedIds: Array.from({ length: 101 }, (_, i) => i + 100),
      cause: error,
    });
    expect(chunk).toHaveBeenCalledTimes(1);
  });
  it("does not pretend a failed first chunk completed or was never sent", async () => {
    const error = new CapiroApiError(503, "Unavailable");
    const chunk = vi.fn().mockRejectedValue(error);
    const failure = await importClientSelection([1, 2], chunk).catch(
      (caught) => caught,
    );
    expect(failure).toMatchObject({
      name: "InterruptedImport",
      unknownIds: [1, 2],
      unattemptedIds: [],
      cause: error,
    });
  });
});
