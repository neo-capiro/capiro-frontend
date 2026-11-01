import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { trackerReaderKey } from "../src/features/portfolio/bill-tracker/current-data";
import { boardKey } from "../src/features/portfolio/bill-tracker/queries";
import {
  metricBoardSource,
  trackerMetricOptions,
} from "../src/features/portfolio/bill-tracker/useTrackerMetrics";
import {
  metricClient,
  materialFixture,
  coverageFixture,
} from "./tracker-metrics-fixtures";
function fixture(backend: "core" | "intelligence" = "intelligence") {
  const cache = new QueryClient();
  cache.setQueryData(["identity"], {
    user: { id: "synthetic-user", email: null },
    tenant: { id: "synthetic-tenant", name: "Synthetic" },
    role: "standard_user",
  });
  const scope = trackerReaderKey(cache),
    key = [...boardKey(metricClient, backend), scope];
  cache.setQueryData(key, { pages: [], pageParams: [] });
  return {
    cache,
    scope,
    key,
    source: metricBoardSource(cache, metricClient, backend, scope)!,
  };
}
const signal = () => new AbortController().signal;
describe("independent metrics read and lifetime", () => {
  it.each(["core", "intelligence"] as const)(
    "selects only actual %s material transport; coverage stays Core",
    async (backend) => {
      const { cache, scope, source } = fixture(backend);
      const fetcher = vi.fn(async (url: RequestInfo | URL) =>
        Response.json(
          String(url).includes("material-changes")
            ? materialFixture(backend)
            : coverageFixture(backend),
        ),
      );
      const options = trackerMetricOptions(
        createApiClient(fetcher),
        cache,
        metricClient,
        backend,
        scope,
        1,
        source,
      );
      await options.material.queryFn({ signal: signal() });
      await options.coverage.queryFn({ signal: signal() });
      expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
        `/api/backend/${backend}/${backend === "core" ? "intelligence/" : ""}clients/${metricClient}/tracker/material-changes`,
        `/api/backend/core/legiwatch/live-hearings/clients/${metricClient}/coverage?trackerBackend=${backend}`,
      ]);
    },
  );
  it.each(["gate", "board"])(
    "refuses missing %s before any GET, including manual query invocation",
    async (missing) => {
      const { cache, scope, source } = fixture();
      const fetcher = vi.fn();
      const options = trackerMetricOptions(
        createApiClient(fetcher),
        cache,
        metricClient,
        "intelligence",
        scope,
        missing === "gate" ? undefined : 1,
        missing === "board" ? undefined : source,
      );
      expect(options.material.enabled).toBe(false);
      expect(options.coverage.enabled).toBe(false);
      await expect(
        options.material.queryFn({ signal: signal() }),
      ).rejects.toThrow();
      await expect(
        options.coverage.queryFn({ signal: signal() }),
      ).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each(["actor", "board", "revision", "invalidated", "abort"])(
    "rejects both late responses after %s changes",
    async (kind) => {
      for (const metric of ["material", "coverage"] as const) {
        const { cache, scope, key, source } = fixture();
        const controller = new AbortController();
        const fetcher = vi.fn(async () => {
          if (kind === "actor")
            cache.setQueryData(["identity"], {
              user: { id: "other", email: null },
            });
          if (kind === "board")
            cache.removeQueries({ queryKey: key, exact: true });
          if (kind === "revision")
            cache.setQueryData(key, { pages: [], pageParams: [] });
          if (kind === "invalidated")
            await cache.invalidateQueries({
              queryKey: key,
              exact: true,
              refetchType: "none",
            });
          if (kind === "abort") controller.abort();
          return Response.json(
            metric === "material" ? materialFixture() : coverageFixture(),
          );
        });
        const options = trackerMetricOptions(
          createApiClient(fetcher),
          cache,
          metricClient,
          "intelligence",
          scope,
          1,
          source,
        );
        await expect(
          options[metric].queryFn({ signal: controller.signal }),
        ).rejects.toThrow();
      }
    },
  );
  it("keeps material failure independent of successful coverage, without alternate-owner fallback", async () => {
    const { cache, scope, source } = fixture();
    const fetcher = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes("material-changes")
        ? Response.json({ message: "unavailable" }, { status: 503 })
        : Response.json(coverageFixture()),
    );
    const options = trackerMetricOptions(
      createApiClient(fetcher),
      cache,
      metricClient,
      "intelligence",
      scope,
      1,
      source,
    );
    await expect(
      options.material.queryFn({ signal: signal() }),
    ).rejects.toThrow();
    expect(
      (await options.coverage.queryFn({ signal: signal() })).overall.status,
    ).toBe("NOT_CONFIGURED");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("changes metric keys only after a new admitted board revision, without self-refetch loops", async () => {
    const { cache, scope, key, source } = fixture();
    const fetcher = vi.fn(async () => Response.json(materialFixture()));
    const api = createApiClient(fetcher);
    const first = trackerMetricOptions(
      api,
      cache,
      metricClient,
      "intelligence",
      scope,
      1,
      source,
    );
    const observer = new QueryObserver(cache, first.material);
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    );
    const same = trackerMetricOptions(
      api,
      cache,
      metricClient,
      "intelligence",
      scope,
      1,
      metricBoardSource(cache, metricClient, "intelligence", scope),
    );
    observer.setOptions(same.material);
    expect(same.material.queryKey).toEqual(first.material.queryKey);
    expect(fetcher).toHaveBeenCalledOnce();
    await cache.invalidateQueries({
      queryKey: key,
      exact: true,
      refetchType: "none",
    });
    expect(
      metricBoardSource(cache, metricClient, "intelligence", scope),
    ).toBeUndefined();
    cache.setQueryData(key, { pages: [], pageParams: [] });
    const next = trackerMetricOptions(
      api,
      cache,
      metricClient,
      "intelligence",
      scope,
      1,
      metricBoardSource(cache, metricClient, "intelligence", scope),
    );
    expect(next.material.queryKey).not.toEqual(first.material.queryKey);
    observer.setOptions(next.material);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    unsubscribe();
    cache.clear();
  });
});

it("does not reuse an admitted source for another client or backend", async () => {
  const { cache, scope, source } = fixture();
  const fetcher = vi.fn();
  const api = createApiClient(fetcher);
  for (const [client, backend] of [
    ["other-client", "intelligence"],
    [metricClient, "core"],
  ] as const) {
    const options = trackerMetricOptions(
      api,
      cache,
      client,
      backend,
      scope,
      1,
      source,
    );
    await expect(
      options.material.queryFn({ signal: signal() }),
    ).rejects.toThrow();
    await expect(
      options.coverage.queryFn({ signal: signal() }),
    ).rejects.toThrow();
  }
  expect(fetcher).not.toHaveBeenCalled();
});
