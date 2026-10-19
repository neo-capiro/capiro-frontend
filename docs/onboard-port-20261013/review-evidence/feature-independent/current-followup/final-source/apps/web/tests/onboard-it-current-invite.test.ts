import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { ItInviteView } from "../src/shared/capiro/onboard-contracts";
import { withCurrentItInvite } from "../src/features/onboard/lib/it-invite-intent";
import { createOnboardAttempt } from "../src/features/onboard/lib/attempt-journal";
const initial: ItInviteView = {
  orgName: "Synthetic organization",
  email: "it@synthetic.example",
  status: "sent",
  provider: null,
  providers: { microsoft: true, google: true },
  googleClientId: "synthetic-client",
};
const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const close of cleanup.splice(0).reverse()) close();
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
  cleanup.push(() => cache.clear());
  const key = ["it", "invite", "synthetic-token"];
  cache.setQueryData(key, initial);
  const attempt = createOnboardAttempt(
    cache,
    "it-invite:synthetic-token",
    () => true,
  );
  cleanup.push(attempt.mount());
  return { cache, key, attempt };
}
describe("IT consent continues only from its current displayed invitation", () => {
  it.each([403, 503])(
    "a held consent URL cannot navigate after current invitation %s failure",
    async (status) => {
      const f = fixture(),
        held = deferred<string>(),
        navigate = vi.fn();
      const pending = f.attempt.run("Connect Microsoft", (guard) =>
        withCurrentItInvite(
          f.cache,
          "synthetic-token",
          "microsoft",
          initial,
          async (assertCurrent) => {
            const url = await guard.wait(() => held.promise);
            assertCurrent();
            navigate(url);
          },
        ),
      );
      await expect(
        f.cache.fetchQuery({
          queryKey: f.key,
          queryFn: async () => {
            throw Error(String(status));
          },
          retry: false,
        }),
      ).rejects.toThrow(String(status));
      held.resolve("https://synthetic.example/consent");
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(navigate).not.toHaveBeenCalled();
      expect(f.attempt.read()?.phase).toBe("unknown");
    },
  );
  it.each(["provider", "organization", "completed"])(
    "held consent cannot continue after current %s replacement",
    async (change) => {
      const f = fixture(),
        held = deferred<void>(),
        navigate = vi.fn();
      const pending = withCurrentItInvite(
        f.cache,
        "synthetic-token",
        "microsoft",
        initial,
        async (assertCurrent) => {
          await held.promise;
          assertCurrent();
          navigate();
        },
      );
      f.cache.setQueryData(f.key, {
        ...initial,
        ...(change === "provider"
          ? { providers: { microsoft: false, google: true } }
          : change === "organization"
            ? { orgName: "Other organization" }
            : { status: "verified" }),
      });
      held.resolve();
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(navigate).not.toHaveBeenCalled();
    },
  );
  it("current invitation loss before clicking blocks both consent and Google deferral dispatch", async () => {
    const f = fixture(),
      effect = vi.fn(async () => {});
    f.cache.setQueryData(f.key, {
      ...initial,
      providers: { microsoft: false, google: false },
    });
    for (const provider of ["microsoft", "google"] as const)
      await expect(
        withCurrentItInvite(
          f.cache,
          "synthetic-token",
          provider,
          initial,
          effect,
        ),
      ).rejects.toMatchObject({ name: "AbortError" });
    expect(effect).not.toHaveBeenCalled();
  });
  it("an unchanged current invitation permits the selected provider exactly once", async () => {
    const f = fixture(),
      navigate = vi.fn();
    await withCurrentItInvite(
      f.cache,
      "synthetic-token",
      "google",
      initial,
      async (assertCurrent) => {
        assertCurrent();
        navigate();
      },
    );
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
