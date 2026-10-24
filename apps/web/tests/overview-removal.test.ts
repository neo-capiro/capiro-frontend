import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient, ApiError } from "../src/shared/portfolio/api/http";

import {
  currentClientWriter,
  assertClientWriter,
  ambiguousClientWrite,
} from "../src/features/portfolio/client-profile/quick-log/authority";

import { removeSubmission } from "../src/features/portfolio/client-profile/past-performance/actions";
import {
  loadSubmissions,
  submissionKey,
} from "../src/features/portfolio/client-profile/past-performance/queries";
import { submissionSchema } from "../src/features/portfolio/client-profile/past-performance/contracts";
const clientId = "10000000-0000-4000-8000-000000000001";
const userId = "10000000-0000-4000-8000-000000000002";
const tenantId = "10000000-0000-4000-8000-000000000003";
const id = "10000000-0000-4000-8000-000000000004";
const actor = { userId, tenantId };
it("only explicit known rejection permits a reviewed retry; ambiguous failures freeze", () => {
  expect(ambiguousClientWrite(new ApiError(400, "Rejected"))).toBe(false);
  expect(ambiguousClientWrite(new ApiError(502, "Wrong receipt"))).toBe(true);
  expect(ambiguousClientWrite(new Error("Lost response"))).toBe(true);
});
const submission = submissionSchema.parse({
  id,
  clientId,
  tenantId,
  capabilityId: null,
  fiscalYear: "FY26",
  title: "Saved submission",
  meta: "Saved meta",
  outcome: "Saved outcome",
  outcomeType: "in_progress",
  notes: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
});
function harness(reply: (method: string, url: string) => unknown) {
  const calls: string[] = [];
  const fetcher = vi.fn(async (url, options) => {
    const method = options?.method ?? "GET";
    calls.push(`${method} ${url}`);
    return new Response(JSON.stringify(reply(method, String(url))), {
      status: 200,
    });
  }) as unknown as typeof fetch;
  return { api: createApiClient(fetcher), calls };
}
describe("saved submission removal", () => {
  it("validates tenant/client rows and uses exact history inverse with deleted receipt", async () => {
    const h = harness((method) =>
      method === "GET" ? [submission] : { deleted: true },
    );
    await removeSubmission(
      h.api,
      submission,
      () => {},
      new AbortController().signal,
      () => {},
    );
    expect(h.calls.at(-1)).toBe(
      `DELETE /api/backend/core/clients/${clientId}/history/${id}`,
    );
  });
  it("rejects cross-client or tenant history before presentation", async () => {
    for (const field of ["clientId", "tenantId"]) {
      const h = harness(() => [{ ...submission, [field]: id }]);
      await expect(loadSubmissions(h.api, clientId, tenantId)).rejects.toThrow(
        "unexpected response",
      );
    }
  });
  it("preserves a changed submission and never sends delete", async () => {
    const h = harness(() => [{ ...submission, outcome: "Changed outcome" }]);
    await expect(
      removeSubmission(
        h.api,
        submission,
        () => {},
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("changed");
    expect(h.calls).toHaveLength(1);
  });
  it("rejects a successful-looking incompatible delete response", async () => {
    const h = harness((method) =>
      method === "GET" ? [submission] : { ok: true },
    );
    await expect(
      removeSubmission(
        h.api,
        submission,
        () => {},
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow("unexpected response");
  });
});
it("actor cache invalidation/error/switch fails closed and scopes saved history", () => {
  const cache = new QueryClient();
  const identity = {
    user: { id: userId, email: null },
    tenant: { id: tenantId, name: "Test" },
    role: "standard_user",
  };
  cache.setQueryData(["identity"], identity);
  expect(currentClientWriter(cache)).toEqual(actor);
  expect(submissionKey(clientId, actor)).not.toEqual(
    submissionKey(clientId, { ...actor, userId: id }),
  );
  void cache.invalidateQueries({ queryKey: ["identity"] });
  expect(() => assertClientWriter(cache, actor)).toThrow();
  cache.setQueryData(["identity"], { ...identity, user: { id, email: null } });
  expect(() => assertClientWriter(cache, actor)).toThrow();
  cache
    .getQueryCache()
    .find({ queryKey: ["identity"] })
    ?.setState({ error: new Error("Expired") });
  expect(currentClientWriter(cache)).toBeUndefined();
});
