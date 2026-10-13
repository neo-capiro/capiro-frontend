import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import { profileReadKey } from "../src/features/portfolio/client-profile/profile-keys";
import { currentProfileActor } from "../src/features/portfolio/client-profile/profile-access";
import {
  currentSubmissionView,
  assertSubmissionView,
} from "../src/features/portfolio/client-profile/past-performance/submission-view";
import { createRemovalReview } from "../src/features/portfolio/client-profile/past-performance/useSubmissionRemoval";
import {
  loadSubmissions,
  submissionKey,
} from "../src/features/portfolio/client-profile/past-performance/queries";
import { submissionSchema } from "../src/features/portfolio/client-profile/past-performance/contracts";

const clientId = "10000000-0000-4000-8000-000000000001";
const tenantId = "10000000-0000-4000-8000-000000000002";
const userId = "10000000-0000-4000-8000-000000000003";
const historyId = "10000000-0000-4000-8000-000000000004";
const capabilityId = "10000000-0000-4000-8000-000000000005";
const identity = {
  user: { id: userId, email: null },
  tenant: { id: tenantId, name: "Synthetic tenant" },
  role: "standard_user",
};
const client = {
  id: clientId,
  tenantId,
  name: "Current saved client",
  profileStatus: "ACTIVE",
  status: "ACTIVE",
};
const submission = submissionSchema.parse({
  id: historyId,
  clientId,
  tenantId,
  capabilityId,
  fiscalYear: "FY26",
  title: "Saved submission",
  meta: "Original submission context",
  outcome: "Recorded outcome",
  outcomeType: "in_progress",
  notes: "Original qualification notes",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
});

function fixture() {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  cache.setQueryData(["identity"], identity);
  const actor = currentProfileActor(cache)!;
  const clientKey = profileReadKey(clientId, "saved-client", actor);
  const historyKey = submissionKey(clientId, actor);
  cache.setQueryData(clientKey, client);
  cache.setQueryData(historyKey, [submission]);
  return { cache, clientKey, historyKey };
}

