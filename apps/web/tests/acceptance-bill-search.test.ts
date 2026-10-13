import { afterEach, beforeEach, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../src/shared/portfolio/api/http";
import {
  billSearchKey,
  currentBillSearch,
  matchesBillSearchSelection,
  assertBillSearchSelection,
  type BillSearchSelection,
} from "../src/features/portfolio/bill-tracker/current-data";

const bill = {
  billId: "tx-2025-hb1",
  displayNum: "HB 1",
  title: "Synthetic bill",
  stage: "introduced",
  probability: 0.5,
  jurisdiction: "TX",
};
const key = billSearchKey("client-a", "intelligence", "HB 1", ["TX"]);
let cache: QueryClient;
let selection: BillSearchSelection;
beforeEach(() => {
  cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  cache.setQueryData(key, [bill]);
  const current = currentBillSearch(cache, key);
  if (!current) throw new Error("Expected valid synthetic search setup");
  selection = { billId: bill.billId, source: current.source };
});
afterEach(() => cache.clear());
const admit = (value = selection) =>
  assertBillSearchSelection(cache, "client-a", "intelligence", value);

it("admits exactly the selected bill from the captured successful current search", () => {
  expect(currentBillSearch(cache, key)?.bills).toEqual([bill]);
  expect(
    matchesBillSearchSelection(currentBillSearch(cache, key), selection),
  ).toBe(true);
  expect(() => admit()).not.toThrow();
  expect(() => admit({ ...selection, billId: "another-bill" })).toThrow(
    "Search again",
  );
});

it("rejects a click captured before a refresh starts, then requires selection of its new revision", async () => {
  let release!: (rows: (typeof bill)[]) => void;
  const held = new Promise<(typeof bill)[]>((resolve) => {
    release = resolve;
  });
  const read = cache.fetchQuery({ queryKey: key, queryFn: () => held });
  try {
    expect(currentBillSearch(cache, key)).toBeNull();
    expect(() => admit()).toThrow("Search again");
  } finally {
    release([bill]);
    await read;
  }
  const recovered = currentBillSearch(cache, key);
  expect(recovered?.bills).toEqual([bill]);
  expect(() => admit()).toThrow("Search again");
  expect(() =>
    admit({ billId: bill.billId, source: recovered!.source }),
  ).not.toThrow();
});

it.each([403, 503])(
  "withholds cached successful data after a settled %i read failure",
  async (status) => {
    const error = new ApiError(status, "Synthetic search refusal");
    await expect(
      cache.fetchQuery({
        queryKey: key,
        queryFn: async () => {
          throw error;
        },
      }),
    ).rejects.toBe(error);
    expect(cache.getQueryData(key)).toEqual([bill]);
    expect(currentBillSearch(cache, key)).toBeNull();
    expect(() => admit()).toThrow("Search again");
  },
);

it("rejects invalidation before a scheduled render or new read", async () => {
  await cache.invalidateQueries({ queryKey: key, refetchType: "none" });
  expect(cache.getQueryData(key)).toEqual([bill]);
  expect(currentBillSearch(cache, key)).toBeNull();
  expect(() => admit()).toThrow("Search again");
});

it.each([
  { name: "empty result", rows: [] },
  { name: "different bill", rows: [{ ...bill, billId: "tx-2025-hb2" }] },
  { name: "duplicate identity", rows: [bill, bill] },
])("rejects exact selected membership for $name", ({ rows }) => {
  cache.setQueryData(key, rows);
  const current = currentBillSearch(cache, key)!;
  const newSelection = { billId: bill.billId, source: current.source };
  expect(matchesBillSearchSelection(current, newSelection)).toBe(false);
  expect(() => admit(newSelection)).toThrow("Search again");
});

it("does not transfer the selected source to another client or backend", () => {
  expect(() =>
    assertBillSearchSelection(cache, "client-b", "intelligence", selection),
  ).toThrow("Search again");
  expect(() =>
    assertBillSearchSelection(cache, "client-a", "core", selection),
  ).toThrow("Search again");
});

it.each([
  { key: billSearchKey("client-a", "intelligence", "HB 2", ["TX"]) },
  { key: billSearchKey("client-a", "intelligence", "HB 1", ["US"]) },
])(
  "does not carry selection into a different query or jurisdiction: %j",
  ({ key: otherKey }) => {
    cache.setQueryData(otherKey, [bill]);
    const other = currentBillSearch(cache, otherKey);
    expect(other?.source.revision).toBe(selection.source.revision);
    expect(matchesBillSearchSelection(other, selection)).toBe(false);
  },
);

it("rejects missing or invalid cached search data instead of interpreting it as a current result", () => {
  cache.removeQueries({ queryKey: key });
  expect(currentBillSearch(cache, key)).toBeNull();
  expect(() => admit()).toThrow("Search again");
  cache.setQueryData(key, [{ billId: bill.billId }]);
  expect(currentBillSearch(cache, key)).toBeNull();
  expect(() => admit()).toThrow("Search again");
});

it("does not reuse a selection after its query is removed and recreated with the same revision", () => {
  cache.removeQueries({ queryKey: key });
  cache.setQueryData(key, [bill]);
  const replacement = currentBillSearch(cache, key)!;
  expect(replacement.source.revision).toBe(selection.source.revision);
  expect(replacement.bills).toEqual([bill]);
  expect(() => admit()).toThrow("Search again");
  expect(() =>
    admit({ billId: bill.billId, source: replacement.source }),
  ).not.toThrow();
});
