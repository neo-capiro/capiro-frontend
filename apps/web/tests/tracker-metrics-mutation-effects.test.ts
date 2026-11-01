import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../src/shared/portfolio/api/http";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  useTrackBill,
  boardKey,
} from "../src/features/portfolio/bill-tracker/queries";
import { useWatchlistEditor } from "../src/features/portfolio/bill-tracker/useWatchlistEditor";
import {
  billSearchKey,
  currentBillSearch,
  trackerReaderKey,
} from "../src/features/portfolio/bill-tracker/current-data";
import { metricBoardSource } from "../src/features/portfolio/bill-tracker/useTrackerMetrics";
import {
  watchlistFixture,
  watchlistApi,
  watchlistClient,
  nativeCoreWatchlist,
} from "./watchlist-current-fixtures";
const current = vi.hoisted(() => ({ api: undefined as ApiClient | undefined }));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => {
    if (!current.api) throw new Error("Test API missing");
    return current.api;
  },
}));
function fixture() {
  const fixture = watchlistFixture("core", "standard_user");
  const scope = trackerReaderKey(fixture.cache),
    key = [...boardKey(fixture.view.clientId, "core"), scope];
  fixture.cache.setQueryData(key, { pages: [], pageParams: [] });
  return { ...fixture, scope, key };
}
describe("existing acknowledged mutation effects reach metric admission", () => {
  it.each([true, false])(
    "existing track=%s ACK invalidates metrics' board source; failure does not",
    async (track) => {
      for (const failed of [false, true]) {
        const { cache, view, scope, key } = fixture();
        const searchKey = billSearchKey(view.clientId, "core", "synthetic", []);
        cache.setQueryData(searchKey, [
          {
            billId: "119-hr-1",
            displayNum: "H.R. 1",
            title: "Synthetic",
            stage: "introduced",
            probability: 0.2,
          },
        ]);
        const selection = currentBillSearch(cache, searchKey);
        if (!selection) throw new Error("Missing synthetic search source");
        current.api = createApiClient(async () =>
          Response.json(
            failed
              ? { message: "rejected" }
              : track
                ? { tracked: true }
                : { untracked: true },
            { status: failed ? 400 : 200 },
          ),
        );
        const onSaved = vi.fn();
        let mutation: ReturnType<typeof useTrackBill> | undefined;
        function Capture() {
          mutation = useTrackBill(view.clientId, "core", onSaved);
          return null;
        }
        renderToStaticMarkup(
          createElement(
            QueryClientProvider,
            { client: cache },
            createElement(Capture),
          ),
        );
        if (!mutation) throw new Error("Missing mutation hook");
        const request = track
          ? {
              track: true as const,
              billId: "119-hr-1",
              source: selection.source,
            }
          : { track: false as const, billId: "119-hr-1" };
        if (failed)
          await expect(mutation.mutateAsync(request)).rejects.toThrow();
        else await mutation.mutateAsync(request);
        expect(cache.getQueryState(key)?.isInvalidated).toBe(!failed);
        expect(
          Boolean(metricBoardSource(cache, view.clientId, "core", scope)),
        ).toBe(failed);
        expect(onSaved).toHaveBeenCalledTimes(failed ? 0 : 1);
        cache.clear();
      }
    },
  );
  it.each([false, true])(
    "existing configure save failed=%s preserves the correct board/metric state",
    async (failed) => {
      const { cache, view, scope, key } = fixture();
      const api = watchlistApi((request) => {
        if (request.method === "PUT" && failed)
          throw new Error("Synthetic rejected write");
        return request.method === "PUT"
          ? request.body
          : request.path.endsWith("/watchlist")
            ? nativeCoreWatchlist
            : watchlistClient;
      });
      current.api = api.api;
      const closed = vi.fn();
      let editor: ReturnType<typeof useWatchlistEditor> | undefined;
      function Capture() {
        editor = useWatchlistEditor(view, closed);
        return null;
      }
      renderToStaticMarkup(
        createElement(
          QueryClientProvider,
          { client: cache },
          createElement(Capture),
        ),
      );
      if (!editor) throw new Error("Missing editor hook");
      editor.save();
      await vi.waitFor(() =>
        expect(api.calls.some((call) => call.method === "PUT")).toBe(true),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(cache.getQueryState(key)?.isInvalidated).toBe(!failed);
      expect(
        Boolean(metricBoardSource(cache, view.clientId, "core", scope)),
      ).toBe(failed);
      expect(closed).toHaveBeenCalledTimes(failed ? 0 : 1);
      cache.clear();
    },
  );
});