describe("current saved-submission projection", () => {
  it("uses the exact native client name and preserves all stored history fields", () => {
    const { cache } = fixture();
    const view = currentSubmissionView(cache, clientId)!;
    expect(view.clientName).toBe(client.name);
    expect(view.rows).toEqual([submission]);
    expect(view.rows[0]?.capabilityId).toBe(capabilityId);
    expect(assertSubmissionView(cache, view)).toEqual(view);
  });

  for (const source of ["clientKey", "historyKey"] as const) {
    for (const state of ["invalidated", "failed", "fetching"] as const) {
      it(`withholds retained rows while the ${source} read is ${state}`, () => {
        const f = fixture();
        const view = currentSubmissionView(f.cache, clientId)!;
        const query = f.cache
          .getQueryCache()
          .find({ queryKey: f[source], exact: true })!;
        if (state === "invalidated")
          void f.cache.invalidateQueries({
            queryKey: f[source],
            exact: true,
            refetchType: "none",
          });
        if (state === "failed")
          query.setState({
            status: "error",
            error: new ApiError(403, "Denied"),
          });
        if (state === "fetching") query.setState({ fetchStatus: "fetching" });
        expect(f.cache.getQueryData(f[source])).toBeDefined();
        expect(currentSubmissionView(f.cache, clientId)).toBeUndefined();
        expect(() => assertSubmissionView(f.cache, view)).toThrow();
      });
    }
  }

  it("refuses archived, cross-client and cross-tenant saved client records", () => {
    for (const change of [
      { status: "archived" },
      { status: "ARCHIVED" },
      { id: capabilityId },
      { tenantId: capabilityId },
    ]) {
      const { cache, clientKey } = fixture();
      cache.setQueryData(clientKey, { ...client, ...change });
      expect(currentSubmissionView(cache, clientId)).toBeUndefined();
    }
  });

  it("withholds histories from another role or actor cache", () => {
    const { cache } = fixture();
    cache.setQueryData(["identity"], { ...identity, role: "viewer" });
    expect(currentSubmissionView(cache, clientId)).toBeUndefined();
    cache.setQueryData(["identity"], {
      ...identity,
      user: { id: capabilityId, email: null },
    });
    expect(currentSubmissionView(cache, clientId)).toBeUndefined();
  });

  it("preserves the native 200-row limit and rejects duplicate history identities", async () => {
    const rows = Array.from({ length: 200 }, (_, index) => ({
      ...submission,
      id: `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    }));
    const api = (data: unknown) =>
      createApiClient(async () => Response.json(data));
    expect(await loadSubmissions(api(rows), clientId, tenantId)).toHaveLength(
      200,
    );
    await expect(
      loadSubmissions(api([...rows, submission]), clientId, tenantId),
    ).rejects.toThrow("unexpected response");
    await expect(
      loadSubmissions(api([submission, submission]), clientId, tenantId),
    ).rejects.toThrow("unexpected response");
  });
});

describe("selected removal review and unknown dispatch fence", () => {
  for (const source of ["identity", "clientKey", "historyKey"] as const) {
    it(`permanently closes a review when ${source} is invalidated and restored synchronously`, () => {
      const f = fixture();
      const review = createRemovalReview(
        f.cache,
        currentSubmissionView(f.cache, clientId)!,
        historyId,
      );
      const key = source === "identity" ? ["identity"] : f[source];
      const saved = structuredClone(f.cache.getQueryData(key));
      void f.cache.invalidateQueries({
        queryKey: key,
        exact: true,
        refetchType: "none",
      });
      f.cache.setQueryData(key, saved);
      expect(currentSubmissionView(f.cache, clientId)).toBeDefined();
      expect(review.signal.aborted).toBe(true);
      expect(() => review.dispatch()).toThrow();
      expect(review.uncertain()).toBe(false);
    });
  }

  it("requires a fresh selection after a newer successful history revision", () => {
    const { cache, historyKey } = fixture();
    const view = currentSubmissionView(cache, clientId)!;
    const old = createRemovalReview(cache, view, historyId);
    cache.setQueryData(historyKey, [
      { ...submission, title: "Changed current title" },
    ]);
    expect(old.signal.aborted).toBe(true);
    expect(() => old.current()).toThrow();
    const next = createRemovalReview(
      cache,
      currentSubmissionView(cache, clientId)!,
      historyId,
    );
    expect(next.current().item.title).toBe("Changed current title");
    next.close();
  });

  it("retains an uncertain DELETE across view disposal and a new review in the same session", () => {
    const { cache } = fixture();
    const view = currentSubmissionView(cache, clientId)!;
    const first = createRemovalReview(cache, view, historyId);
    first.dispatch();
    first.close();
    const next = createRemovalReview(cache, view, historyId);
    expect(next.uncertain()).toBe(true);
    expect(() => next.dispatch()).toThrow("will not be resent");
    expect(() => first.confirm()).toThrow();
    expect(next.uncertain()).toBe(true);
    next.close();
  });

  it("permits a reviewed retry only after a current definitive rejection", () => {
    const { cache } = fixture();
    const review = createRemovalReview(
      cache,
      currentSubmissionView(cache, clientId)!,
      historyId,
    );
    review.dispatch();
    review.reject(new ApiError(400, "Rejected"));
    expect(review.uncertain()).toBe(false);
    expect(() => review.dispatch()).not.toThrow();
    review.reject(new ApiError(502, "Unexpected receipt"));
    expect(review.uncertain()).toBe(true);
    expect(() => review.dispatch()).toThrow("will not be resent");
    review.close();
  });

  it("cannot clear a dispatched fence after the actor changes", () => {
    const { cache } = fixture();
    const view = currentSubmissionView(cache, clientId)!;
    const review = createRemovalReview(cache, view, historyId);
    review.dispatch();
    cache.setQueryData(["identity"], {
      ...identity,
      user: { id: capabilityId, email: null },
    });
    expect(() => review.reject(new ApiError(403, "Denied"))).toThrow();
    cache.setQueryData(["identity"], identity);
    const next = createRemovalReview(
      cache,
      currentSubmissionView(cache, clientId)!,
      historyId,
    );
    expect(next.uncertain()).toBe(true);
    next.close();
  });

  it("keeps uncertainty local to the actual reader session and requested row", () => {
    const f = fixture();
    const review = createRemovalReview(
      f.cache,
      currentSubmissionView(f.cache, clientId)!,
      historyId,
    );
    review.dispatch();
    review.close();
    const other = fixture();
    const otherReview = createRemovalReview(
      other.cache,
      currentSubmissionView(other.cache, clientId)!,
      historyId,
    );
    expect(otherReview.uncertain()).toBe(false);
    otherReview.dispatch();
    otherReview.confirm();
    expect(otherReview.uncertain()).toBe(false);
    otherReview.close();
  });
});
