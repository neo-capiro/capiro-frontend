import { intelWatchlistReceipt } from "./intel-watchlist-receipt";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { ApiError } from "@/shared/portfolio/api/http";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
import { profileClientSchema } from "@/features/portfolio/client-profile/read-public";
import { trackerBase } from "./api";
import {
  coreWatchlistSchema,
  fromCoreWatchlist,
  intelWatchlistForClient,
  coreWatchlistReceipt,
  sameWatchlistTargeting,
  toCoreWatchlist,
  toIntelWatchlist,
  type Watchlist,
  type WatchlistDraft,
} from "./watchlist-contracts";
import type { WatchlistView } from "./watchlist-source";

export const watchlistPath = (clientId: string, backend: TrackerBackend) =>
  backend === "core"
    ? `${trackerBase(clientId, backend)}/watchlist`
    : `tracker/watchlists/${encodeURIComponent(clientId)}`;

export async function readWatchlist(
  api: ApiClient,
  clientId: string,
  backend: TrackerBackend,
  signal: AbortSignal,
): Promise<Watchlist> {
  return backend === "core"
    ? fromCoreWatchlist(
        await api.request(
          backend,
          watchlistPath(clientId, backend),
          coreWatchlistSchema,
          { signal },
        ),
      )
    : api.request(
        backend,
        watchlistPath(clientId, backend),
        intelWatchlistForClient(clientId),
        { signal },
      );
}

async function verifyClient(
  api: ApiClient,
  view: WatchlistView,
  current: () => void,
  signal: AbortSignal,
) {
  current();
  await api.request(
    "core",
    `clients/${encodeURIComponent(view.clientId)}`,
    profileClientSchema(view.clientId, view.reader.actor.tenantId),
    { signal },
  );
  current();
}

/** Existing endpoints only. Checks are adjacent to the synchronous browser fetch dispatch. */
export async function writeWatchlist(
  api: ApiClient,
  view: WatchlistView,
  draft: WatchlistDraft,
  current: () => void,
  signal: AbortSignal,
  beforeDispatch: () => void,
): Promise<Watchlist> {
  await verifyClient(api, view, current, signal);
  if (view.backend === "core") {
    const latest = await readWatchlist(
      api,
      view.clientId,
      view.backend,
      signal,
    );
    current();
    if (!sameWatchlistTargeting(view.record, latest))
      throw new ApiError(
        409,
        "Saved targeting changed. Reload saved values before saving your retained edits.",
      );
    // The native issue-area normalizer is not duplicated here. These values
    // come from the current canonical taxonomy, rather than free-form aliases.
    if (draft.issueAreas.some((area) => !view.issueAreas.includes(area)))
      throw new ApiError(
        400,
        "Choose issue areas from the current taxonomy before saving.",
      );
    const body = toCoreWatchlist(draft);
    current();
    beforeDispatch();
    const result = await api.request(
      "core",
      watchlistPath(view.clientId, "core"),
      coreWatchlistReceipt(body),
      { method: "PUT", body, signal },
    );
    current();
    return fromCoreWatchlist(result);
  }
  const version = view.record.version;
  if (version === undefined)
    throw new ApiError(409, "Reload this watchlist before saving.");
  const body = toIntelWatchlist(draft, version);
  current();
  beforeDispatch();
  const result = await api.request(
    "intelligence",
    watchlistPath(view.clientId, "intelligence"),
    intelWatchlistReceipt(view.clientId, body, view.record),
    { method: "PUT", body, signal },
  );
  current();
  return result;
}

export async function reloadWatchlist(
  api: ApiClient,
  view: WatchlistView,
  current: () => void,
  signal: AbortSignal,
) {
  await verifyClient(api, view, current, signal);
  const result = await readWatchlist(api, view.clientId, view.backend, signal);
  current();
  return result;
}
