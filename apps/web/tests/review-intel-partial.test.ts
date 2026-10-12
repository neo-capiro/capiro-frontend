import { expect, it } from "vitest";
import { writeWatchlist } from "../src/features/portfolio/bill-tracker/watchlist-writer";
import {
  watchlistFixture,
  watchlistApi,
  watchlistClient,
  nativeIntelWatchlist,
} from "./watchlist-current-fixtures";

it.each([true, false])("partial receipt retains AI=%s", async (retainAI) => {
  const { view, draft } = watchlistFixture();
  draft.topics[0]!.terms.push(
    { termType: "agency", value: "ai" },
    { termType: "agency", value: "AI" },
  );
  const receipt = {
    ...nativeIntelWatchlist,
    version: 8,
    topics: [
      {
        ...nativeIntelWatchlist.topics[0]!,
        terms: [
          ...nativeIntelWatchlist.topics[0]!.terms,
          ...(retainAI ? [{ termType: "agency", value: "AI" }] : []),
        ],
      },
    ],
    rejected: {
      topics: [],
      terms: [
        {
          topicLabel: "Sensors",
          termType: "agency",
          value: "ai",
          reason: '"ai" is too short to match safely.',
        },
      ],
    },
  };
  const { api } = watchlistApi((request) =>
    request.method === "PUT" ? receipt : watchlistClient,
  );
  const result = writeWatchlist(
    api,
    view,
    draft,
    () => {},
    new AbortController().signal,
    () => {},
  );
  if (retainAI) await expect(result).resolves.toMatchObject({ version: 8 });
  else await expect(result).rejects.toMatchObject({ status: 502 });
});
