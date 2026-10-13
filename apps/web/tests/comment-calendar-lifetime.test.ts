import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { fetchUpcomingDeadlines } from "../src/features/portfolio/calendar/feeds";
import {
  commentApi,
  commentPage,
  commentRecord,
} from "./comment-calendar-fixtures";

const key = ["calendar", "deadlines", "2026-03-01", "2026-04-01"];
const client = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
const load = (
  cache: QueryClient,
  api: Parameters<typeof fetchUpcomingDeadlines>[0],
) =>
  cache.fetchQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      fetchUpcomingDeadlines(api, "2026-03-01", "2026-04-01", signal),
  });

it("a scope-cleared cache cannot be repopulated by a held old comment read after replacement", async () => {
  const cache = client();
  let release!: (value: unknown) => void;
  let oldResponseConsumed = false;
  const old = commentApi(() =>
    new Promise((resolve) => {
      release = resolve;
    }).then((value) => {
      oldResponseConsumed = true;
      return value;
    }),
  );
  const current = commentApi(() => commentPage([commentRecord("2026-45678")]));
  try {
    const pending = load(cache, old.api);
    const cancelled = expect(pending).rejects.toThrow();
    await vi.waitFor(() => expect(old.requests).toHaveLength(1));
    cache.clear();
    await cancelled;
    const accepted = await load(cache, current.api);
    release(commentPage([commentRecord("2026-12345")]));
    await vi.waitFor(() => expect(oldResponseConsumed).toBe(true));
    expect(accepted.items.map((item) => item.sourceId)).toEqual(["2026-45678"]);
    await vi.waitFor(() => expect(cache.getQueryData(key)).toEqual(accepted));
    expect(old.requests).toHaveLength(1);
    expect(cache.getQueryState(key)?.status).toBe("success");
  } finally {
    cache.clear();
  }
});

it("a failed current comment read retains only error-state data until a separate successful read", async () => {
  const cache = client();
  let denied = false;
  const fixture = commentApi(() =>
    denied
      ? Response.json(
          { message: "Synthetic comment access revoked" },
          { status: 403 },
        )
      : commentPage(),
  );
  try {
    const original = await load(cache, fixture.api);
    expect(original.items).toHaveLength(1);
    denied = true;
    await expect(load(cache, fixture.api)).rejects.toMatchObject({
      status: 403,
    });
    expect(cache.getQueryData(key)).toEqual(original);
    expect(cache.getQueryState(key)).toMatchObject({
      status: "error",
      fetchStatus: "idle",
    });
    denied = false;
    await load(cache, fixture.api);
    expect(cache.getQueryState(key)?.status).toBe("success");
    expect(fixture.requests).toHaveLength(3);
  } finally {
    cache.clear();
  }
});
