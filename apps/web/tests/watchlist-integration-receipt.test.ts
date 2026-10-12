import { expect, it } from "vitest";
import { writeWatchlist } from "../src/features/portfolio/bill-tracker/watchlist-writer";
import {
  watchlistApi,
  watchlistClient,
  watchlistFixture,
  nativeIntelWatchlist,
} from "./watchlist-current-fixtures";

it.each([
  ["wrong targeting at expected version", { jurisdictions: ["US"] }],
  ["altered issue areas", { issueAreas: ["Health"] }],
  [
    "lost terms",
    { topics: [{ ...nativeIntelWatchlist.topics[0]!, terms: [] }] },
  ],
  [
    "fabricated topic rejection",
    {
      topics: [],
      rejected: {
        topics: [{ index: 0, label: "Sensors", reason: "A tag needs a name." }],
        terms: [],
      },
    },
  ],
  [
    "unrelated term rejection",
    {
      rejected: {
        topics: [],
        terms: [
          {
            topicLabel: "Other",
            termType: "agency",
            value: "xx",
            reason: "Term too short",
          },
        ],
      },
    },
  ],
] as const)("refuses Intel %s after one write", async (_label, change) => {
  const { view, draft } = watchlistFixture();
  const { api, calls } = watchlistApi((request) =>
    request.method === "PUT"
      ? { ...nativeIntelWatchlist, version: 8, ...change }
      : watchlistClient,
  );
  await expect(
    writeWatchlist(
      api,
      view,
      draft,
      () => {},
      new AbortController().signal,
      () => {},
    ),
  ).rejects.toMatchObject({ status: 502 });
  expect(calls.filter((call) => call.method === "PUT")).toHaveLength(1);
});

it("accepts Intel uppercase jurisdictions, trimmed labels and deduplicated terms", async () => {
  const { view, draft } = watchlistFixture();
  draft.jurisdictions = ["va"];
  draft.topics[0]!.label = " Sensors ";
  draft.topics[0]!.terms.push({ termType: "synonym", value: " radar " });
  const { api } = watchlistApi((request) =>
    request.method === "PUT"
      ? { ...nativeIntelWatchlist, version: 8 }
      : watchlistClient,
  );
  expect(
    (
      await writeWatchlist(
        api,
        view,
        draft,
        () => {},
        new AbortController().signal,
        () => {},
      )
    ).version,
  ).toBe(8);
});

it("accepts explained partial rejection while refusing a fabricated rejection of a valid term", async () => {
  for (const value of ["xx", "Radar"]) {
    const { view, draft } = watchlistFixture();
    draft.topics[0]!.terms.push({ termType: "agency", value });
    const rejected = {
      topics: [],
      terms: [
        {
          topicLabel: "Sensors",
          termType: "agency",
          value,
          reason: "Term too short",
        },
      ],
    };
    const { api } = watchlistApi((request) =>
      request.method === "PUT"
        ? { ...nativeIntelWatchlist, version: 8, rejected }
        : watchlistClient,
    );
    const result = writeWatchlist(
      api,
      view,
      draft,
      () => {},
      new AbortController().signal,
      () => {},
    );
    if (value === "xx") expect((await result).rejected).toEqual(rejected);
    else await expect(result).rejects.toMatchObject({ status: 502 });
  }
});

it("retains both saved topics on a rejected rename collision and rejects lost or changed preserved targeting", async () => {
  for (const damage of ["none", "lost", "changed"]) {
    const { view, draft } = watchlistFixture();
    const original = { ...view.record.topics[0]!, id: "original" };
    const destination = { ...original, id: "destination", label: "Other" };
    view.record.topics = [original, destination];
    draft.topics[0]!.label = "Other";
    const topics =
      damage === "lost"
        ? [destination]
        : [
            damage === "changed" ? { ...original, priority: "low" } : original,
            destination,
          ];
    const { api } = watchlistApi((request) =>
      request.method === "PUT"
        ? {
            ...nativeIntelWatchlist,
            version: 8,
            topics,
            rejected: {
              topics: [
                { index: 0, label: "Other", reason: "Duplicate tag name." },
              ],
              terms: [],
            },
          }
        : watchlistClient,
    );
    const result = writeWatchlist(
      api,
      view,
      draft,
      () => {},
      new AbortController().signal,
      () => {},
    );
    if (damage === "none") expect((await result).topics).toHaveLength(2);
    else await expect(result).rejects.toMatchObject({ status: 502 });
  }
});

it("accepts one explicit rejection for each repeated invalid term and rejects extra rejection entries", async () => {
  for (const count of [2, 3]) {
    const { view, draft } = watchlistFixture();
    draft.topics[0]!.terms.push(
      { termType: "agency", value: "xx" },
      { termType: "agency", value: " xx " },
    );
    const rejected = {
      topics: [],
      terms: Array.from({ length: count }, () => ({
        topicLabel: "Sensors",
        termType: "agency",
        value: "xx",
        reason: "Term too short",
      })),
    };
    const { api } = watchlistApi((request) =>
      request.method === "PUT"
        ? { ...nativeIntelWatchlist, version: 8, rejected }
        : watchlistClient,
    );
    const result = writeWatchlist(
      api,
      view,
      draft,
      () => {},
      new AbortController().signal,
      () => {},
    );
    if (count === 2) expect((await result).rejected).toEqual(rejected);
    else await expect(result).rejects.toMatchObject({ status: 502 });
  }
});
