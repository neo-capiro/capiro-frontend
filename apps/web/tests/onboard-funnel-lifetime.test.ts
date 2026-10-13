import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  createFunnelLifetime,
  FUNNEL_SESSION_KEY,
} from "../src/features/onboard/lib/funnel-lifetime";
const caches: QueryClient[] = [];
afterEach(() => {
  for (const cache of caches.splice(0)) cache.clear();
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};
function fixture() {
  const cache = new QueryClient();
  caches.push(cache);
  cache.setQueryData(FUNNEL_SESSION_KEY, {
    sessionId: "native-A",
    state: "verified",
  });
  const owner = createFunnelLifetime(cache, "native-A"),
    attempt = owner.attempt("select-plan");
  const close = attempt.mount();
  return { cache, owner, attempt, close };
}
describe("native funnel session replacement within one Clerk/cache lifetime", () => {
  it("fences a held minimal write acknowledgement after authoritative current read replaces A with B", async () => {
    const f = fixture(),
      held = deferred<{ ok: true }>(),
      next = vi.fn(async () => {});
    const pending = f.attempt.run("Select plan in A", async (guard) => {
      await guard.wait(() => held.promise);
      await guard.wait(next);
    });
    f.cache.setQueryData(FUNNEL_SESSION_KEY, {
      sessionId: "native-B",
      state: "registered",
    });
    held.resolve({ ok: true });
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(next).not.toHaveBeenCalled();
  });
  it("discards A journals and does not let a late A result overwrite B", async () => {
    const f = fixture(),
      old = deferred<void>();
    const first = f.attempt.run("Private A", (guard) =>
      guard.wait(() => old.promise),
    );
    f.cache.setQueryData(FUNNEL_SESSION_KEY, {
      sessionId: "native-B",
      state: "verified",
    });
    const b = createFunnelLifetime(f.cache, "native-B");
    b.discardOtherSessions();
    const attempt = b.attempt("select-plan"),
      close = attempt.mount(),
      held = deferred<void>();
    const second = attempt.run("Current B", (guard) =>
      guard.wait(() => held.promise),
    );
    old.resolve();
    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    expect(f.attempt.read()).toBeUndefined();
    expect(attempt.read()).toMatchObject({
      phase: "pending",
      intent: "Current B",
    });
    held.resolve();
    await second;
    close();
  });
  it("same-session current reads and ordinary remount retain the unknown lock", async () => {
    const f = fixture(),
      effect = vi.fn(async () => {
        throw Error("receipt lost");
      });
    await expect(f.attempt.run("A", (g) => g.wait(effect))).rejects.toThrow(
      "lost",
    );
    f.close();
    f.cache.setQueryData(FUNNEL_SESSION_KEY, {
      sessionId: "native-A",
      state: "plan_selected",
    });
    const reopened = createFunnelLifetime(f.cache, "native-A");
    reopened.discardOtherSessions();
    const attempt = reopened.attempt("select-plan"),
      close = attempt.mount();
    await expect(attempt.run("Repeat", (g) => g.wait(effect))).rejects.toThrow(
      "current-status",
    );
    expect(effect).toHaveBeenCalledTimes(1);
    close();
  });
  it("a confirmed absence of native session invalidates an old editor before another dispatch", async () => {
    const f = fixture(),
      effect = vi.fn(async () => {});
    f.cache.setQueryData(FUNNEL_SESSION_KEY, null);
    await expect(
      f.attempt.run("A", (g) => g.wait(effect)),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(effect).not.toHaveBeenCalled();
  });
});

describe("native funnel current read cache", () => {
  it("rejects a held legal/status read after replacement and purges old read entries", async () => {
    const f = fixture(),
      held = deferred<{ state: string }>();
    const reading = f.owner.read(() => held.promise);
    f.cache.setQueryData([...f.owner.key, "provision-status"], {
      state: "org_setup",
    });
    f.cache.setQueryData(FUNNEL_SESSION_KEY, {
      sessionId: "native-B",
      state: "verified",
    });
    const b = createFunnelLifetime(f.cache, "native-B");
    b.discardOtherSessions();
    held.resolve({ state: "provisioned" });
    await expect(reading).rejects.toMatchObject({ name: "AbortError" });
    expect(
      f.cache.getQueryData([...f.owner.key, "provision-status"]),
    ).toBeUndefined();
    expect(
      f.cache.getQueryData([...b.key, "provision-status"]),
    ).toBeUndefined();
  });
});
