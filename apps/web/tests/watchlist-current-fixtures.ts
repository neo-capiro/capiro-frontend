import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import type { TrackerBackend } from "../src/shared/portfolio/config/config";
import { profileReadKey } from "../src/features/portfolio/client-profile/read-public";
import {
  currentWatchlistReader,
  currentWatchlistView,
  watchlistKey,
  taxonomyKey,
  jurisdictionsKey,
} from "../src/features/portfolio/bill-tracker/watchlist-source";
import {
  coreWatchlistSchema,
  fromCoreWatchlist,
  watchlistDraft,
} from "../src/features/portfolio/bill-tracker/watchlist-contracts";

export const watchlistClientId = "10000000-0000-4000-8000-000000000001";
export const watchlistActor = {
  user: { id: "database-user", email: "synthetic@example.test" },
  tenant: { id: "tenant", name: "Synthetic tenant" },
  role: "user_admin",
};
export const watchlistClient = {
  id: watchlistClientId,
  tenantId: "tenant",
  name: "Synthetic client",
  status: "ACTIVE",
  profileStatus: "ACTIVE",
};
export const nativeCoreWatchlist = coreWatchlistSchema.parse({
  issueAreas: ["Defense"],
  tags: [
    {
      tag: "Sensors",
      issueArea: "Defense",
      position: "oppose",
      priority: "high",
      synonyms: ["Radar"],
      relatedEntities: ["Agency"],
      riskTerms: ["Prohibition"],
    },
  ],
});
export const nativeIntelWatchlist = {
  clientId: watchlistClientId,
  ...fromCoreWatchlist(nativeCoreWatchlist),
  jurisdictions: ["VA"],
  version: 7,
};

export function watchlistFixture(
  backend: TrackerBackend = "intelligence",
  role = "user_admin",
) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  cache.setQueryData(["identity"], { ...watchlistActor, role });
  const reader = currentWatchlistReader(cache)!;
  const keys = {
    identity: ["identity"],
    client: profileReadKey(watchlistClientId, "saved-client", reader.actor),
    targeting: watchlistKey(watchlistClientId, backend, reader),
    taxonomy: taxonomyKey(backend, reader),
    jurisdictions: jurisdictionsKey(reader),
  };
  cache.setQueryData(keys.client, watchlistClient);
  cache.setQueryData(
    keys.targeting,
    backend === "core"
      ? fromCoreWatchlist(nativeCoreWatchlist)
      : nativeIntelWatchlist,
  );
  cache.setQueryData(keys.taxonomy, { issueAreas: ["Defense", "Health"] });
  if (backend === "intelligence")
    cache.setQueryData(keys.jurisdictions, {
      jurisdictions: [
        { key: "US", count: 1 },
        { key: "VA", count: 1 },
      ],
    });
  const view = currentWatchlistView(cache, watchlistClientId, backend)!;
  return { cache, reader, keys, view, draft: watchlistDraft(view.record) };
}

export type RecordedWatchlistRequest = {
  path: string;
  method: string;
  body?: unknown;
  signal?: AbortSignal | null;
};
export function watchlistApi(
  handler: (request: RecordedWatchlistRequest) => unknown | Promise<unknown>,
) {
  const calls: RecordedWatchlistRequest[] = [];
  const fetcher: typeof fetch = async (input, options) => {
    const request = {
      path: String(input),
      method: options?.method ?? "GET",
      body:
        typeof options?.body === "string"
          ? (JSON.parse(options.body) as unknown)
          : undefined,
      signal: options?.signal,
    };
    calls.push(request);
    return new Response(JSON.stringify(await handler(request)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { api: createApiClient(fetcher), calls };
}
