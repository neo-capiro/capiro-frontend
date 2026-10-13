import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createOnboardAttempt } from "../src/features/onboard/lib/attempt-journal";
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
function fixture() {
  const cache = new QueryClient();
  const owner = {};
  let current = true;
  const attempt = createOnboardAttempt(cache, "create-client", () => current);
  const close = attempt.mount();
  return {
    cache,
    owner,
    attempt,
    close,
    replace: () => {
      current = false;
    },
  };
}
describe("onboarding effect admission and uncertain outcomes", () => {
  it("performs no effect on mount and synchronously prevents duplicate submissions", async () => {
    const f = fixture(),
      held = deferred<number>(),
      effect = vi.fn(() => held.promise);
    expect(f.attempt.read()).toBeUndefined();
    const first = f.attempt.run("Create Synthetic", (a) => a.wait(effect));
    await expect(f.attempt.run("Again", (a) => a.wait(effect))).rejects.toThrow(
      "current-status",
    );
    expect(effect).toHaveBeenCalledTimes(1);
    held.resolve(7);
    expect(await first).toBe(7);
    expect(f.attempt.read()?.phase).toBe("confirmed");
    f.close();
    f.cache.clear();
  });
  it.each(["close", "replace"] as const)(
    "fences a late acknowledgement after %s and blocks its next effect",
    async (change) => {
      const f = fixture(),
        held = deferred<void>(),
        next = vi.fn(async () => {});
      const pending = f.attempt.run("Create Synthetic", async (a) => {
        await a.wait(() => held.promise);
        await a.wait(next);
      });
      f[change]();
      held.resolve();
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(next).not.toHaveBeenCalled();
      expect(f.attempt.read()?.phase).toBe("unknown");
      f.cache.clear();
    },
  );
  it("retains unknown across view remount and a negative reconciliation never permits replay", async () => {
    const f = fixture(),
      effect = vi.fn(async () => {
        throw new Error("lost receipt");
      });
    await expect(
      f.attempt.run("Create Synthetic", (a) => a.wait(effect)),
    ).rejects.toThrow("lost");
    f.close();
    const reopened = createOnboardAttempt(f.cache, "create-client", () => true);
    const close = reopened.mount();
    await reopened.reconcile(
      async () => ({ exists: false }),
      (value) => value.exists,
    );
    await expect(reopened.run("Again", (a) => a.wait(effect))).rejects.toThrow(
      "current-status",
    );
    expect(effect).toHaveBeenCalledTimes(1);
    close();
    f.cache.clear();
  });
  it("does not accept a current read released after replacement", async () => {
    const f = fixture(),
      held = deferred<boolean>();
    await expect(
      f.attempt.run("Write", async () => {
        throw Error("loss");
      }),
    ).rejects.toThrow();
    const reading = f.attempt.reconcile(() => held.promise, Boolean);
    f.replace();
    held.resolve(true);
    await expect(reading).rejects.toMatchObject({ name: "AbortError" });
    expect(f.attempt.read()?.phase).toBe("unknown");
    f.cache.clear();
  });
  it("a replacement authority cache cannot read the prior intent", async () => {
    const f = fixture();
    await expect(
      f.attempt.run("Private draft", async () => {
        throw Error("loss");
      }),
    ).rejects.toThrow();
    const replacement = new QueryClient();
    const other = createOnboardAttempt(
      replacement,
      "create-client",
      () => true,
    );
    expect(other.read()).toBeUndefined();
    f.cache.clear();
    replacement.clear();
  });
});

describe("attempt replacement and reconciliation race controls", () => {
  it("a late old rejection cannot overwrite a new pending attempt after canonical cache replacement", async () => {
    const f = fixture(),
      old = deferred<void>();
    const first = f.attempt.run("Old", (a) => a.wait(() => old.promise));
    f.close();
    f.cache.clear();
    const next = createOnboardAttempt(f.cache, "create-client", () => true);
    const close = next.mount();
    const held = deferred<void>();
    const second = next.run("New", (a) => a.wait(() => held.promise));
    old.reject(Error("old loss"));
    await expect(first).rejects.toThrow("old loss");
    expect(next.read()).toMatchObject({ phase: "pending", intent: "New" });
    held.resolve();
    await second;
    close();
    f.cache.clear();
  });
  it("current read started during an admitted effect cannot clear the pending lock", async () => {
    const f = fixture(),
      held = deferred<void>();
    const pending = f.attempt.run("Write", (a) => a.wait(() => held.promise));
    await f.attempt.reconcile(async () => true, Boolean);
    expect(f.attempt.read()?.phase).toBe("pending");
    held.resolve();
    await pending;
    f.close();
    f.cache.clear();
  });
});
