import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { canAdminister } from "@/shared/portfolio/auth/identity";
import {
  assertProfileActor,
  assertProfileSource,
  currentProfileActor,
  currentProfileSource,
  profileActorKey,
  profileClientSchema,
  profileReadKey,
  type ProfileActor,
  type ProfileSource,
} from "@/features/portfolio/client-profile/read-public";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
import { corpusSchema } from "./contracts";
import {
  normalizedWatchlistSchema,
  intelWatchlistForClient,
  taxonomySchema,
  type Watchlist,
} from "./watchlist-contracts";

export type WatchlistReader = { actor: ProfileActor; revision: number };
export function currentWatchlistReader(
  cache: QueryClient,
): WatchlistReader | undefined {
  const actor = currentProfileActor(cache);
  const state = cache.getQueryState(["identity"]);
  if (actor && state) return { actor, revision: state.dataUpdateCount };
}
export const watchlistReaderKey = (reader?: WatchlistReader) =>
  JSON.stringify([profileActorKey(reader?.actor), reader?.revision ?? null]);
export function assertWatchlistReader(
  cache: QueryClient,
  reader: WatchlistReader,
) {
  assertProfileActor(cache, reader.actor);
  if (
    watchlistReaderKey(currentWatchlistReader(cache)) !==
    watchlistReaderKey(reader)
  )
    throw new ApiError(
      403,
      "Your session changed. Refresh current targeting before continuing.",
    );
}
export const watchlistKey = (
  clientId: string,
  backend: TrackerBackend,
  reader?: WatchlistReader,
) => ["bill-watchlist", backend, clientId, watchlistReaderKey(reader)] as const;
export const taxonomyKey = (
  backend: TrackerBackend,
  reader?: WatchlistReader,
) => ["tracker-issue-areas", backend, watchlistReaderKey(reader)] as const;
export const jurisdictionsKey = (reader?: WatchlistReader) =>
  [
    "watchlist-jurisdictions",
    "intelligence",
    watchlistReaderKey(reader),
  ] as const;

export type WatchlistView = {
  clientId: string;
  backend: TrackerBackend;
  reader: WatchlistReader;
  record: Watchlist;
  issueAreas: string[];
  jurisdictions: string[];
  clientSource: ProfileSource;
  targetingSource: ProfileSource;
  taxonomySource: ProfileSource;
  jurisdictionsSource?: ProfileSource;
};

export function currentWatchlistView(
  cache: QueryClient,
  clientId: string,
  backend: TrackerBackend,
): WatchlistView | undefined {
  const reader = currentWatchlistReader(cache);
  if (!reader) return;
  const clientSource = currentProfileSource(
    cache,
    profileReadKey(clientId, "saved-client", reader.actor),
  );
  const targetingSource = currentProfileSource(
    cache,
    watchlistKey(clientId, backend, reader),
  );
  const taxonomySource = currentProfileSource(
    cache,
    taxonomyKey(backend, reader),
  );
  const jurisdictionsSource =
    backend === "intelligence"
      ? currentProfileSource(cache, jurisdictionsKey(reader))
      : undefined;
  if (
    !clientSource ||
    !targetingSource ||
    !taxonomySource ||
    (backend === "intelligence" && !jurisdictionsSource)
  )
    return;
  const client = profileClientSchema(clientId, reader.actor.tenantId).safeParse(
    cache.getQueryData(clientSource.key),
  );
  const record = (
    backend === "core"
      ? normalizedWatchlistSchema
      : intelWatchlistForClient(clientId)
  ).safeParse(cache.getQueryData(targetingSource.key));
  const taxonomy = taxonomySchema.safeParse(
    cache.getQueryData(taxonomySource.key),
  );
  const coverage = jurisdictionsSource
    ? corpusSchema.safeParse(cache.getQueryData(jurisdictionsSource.key))
    : undefined;
  if (
    !client.success ||
    !record.success ||
    !taxonomy.success ||
    (coverage && !coverage.success)
  )
    return;
  return {
    clientId,
    backend,
    reader,
    record: record.data,
    issueAreas: taxonomy.data.issueAreas,
    jurisdictions: coverage?.success
      ? coverage.data.jurisdictions.map((item) => item.key)
      : [],
    clientSource,
    targetingSource,
    taxonomySource,
    jurisdictionsSource,
  };
}

export const watchlistSources = (view: WatchlistView) => [
  view.clientSource,
  view.targetingSource,
  view.taxonomySource,
  ...(view.jurisdictionsSource ? [view.jurisdictionsSource] : []),
];
export function assertWatchlistView(
  cache: QueryClient,
  view: WatchlistView,
  editing = false,
) {
  assertWatchlistReader(cache, view.reader);
  if (
    editing &&
    view.backend === "intelligence" &&
    !canAdminister(view.reader.actor.role)
  )
    throw new ApiError(403, "An administrator can change shared targeting.");
  for (const source of watchlistSources(view))
    assertProfileSource(cache, source);
  const current = currentWatchlistView(cache, view.clientId, view.backend);
  if (!current)
    throw new ApiError(
      409,
      "Refresh the current client and targeting data before continuing.",
    );
  return current;
}
