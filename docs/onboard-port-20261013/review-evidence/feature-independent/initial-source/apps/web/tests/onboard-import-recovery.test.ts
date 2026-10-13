import { describe, expect, it, vi } from "vitest";
import { importClientSelection } from "../src/features/onboard/lib/import-client-selection";
import { CapiroApiError } from "../src/shared/capiro/http";

describe("interrupted onboarding import receipts", () => {
  it.each([
    new CapiroApiError(503, "Unavailable"),
    new DOMException("View replaced", "AbortError"),
  ])(
    "retains acknowledged first chunk and leaves later IDs unattempted after %s",
    async (cause) => {
      const receipt = {
        created: 1,
        items: [{ id: "c1", name: "Synthetic", ldaClientId: 1 }],
        skipped: [{ ldaClientId: 2, reason: "duplicate" }],
      };
      const chunk = vi
        .fn()
        .mockResolvedValueOnce(receipt)
        .mockRejectedValueOnce(cause);
      const failure = await importClientSelection(
        Array.from({ length: 250 }, (_, i) => i + 1),
        chunk,
      ).catch((error) => error);
      expect(failure.partial).toEqual({ ...receipt, capMessage: null });
      expect(failure.unknownIds).toEqual(
        Array.from({ length: 100 }, (_, i) => i + 101),
      );
      expect(failure.unattemptedIds).toEqual(
        Array.from({ length: 50 }, (_, i) => i + 201),
      );
      expect(failure.cause).toBe(cause);
      expect(chunk).toHaveBeenCalledTimes(2);
    },
  );
});
