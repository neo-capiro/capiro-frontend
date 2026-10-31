import { expect, it } from "vitest";
import { directoryOperations } from "../src/shared/capiro/operations/directory";
import {
  directoryMetricState,
  directorySnapshotNotice,
} from "../src/features/modules/hub/hub-directory-metrics";

const observation = {
  metric: "directory_contacts",
  definitionVersion: 1,
  scope: "global_catalog",
  count: 1201,
  complete: true,
  capped: false,
  observedAt: "2026-10-31T10:00:00.000Z",
  snapshot: {
    sourceId: "synthetic/catalog",
    state: "current",
    loadedAt: "2026-10-31T09:00:00.000Z",
    checkedAt: "2026-10-31T09:00:00.000Z",
    publisherObservedAt: null,
  },
};

it("uses the producer count without records or a client filter", () => {
  const operation = directoryOperations["directory.metrics"];
  expect(operation.path).toBe("/directory/metrics");
  expect(operation.request.safeParse({}).success).toBe(true);
  expect(
    operation.request.safeParse({ query: { clientId: "selected" } }).success,
  ).toBe(false);
  expect(directoryMetricState({ loading: false, data: observation })).toEqual({
    status: "available",
    value: 1201,
    observedAt: observation.observedAt,
    stale: false,
  });
});

it("preserves complete zero and unknown publisher freshness", () => {
  const data = { ...observation, count: 0 };
  expect(directoryMetricState({ loading: false, data })).toMatchObject({
    status: "available",
    value: 0,
  });
  expect(directorySnapshotNotice(data)).toContain(
    "Publisher freshness unknown",
  );
});

it.each(["previous_fallback", "stale_cache", "unknown"])(
  "discloses %s without inventing an SLA",
  (state) => {
    const data = {
      ...observation,
      snapshot: { ...observation.snapshot, state },
    };
    expect(directoryMetricState({ loading: false, data })).toMatchObject({
      status: "available",
      stale: state === "stale_cache",
    });
    expect(directorySnapshotNotice(data)).toContain(
      {
        previous_fallback: "Previous snapshot fallback",
        stale_cache: "Stale cached snapshot",
        unknown: "Snapshot selection unconfirmed",
      }[state],
    );
  },
);

it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity])(
  "withholds invalid count %s",
  (count) => {
    expect(
      directoryMetricState({ loading: false, data: { ...observation, count } })
        .status,
    ).toBe("unavailable");
  },
);

it.each([
  { complete: false },
  { capped: true },
  { scope: "client" },
  { observedAt: "invalid" },
])("withholds an unverified observation %j", (patch) => {
  expect(
    directoryMetricState({ loading: false, data: { ...observation, ...patch } })
      .status,
  ).toBe("unavailable");
});

it.each([401, 403, 500])("drops old results on failure %s", (status) => {
  const error = Object.assign(Error("private source detail"), { status });
  const result = directoryMetricState({
    loading: false,
    data: observation,
    error,
  });
  expect(result.status).toBe(status === 500 ? "unavailable" : "denied");
  expect(JSON.stringify(result)).not.toContain("1201");
  expect(JSON.stringify(result)).not.toContain("private source detail");
});

it("withholds previous data while refreshing or absent", () => {
  expect(directoryMetricState({ loading: true, data: observation })).toEqual({
    status: "loading",
  });
  expect(directoryMetricState({ loading: false }).status).toBe("unavailable");
});
