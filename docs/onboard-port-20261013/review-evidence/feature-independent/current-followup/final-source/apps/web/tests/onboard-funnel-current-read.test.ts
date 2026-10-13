import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { FunnelSession } from "../src/shared/capiro/onboard-contracts";
import { CapiroApiError } from "../src/shared/capiro/http";
import {
  createFunnelLifetime,
  FUNNEL_SESSION_KEY,
} from "../src/features/onboard/lib/funnel-lifetime";
import {
  refreshFunnelSession,
  funnelSessionQuery,
} from "../src/features/onboard/lib/funnel-session-read";
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});
const initial = {
  sessionId: "A",
  plan: "paid",
  state: "plan_selected",
} as FunnelSession;
const deferred = <T>() => {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
function fixture() {
  const cache = new QueryClient();
  cleanups.push(() => cache.clear());
  cache.setQueryData(FUNNEL_SESSION_KEY, initial);
  const owner = createFunnelLifetime(cache, "A"),
    attempt = owner.attempt("other-action");
  cleanups.push(attempt.mount());
  return { cache, owner, attempt };
}
describe("canonical current funnel session reads", () => {
  it.each([403, 503])(
    "a current %s read failure publishes error and fences another action without replay",
    async (status) => {
      const f = fixture(),
        effect = vi.fn(async () => {});
      await expect(
        refreshFunnelSession(f.cache, async () => {
          throw new CapiroApiError(status, "unavailable");
        }),
      ).rejects.toMatchObject({ status });
      expect(f.cache.getQueryState(FUNNEL_SESSION_KEY)?.status).toBe("error");
      expect(f.owner.current()).toBe(false);
      await expect(
        f.attempt.run("Different action", (guard) => guard.wait(effect)),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(effect).not.toHaveBeenCalled();
    },
  );
  it("a held current read fences dispatch immediately and successful same-session recovery restores admission", async () => {
    const f = fixture(),
      held = deferred<FunnelSession>(),
      effect = vi.fn(async () => {});
    const reading = refreshFunnelSession(f.cache, () => held.promise);
    expect(f.owner.current()).toBe(false);
    await expect(
      f.attempt.run("During loading", (guard) => guard.wait(effect)),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(effect).not.toHaveBeenCalled();
    held.resolve(initial);
    await reading;
    expect(f.owner.current()).toBe(true);
    await f.attempt.run("Explicit after recovery", (guard) =>
      guard.wait(effect),
    );
    expect(effect).toHaveBeenCalledTimes(1);
  });
  it.each(["resolve", "reject"] as const)(
    "late old read %s cannot replace a newer successful session read",
    async (outcome) => {
      const f = fixture(),
        held = deferred<FunnelSession>();
      const stale = refreshFunnelSession(f.cache, () => held.promise).catch(
        (error: unknown) => error,
      );
      const replacement = {
        ...initial,
        sessionId: "B",
        state: "verified" as const,
      };
      await refreshFunnelSession(f.cache, async () => replacement);
      if (outcome === "resolve") held.resolve(initial);
      else held.reject(new CapiroApiError(503, "late failure"));
      await stale;
      expect(f.cache.getQueryState(FUNNEL_SESSION_KEY)?.status).toBe("success");
      expect(f.cache.getQueryData(FUNNEL_SESSION_KEY)).toEqual(replacement);
      expect(f.owner.current()).toBe(false);
    },
  );
  it.each(["resolve", "reject"] as const)(
    "old %s caller cannot adopt a replacement read and execute its continuation",
    async (outcome) => {
      const f = fixture(),
        held = deferred<FunnelSession>(),
        continuation = vi.fn();
      const stale = refreshFunnelSession(f.cache, () => held.promise).then(
        (value) => {
          continuation(value);
          return "continued";
        },
        (error: unknown) => error,
      );
      await refreshFunnelSession(f.cache, async () => ({
        ...initial,
        state: "verified" as const,
      }));
      if (outcome === "resolve") held.resolve(initial);
      else held.reject(new CapiroApiError(403, "late denied"));
      await expect(stale).resolves.toMatchObject({ name: "AbortError" });
      expect(continuation).not.toHaveBeenCalled();
      expect(f.cache.getQueryState(FUNNEL_SESSION_KEY)?.status).toBe("success");
    },
  );
  it.each(["resolve", "reject"] as const)(
    "same-options refetch cannot replace the original %s caller's captured signal",
    async (outcome) => {
      const f = fixture(),
        held = deferred<FunnelSession>(),
        continuation = vi.fn();
      const request = vi
        .fn()
        .mockImplementationOnce(() => held.promise)
        .mockResolvedValue({ ...initial, state: "verified" });
      const old = refreshFunnelSession(f.cache, request).then(
        (value) => {
          continuation(value);
          return "continued";
        },
        (error: unknown) => error,
      );
      await f.cache.refetchQueries({
        queryKey: FUNNEL_SESSION_KEY,
        exact: true,
      });
      if (outcome === "resolve") held.resolve(initial);
      else held.reject(new CapiroApiError(403, "old denied"));
      await expect(old).resolves.toMatchObject({ name: "AbortError" });
      expect(continuation).not.toHaveBeenCalled();
      expect(f.cache.getQueryData(FUNNEL_SESSION_KEY)).toMatchObject({
        state: "verified",
      });
    },
  );
  it("late old success cannot replace the newest denied read", async () => {
    const f = fixture(),
      held = deferred<FunnelSession>();
    const stale = refreshFunnelSession(f.cache, () => held.promise).catch(
      (error: unknown) => error,
    );
    await expect(
      refreshFunnelSession(f.cache, async () => {
        throw new CapiroApiError(403, "denied");
      }),
    ).rejects.toMatchObject({ status: 403 });
    held.resolve(initial);
    await stale;
    expect(f.cache.getQueryState(FUNNEL_SESSION_KEY)?.status).toBe("error");
    expect(f.owner.current()).toBe(false);
  });
  it("an observed query already in flight cannot publish over a newer deliberate read", async () => {
    const f = fixture(),
      held = deferred<FunnelSession>();
    const old = f.cache
      .fetchQuery({ ...funnelSessionQuery(() => held.promise), staleTime: 0 })
      .catch((error: unknown) => error);
    const current = { ...initial, state: "verified" as const };
    await refreshFunnelSession(f.cache, async () => current);
    held.resolve(initial);
    await old;
    expect(f.cache.getQueryData(FUNNEL_SESSION_KEY)).toEqual(current);
  });
  it("successful recovery retains an unknown write journal and requires status review rather than retry", async () => {
    const f = fixture(),
      held = deferred<void>(),
      effect = vi.fn(() => held.promise);
    const pending = f.attempt.run("Previously dispatched", (guard) =>
      guard.wait(effect),
    );
    await expect(
      refreshFunnelSession(f.cache, async () => {
        throw new CapiroApiError(503, "unavailable");
      }),
    ).rejects.toThrow("unavailable");
    held.resolve();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await refreshFunnelSession(f.cache, async () => initial);
    expect(f.owner.current()).toBe(true);
    expect(f.attempt.read()?.phase).toBe("unknown");
    await expect(
      f.attempt.run("Repeat", (guard) => guard.wait(effect)),
    ).rejects.toThrow("current-status");
    expect(effect).toHaveBeenCalledTimes(1);
  });
  it("a write's successful follow-up current read can complete without disposing the pending owner", async () => {
    const f = fixture(),
      next = vi.fn();
    await f.attempt.run(
      "Acknowledged write then current read",
      async (guard) => {
        await guard.wait(() =>
          refreshFunnelSession(f.cache, async () => initial),
        );
        next();
      },
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(f.attempt.read()?.phase).toBe("confirmed");
  });
  it("native404 is stable null, revokes old A, and still permits explicit pre-registration after current absence", async () => {
    const f = fixture();
    await expect(
      refreshFunnelSession(f.cache, async () => {
        throw new CapiroApiError(404, "not registered");
      }),
    ).resolves.toBeNull();
    expect(f.cache.getQueryState(FUNNEL_SESSION_KEY)?.status).toBe("success");
    expect(f.owner.current()).toBe(false);
    expect(createFunnelLifetime(f.cache, null).current()).toBe(true);
  });
  it("signed-out pre-registration does not require a nonexistent native session", () => {
    const cache = new QueryClient();
    cleanups.push(() => cache.clear());
    expect(createFunnelLifetime(cache, null).current()).toBe(true);
    expect(createFunnelLifetime(cache, "A").current()).toBe(false);
  });
});
