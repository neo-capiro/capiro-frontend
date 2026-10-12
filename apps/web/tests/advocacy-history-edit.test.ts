import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  filterTimeline,
  matchesMatter,
  timelineDate,
} from "../src/features/portfolio/advocacy/history-model";
import {
  draftForMatter,
  matterEditOptions,
  matterUpdateReflected,
  needsOutcomeConfirmation,
  prepareMatterUpdate,
} from "../src/features/portfolio/advocacy/matter-edit";
import {
  captureMatterEdit,
  assertMatterEditSource,
} from "../src/features/portfolio/advocacy/matter-edit-scope";
import {
  currentAdvocacyRead,
  currentAdvocacyActor,
  scopedAdvocacyKey,
  assertMatterEditor,
  watchMatterEditor,
} from "../src/features/portfolio/advocacy/read-state";
import {
  matterKey,
  mattersKey,
  loadTimeline,
} from "../src/features/portfolio/advocacy/queries";
import {
  prepareMatterEdit,
  readMatterEditResult,
  reloadMatterEdit,
  submitMatterEdit,
} from "../src/features/portfolio/advocacy/matter-edit-request";
import {
  matterEditAttemptKey,
  setMatterEditAttempt,
  updateMatterEditAttempt,
} from "../src/features/portfolio/advocacy/matter-edit-attempt";
import {
  advocacyClientId as clientId,
  advocacyMatter as matter,
  advocacyOther as other,
  advocacyIdentity as identity,
  advocacyEvents as events,
} from "./advocacy-history-fixtures";

const root = `/api/backend/core/clients/${clientId}/advocacy-matters`;
function seed() {
  const cache = new QueryClient();
  cache.setQueryData(["identity"], identity);
  const actor = currentAdvocacyActor(cache)!;
  cache.setQueryData(scopedAdvocacyKey(mattersKey(clientId), actor), [
    matter,
    other,
  ]);
  cache.setQueryData(
    scopedAdvocacyKey(matterKey(clientId, matter.id), actor),
    matter,
  );
  return { cache, actor, review: captureMatterEdit(cache, clientId, matter) };
}
function clientFor(responses: Record<string, unknown>) {
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    if (init?.method === "PATCH") return new Response(null, { status: 204 });
    if (!(String(url) in responses))
      throw new Error(`Unexpected request ${url}`);
    return new Response(JSON.stringify(responses[String(url)]));
  });
  return { api: createApiClient(fetcher), fetcher };
}

