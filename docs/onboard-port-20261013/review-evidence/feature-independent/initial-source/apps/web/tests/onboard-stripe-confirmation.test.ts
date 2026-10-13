import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createOnboardAttempt } from "../src/features/onboard/lib/attempt-journal";
import {
  confirmPreparedStripe,
  preparedStripeIntentId,
} from "../src/features/onboard/lib/stripe-confirmation";
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
  let current = true;
  const attempt = createOnboardAttempt(
    cache,
    "trial-stripe-confirmation",
    () => current,
  );
  const close = attempt.mount();
  const confirm = vi.fn(async () => ({
    setupIntent: { id: "seti_Synthetic", status: "succeeded" as const },
  }));
  const onDone = vi.fn(async () => {});
  const run = () =>
    confirmPreparedStripe(attempt, {
      mode: "setup",
      intentId: "seti_Synthetic",
      confirm,
      onDone,
    });
  return {
    cache,
    attempt,
    close,
    confirm,
    onDone,
    run,
    replace: () => {
      current = false;
    },
  };
}
describe("prepared Stripe confirmation boundary", () => {
  it("does not call Stripe while preparing the controller, and keeps the secret out of its journal", async () => {
    const f = fixture();
    expect(f.confirm).not.toHaveBeenCalled();
    const secret = "seti_Synthetic_secret_never-persist-this";
    expect(preparedStripeIntentId(secret, "setup")).toBe("seti_Synthetic");
    expect(preparedStripeIntentId(secret, "payment")).toBeNull();
    expect(preparedStripeIntentId("invalid", "setup")).toBeNull();
    await f.run();
    expect(
      JSON.stringify(
        f.cache
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain("secret");
    expect(f.onDone).toHaveBeenCalledTimes(1);
  });
  it("never repeats SDK confirmation when the native follow-up response is lost", async () => {
    const f = fixture();
    f.onDone.mockRejectedValueOnce(new Error("native receipt lost"));
    await expect(f.run()).rejects.toThrow("native receipt lost");
    const retry = await f.run().catch((error) => error);
    expect(f.confirm).toHaveBeenCalledTimes(1);
    expect(retry).toMatchObject({
      message: expect.stringContaining("already returned"),
    });
    expect(f.attempt.read()?.phase).toBe("confirmed");
    expect(f.onDone).toHaveBeenCalledTimes(1);
  });
  it("admits only one SDK call while confirmation is pending", async () => {
    const f = fixture(),
      held = deferred<Awaited<ReturnType<typeof f.confirm>>>();
    f.confirm.mockImplementationOnce(() => held.promise);
    const first = f.run();
    await expect(f.run()).rejects.toThrow("current-status");
    held.resolve({
      setupIntent: { id: "seti_Synthetic", status: "succeeded" },
    });
    await first;
    expect(f.confirm).toHaveBeenCalledTimes(1);
  });
  it.each(["close", "replace"] as const)(
    "fences native continuation when %s occurs during SDK confirmation",
    async (change) => {
      const f = fixture(),
        held = deferred<Awaited<ReturnType<typeof f.confirm>>>();
      f.confirm.mockImplementationOnce(() => held.promise);
      const pending = f.run();
      f[change]();
      held.resolve({
        setupIntent: { id: "seti_Synthetic", status: "succeeded" },
      });
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(f.onDone).not.toHaveBeenCalled();
      expect(f.attempt.read()?.phase).toBe("unknown");
    },
  );
  it("retains uncertainty across ordinary view remount without replaying SDK confirmation", async () => {
    const f = fixture();
    f.confirm.mockRejectedValueOnce(new Error("SDK response lost"));
    await expect(f.run()).rejects.toThrow("SDK response lost");
    f.close();
    const reopened = createOnboardAttempt(
      f.cache,
      "trial-stripe-confirmation",
      () => true,
    );
    const close = reopened.mount();
    await expect(
      confirmPreparedStripe(reopened, {
        mode: "setup",
        intentId: "seti_Synthetic",
        confirm: f.confirm,
        onDone: f.onDone,
      }),
    ).rejects.toThrow("current-status");
    expect(f.confirm).toHaveBeenCalledTimes(1);
    expect(f.onDone).not.toHaveBeenCalled();
    close();
  });
  it("rejects an unrelated receipt without native continuation", async () => {
    const f = fixture();
    f.confirm.mockResolvedValueOnce({
      setupIntent: { id: "seti_Foreign", status: "succeeded" },
    });
    await expect(f.run()).rejects.toThrow("matching");
    expect(f.onDone).not.toHaveBeenCalled();
    expect(f.attempt.read()?.phase).toBe("unknown");
  });
  it("permits explicit corrected input only after a definite SDK validation refusal", async () => {
    const f = fixture();
    const confirm = vi
      .fn()
      .mockResolvedValueOnce({ error: { type: "validation_error" } })
      .mockResolvedValueOnce({
        setupIntent: { id: "seti_Synthetic", status: "succeeded" },
      });
    const run = () =>
      confirmPreparedStripe(f.attempt, {
        mode: "setup",
        intentId: "seti_Synthetic",
        confirm,
        onDone: f.onDone,
      });
    await expect(run()).rejects.toThrow("Review the payment details");
    expect(f.attempt.read()?.phase).toBe("rejected");
    await run();
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(f.onDone).toHaveBeenCalledTimes(1);
  });
  it.each(["api_error", "card_error"])(
    "does not treat %s as permission to repeat confirmation",
    async (type) => {
      const f = fixture(),
        confirm = vi.fn().mockResolvedValue({ error: { type } });
      const run = () =>
        confirmPreparedStripe(f.attempt, {
          mode: "setup",
          intentId: "seti_Synthetic",
          confirm,
          onDone: f.onDone,
        });
      await expect(run()).rejects.toThrow("not established");
      await expect(run()).rejects.toThrow("current-status");
      expect(confirm).toHaveBeenCalledTimes(1);
      expect(f.onDone).not.toHaveBeenCalled();
    },
  );
  it("continues a matching processing ACH receipt without claiming settlement", async () => {
    const f = fixture(),
      confirm = vi.fn(async () => ({
        paymentIntent: { id: "pi_Synthetic", status: "processing" as const },
      }));
    await confirmPreparedStripe(f.attempt, {
      mode: "payment",
      intentId: "pi_Synthetic",
      confirm,
      onDone: f.onDone,
    });
    expect(f.onDone).toHaveBeenCalledTimes(1);
    expect(f.attempt.read()?.phase).toBe("confirmed");
  });
});
