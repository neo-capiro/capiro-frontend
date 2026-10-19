import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type {
  FunnelSession,
  LegalDoc,
} from "../src/shared/capiro/onboard-contracts";
import {
  createLegalReviewLifetime,
  legalReviewIdentity,
} from "../src/features/onboard/lib/legal-review-lifetime";
import {
  FUNNEL_SESSION_KEY,
  createFunnelLifetime,
} from "../src/features/onboard/lib/funnel-lifetime";
import { createOnboardAttempt } from "../src/features/onboard/lib/attempt-journal";

const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const close of cleanup.splice(0).reverse()) close();
});
const docs: LegalDoc[] = [
  { docType: "tos", version: "tos-A", html: "Reviewed terms A" },
  { docType: "sa", version: "sa-A", html: "Reviewed agreement A" },
];
const session = {
  sessionId: "native-A",
  plan: "paid",
  orgName: "Synthetic organization",
} as FunnelSession;
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
  cache.setQueryData(FUNNEL_SESSION_KEY, session);
  const native = createFunnelLifetime(cache, session.sessionId);
  const key = [...native.key, "legal", session.plan];
  cache.setQueryData(key, docs);
  const identity = legalReviewIdentity(session, docs)!;
  const review = createLegalReviewLifetime(cache, key, identity);
  cleanup.push(review.subscribe(() => {}));
  const attempt = createOnboardAttempt(
    cache,
    "legal-acceptance",
    () => native.current() && review.current(),
    native.key,
  );
  cleanup.push(attempt.mount());
  return { cache, key, identity, review, attempt, native };
}
describe("legal consent belongs to the displayed current plan and documents", () => {
  it("preserves the same review identity on a local rerender and admits exactly that reviewed snapshot", async () => {
    const f = fixture(),
      accept = vi.fn(async () => ({ ok: true }));
    expect(
      legalReviewIdentity(
        { ...session },
        docs.map((doc) => ({ ...doc })),
      ),
    ).toBe(f.identity);
    await f.attempt.run("Accept A", (guard) => guard.wait(accept));
    expect(f.review.current()).toBe(true);
    expect(accept).toHaveBeenCalledTimes(1);
    expect(f.attempt.read()?.phase).toBe("confirmed");
  });
  it.each(["version", "html"] as const)(
    "changed document %s replaces the editor identity and fences its old submit",
    async (field) => {
      const f = fixture(),
        accept = vi.fn(async () => ({ ok: true }));
      const replacement = docs.map((doc) => ({
        ...doc,
        [field]: `${doc[field]} changed`,
      }));
      expect(legalReviewIdentity(session, replacement)).not.toBe(f.identity);
      f.cache.setQueryData(f.key, replacement);
      await expect(
        f.attempt.run("Old reviewed A", (guard) => guard.wait(accept)),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(accept).not.toHaveBeenCalled();
    },
  );
  it.each(["plan", "sessionId", "orgName"] as const)(
    "current %s replacement cannot reuse acknowledgements or submit",
    async (field) => {
      const f = fixture(),
        accept = vi.fn(async () => ({ ok: true }));
      const replacement = {
        ...session,
        [field]: field === "plan" ? "trial" : "replacement",
      } as FunnelSession;
      f.cache.setQueryData(FUNNEL_SESSION_KEY, replacement);
      expect(legalReviewIdentity(replacement, docs)).not.toBe(f.identity);
      await expect(
        f.attempt.run("Old reviewed A", (guard) => guard.wait(accept)),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(accept).not.toHaveBeenCalled();
    },
  );
  it("held old acceptance cannot mark signed or navigate after document replacement and remains unknown", async () => {
    const f = fixture(),
      held = deferred<{ ok: true }>(),
      signed = vi.fn();
    const pending = f.attempt.run("Accept reviewed A", async (guard) => {
      await guard.wait(() => held.promise);
      signed();
    });
    f.cache.setQueryData(
      f.key,
      docs.map((doc) => ({ ...doc, version: "B" })),
    );
    held.resolve({ ok: true });
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(signed).not.toHaveBeenCalled();
    expect(f.attempt.read()?.phase).toBe("unknown");
    const next = createLegalReviewLifetime(
      f.cache,
      f.key,
      legalReviewIdentity(session, f.cache.getQueryData(f.key)!)!,
    );
    const attempt = createOnboardAttempt(
      f.cache,
      "legal-acceptance",
      next.current,
      f.native.key,
    );
    cleanup.push(attempt.mount());
    const repeated = vi.fn(async () => ({ ok: true }));
    await expect(
      attempt.run("Repeat B", (guard) => guard.wait(repeated)),
    ).rejects.toThrow("current-status");
    expect(repeated).not.toHaveBeenCalled();
  });
  it("held current refresh immediately revokes old consent, even if identical documents later return", async () => {
    const f = fixture(),
      held = deferred<LegalDoc[]>();
    const reading = f.cache.fetchQuery({
      queryKey: f.key,
      queryFn: () => held.promise,
      retry: false,
    });
    expect(f.review.current()).toBe(false);
    held.resolve(docs);
    await reading;
    expect(f.review.current()).toBe(false);
    expect(
      createLegalReviewLifetime(f.cache, f.key, f.identity).current(),
    ).toBe(true);
  });
  it.each([403, 503])(
    "failed %s current legal read cannot reuse cached consent and read recovery requires renewed review",
    async (status) => {
      const f = fixture();
      await expect(
        f.cache.fetchQuery({
          queryKey: f.key,
          queryFn: async () => {
            throw Error(String(status));
          },
          retry: false,
        }),
      ).rejects.toThrow(String(status));
      expect(f.cache.getQueryData(f.key)).toEqual(docs);
      expect(f.review.current()).toBe(false);
      f.cache.setQueryData(f.key, docs);
      expect(f.review.current()).toBe(false);
      expect(
        createLegalReviewLifetime(f.cache, f.key, f.identity).current(),
      ).toBe(true);
    },
  );
  it("requires both complete legal documents before establishing a review identity", () => {
    expect(legalReviewIdentity(session, docs.slice(0, 1))).toBeNull();
    expect(legalReviewIdentity({ ...session, plan: null }, docs)).toBeNull();
  });
});