describe("loaded Advocacy history", () => {
  it.each(["funding", "appropriation", "0604134a", "HR-987"])(
    "finds actual matter field %s without a new query contract",
    (search) => {
      expect(matchesMatter(matter, search, "active")).toBe(true);
      expect(matchesMatter(matter, search, "monitoring")).toBe(false);
    },
  );
  it("uses the current catalog for status and preserves unassigned or unknown associations", () => {
    expect(filterTimeline(events, undefined, "", "")).toEqual(events);
    expect(filterTimeline(events, undefined, "", "active")).toBeUndefined();
    expect(
      filterTimeline(events, [matter, other], "", "active")?.map(
        (entry) => entry.id,
      ),
    ).toEqual([events[0]!.id, events[2]!.id, events[5]!.id]);
    expect(
      filterTimeline(events, [matter, other], "unassigned", "")?.[0]?.matterId,
    ).toBeNull();
    expect(
      filterTimeline(events, [matter, other], "0604134a", "")?.map(
        (entry) => entry.id,
      ),
    ).toEqual([events[0]!.id, events[2]!.id, events[5]!.id]);
  });
  it("keeps null and invalid native dates explicit without matter timestamp fallbacks", () => {
    expect(timelineDate(null)).toBe("Undated");
    expect(timelineDate("invalid")).toBe("Date unavailable");
    expect(timelineDate("2026-10-09T23:00:00-03:00")).toBe("Oct 10, 2026");
  });
  it("refuses duplicate timeline identity and the native cap overflow", async () => {
    await expect(
      loadTimeline(
        clientFor({ [`${root}/timeline`]: [events[0], events[0]] }).api,
        clientId,
      ),
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      loadTimeline(
        clientFor({
          [`${root}/timeline`]: Array.from({ length: 501 }, () => events[0]),
        }).api,
        clientId,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });
  it("conceals a retained success after failed refresh or invalidation", async () => {
    const { cache, actor } = seed();
    const key = scopedAdvocacyKey(mattersKey(clientId), actor);
    await cache
      .fetchQuery({
        queryKey: key,
        queryFn: () => {
          throw new Error("read refused");
        },
        retry: false,
      })
      .catch(() => {});
    expect(cache.getQueryData(key)).toEqual([matter, other]);
    expect(currentAdvocacyRead(cache, key)).toBe(false);
    cache.setQueryData(key, [matter, other]);
    await cache.invalidateQueries({ queryKey: key, refetchType: "none" });
    expect(currentAdvocacyRead(cache, key)).toBe(false);
    cache.clear();
  });
});

describe("native Advocacy outcome edit", () => {
  it.each(["invalidation", "role"])(
    "synchronously interrupts active work when %s is restored in the same callback",
    (interruption) => {
      const { cache, actor } = seed();
      const active = new AbortController();
      const stopWatching = watchMatterEditor(cache, actor, () =>
        active.abort(),
      );
      cache.setQueryData(["unrelated"], { changed: true });
      cache.setQueryData(["identity"], identity);
      expect(active.signal.aborted).toBe(false);
      if (interruption === "invalidation")
        void cache.invalidateQueries({
          queryKey: ["identity"],
          refetchType: "none",
        });
      else
        cache.setQueryData(["identity"], {
          ...identity,
          role: "client_portal_user",
        });
      cache.setQueryData(["identity"], identity);
      expect(() => assertMatterEditor(cache, actor)).not.toThrow();
      expect(active.signal.aborted).toBe(true);
      stopWatching();
      cache.clear();
    },
  );
  it.each(["successful", "partially_successful", "unsuccessful"])(
    "requires explicit human confirmation for new final status %s",
    (status) => {
      const draft = { ...draftForMatter(matter), status };
      expect(matter.outcomeCount).toBeGreaterThan(0);
      expect(needsOutcomeConfirmation(matter, status)).toBe(true);
      expect(() => prepareMatterUpdate(matter, draft)).toThrow(/Confirm/);
      expect(
        prepareMatterUpdate(matter, { ...draft, confirmOutcome: true }),
      ).toMatchObject({ status, confirmOutcome: true });
    },
  );
  it("recognizes only a real outcome_event link and does not rechallenge an unchanged final status", () => {
    const linked = {
      ...matter,
      links: [
        {
          id: "native-link",
          linkType: "outcome_event",
          linkKey: "native-outcome",
          label: null,
        },
      ],
    };
    expect(needsOutcomeConfirmation(linked, "successful")).toBe(false);
    expect(
      needsOutcomeConfirmation(
        { ...matter, status: "successful" },
        "successful",
      ),
    ).toBe(false);
    expect(needsOutcomeConfirmation(matter, "outcome_observed")).toBe(false);
  });
  it("offers only the current legacy value and rejects new legacy transitions", () => {
    expect(
      matterEditOptions("open").find((option) => option.value === "open")
        ?.label,
    ).toBe("open (legacy)");
    expect(
      matterEditOptions("open").some((option) => option.value === "resolved"),
    ).toBe(false);
    expect(() =>
      prepareMatterUpdate(matter, {
        ...draftForMatter(matter),
        status: "open",
      }),
    ).toThrow(/supported/);
    expect(
      prepareMatterUpdate(
        { ...matter, status: "open" },
        { ...draftForMatter(matter), status: "open" },
      ).status,
    ).toBe("open");
  });
  it("bounds trimmed fields and requires exact empty-string summary readback", () => {
    expect(() =>
      prepareMatterUpdate(matter, { ...draftForMatter(matter), title: " " }),
    ).toThrow();
    expect(() =>
      prepareMatterUpdate(matter, {
        ...draftForMatter(matter),
        summary: "x".repeat(4001),
      }),
    ).toThrow();
    const input = prepareMatterUpdate(matter, {
      ...draftForMatter(matter),
      title: " Updated ",
      summary: " ",
    });
    expect(input).toEqual({ title: "Updated", summary: "", status: "active" });
    expect(
      matterUpdateReflected({ ...matter, ...input }, matter.id, input),
    ).toBe(true);
    expect(
      matterUpdateReflected(
        { ...matter, ...input, summary: null },
        matter.id,
        input,
      ),
    ).toBe(false);
  });
  it("captures current native client/matter data and rejects actor, role, or source changes", async () => {
    const { cache, actor, review } = seed();
    expect(() => assertMatterEditSource(cache, review)).not.toThrow();
    cache.setQueryData(
      scopedAdvocacyKey(matterKey(clientId, matter.id), actor),
      { ...matter, summary: "Changed" },
    );
    expect(() => assertMatterEditSource(cache, review)).toThrow(/Reload/);
    cache.setQueryData(["identity"], { ...identity, role: "standard_user" });
    expect(() => captureMatterEdit(cache, clientId, matter)).toThrow(/role/);
    cache.setQueryData(["identity"], {
      ...identity,
      user: { ...identity.user, id: "another-user" },
    });
    expect(() => assertMatterEditSource(cache, review)).toThrow(/session/);
    cache.clear();
  });
  it("refuses same-valued source refreshes, invalidated identity, and a matter outside the list", async () => {
    const { cache, actor, review } = seed();
    cache.setQueryData(scopedAdvocacyKey(mattersKey(clientId), actor), [
      matter,
      other,
    ]);
    expect(() => assertMatterEditSource(cache, review)).toThrow(/refreshed/);
    await cache.invalidateQueries({
      queryKey: ["identity"],
      refetchType: "none",
    });
    expect(currentAdvocacyActor(cache)).toBeUndefined();
    cache.setQueryData(["identity"], identity);
    cache.setQueryData(scopedAdvocacyKey(mattersKey(clientId), actor), [other]);
    expect(() => captureMatterEdit(cache, clientId, matter)).toThrow(/Reload/);
    cache.clear();
  });
  it("preflights the exact scoped list and detail, then sends only the native PATCH shape", async () => {
    const { cache, review } = seed();
    const { api, fetcher } = clientFor({
      [root]: [matter, other],
      [`${root}/${matter.id}`]: matter,
    });
    const signal = new AbortController().signal;
    await prepareMatterEdit(api, review, signal, () =>
      assertMatterEditSource(cache, review),
    );
    const input = prepareMatterUpdate(matter, {
      ...draftForMatter(matter),
      status: "successful",
      confirmOutcome: true,
    });
    await submitMatterEdit(api, clientId, matter.id, input, signal);
    expect(
      fetcher.mock.calls.map(([url, init]) => [String(url), init?.method]),
    ).toEqual([
      [root, "GET"],
      [`${root}/${matter.id}`, "GET"],
      [`${root}/${matter.id}`, "PATCH"],
    ]);
    expect(fetcher.mock.calls[2]?.[1]?.body).toBe(JSON.stringify(input));
    expect(input).not.toHaveProperty("clientId");
    expect(input).not.toHaveProperty("version");
    cache.clear();
  });
  it("does not dispatch after stale fresh detail or disappearing membership", async () => {
    const { cache, review } = seed();
    const signal = new AbortController().signal;
    await expect(
      prepareMatterEdit(
        clientFor({ [root]: [other] }).api,
        review,
        signal,
        () => {},
      ),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      prepareMatterEdit(
        clientFor({
          [root]: [matter],
          [`${root}/${matter.id}`]: { ...matter, status: "withdrawn" },
        }).api,
        review,
        signal,
        () => {},
      ),
    ).rejects.toMatchObject({ status: 409 });
    cache.clear();
  });
  it("reloads a changed native review with GETs while keeping capture authority current", async () => {
    const { cache, review } = seed();
    const changed = { ...matter, summary: "Current saved summary" };
    const { api, fetcher } = clientFor({
      [root]: [changed],
      [`${root}/${matter.id}`]: changed,
    });
    const current = await reloadMatterEdit(
      api,
      review,
      new AbortController().signal,
      () => {
        if (currentAdvocacyActor(cache)?.userId !== review.actor.userId)
          throw new Error("Actor changed");
      },
    );
    expect(current.matter.summary).toBe("Current saved summary");
    expect(review.matter.summary).toBe(matter.summary);
    expect(fetcher.mock.calls.every(([, init]) => init?.method === "GET")).toBe(
      true,
    );
    cache.clear();
  });
  it("requires the native void acknowledgement and exact scoped detail fields", async () => {
    const input = prepareMatterUpdate(matter, draftForMatter(matter));
    const signal = new AbortController().signal;
    const unexpected = createApiClient(
      vi.fn<typeof fetch>(
        async () => new Response(JSON.stringify({ id: matter.id })),
      ),
    );
    await expect(
      submitMatterEdit(unexpected, clientId, matter.id, input, signal),
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      readMatterEditResult(
        clientFor({ [`${root}/${matter.id}`]: other }).api,
        clientId,
        matter.id,
        input,
        signal,
      ),
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      readMatterEditResult(
        clientFor({
          [`${root}/${matter.id}`]: { ...matter, summary: "different" },
        }).api,
        clientId,
        matter.id,
        input,
        signal,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("checks capture after a delayed preflight and respects abort before dispatch", async () => {
    const { cache, actor, review } = seed();
    const fetcher = vi.fn<typeof fetch>(async () => {
      cache.setQueryData(scopedAdvocacyKey(mattersKey(clientId), actor), []);
      return new Response(JSON.stringify([matter]));
    });
    await expect(
      prepareMatterEdit(
        createApiClient(fetcher),
        review,
        new AbortController().signal,
        () => assertMatterEditSource(cache, review),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(fetcher).toHaveBeenCalledOnce();
    const controller = new AbortController();
    controller.abort();
    await expect(
      submitMatterEdit(
        createApiClient(fetcher),
        clientId,
        matter.id,
        prepareMatterUpdate(matter, draftForMatter(matter)),
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).toHaveBeenCalledOnce();
    cache.clear();
  });
  it("retains an original actor's unknown attempt and refuses unrelated attempt updates", () => {
    const { cache, actor } = seed();
    const key = matterEditAttemptKey(clientId, matter.id, actor);
    const input = prepareMatterUpdate(matter, draftForMatter(matter));
    setMatterEditAttempt(cache, key, {
      token: 1,
      input,
      acknowledged: false,
      status: "pending",
    });
    updateMatterEditAttempt(cache, key, 2, { acknowledged: true });
    updateMatterEditAttempt(cache, key, 1, { status: "unknown" });
    expect(cache.getQueryData(key)).toMatchObject({
      token: 1,
      acknowledged: false,
      status: "unknown",
    });
    expect(
      matterEditAttemptKey(clientId, matter.id, {
        ...actor,
        userId: "another",
      }),
    ).not.toEqual(key);
    cache.clear();
  });
});
