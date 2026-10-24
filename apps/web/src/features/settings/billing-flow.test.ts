import { describe, expect, it, vi } from "vitest";
import { billingFlow, requestBillingDestination } from "./billingFlow";
type Summary = NonNullable<Parameters<typeof billingFlow>[0]>;
type State = NonNullable<Parameters<typeof billingFlow>[1]>;
const summary = {
  billingEnabled: true,
  status: "none",
  hasSubscription: false,
} as Summary;
const state = { billingEnabled: true, status: "none" } as State;
describe("Settings billing flow", () => {
  it.each(["none", "trialing"] as const)(
    "uses checkout for %s without a subscription",
    (status) => {
      expect(billingFlow({ ...summary, status }, { ...state, status })).toBe(
        "checkout",
      );
    },
  );
  it("uses portal for an existing subscription and refuses comped/disabled/mismatched states", () => {
    expect(
      billingFlow(
        { ...summary, status: "active", hasSubscription: true },
        { ...state, status: "active" },
      ),
    ).toBe("portal");
    expect(
      billingFlow(
        { ...summary, status: "comped", hasSubscription: true },
        { ...state, status: "comped" },
      ),
    ).toBe("unavailable");
    expect(billingFlow({ ...summary, billingEnabled: false }, state)).toBe(
      "unavailable",
    );
    expect(billingFlow(summary, { ...state, status: "active" })).toBe(
      "unavailable",
    );
  });
  const api = (
    role: string,
    billingAdmin: boolean,
    url = "https://checkout.stripe.com/c/synthetic",
  ) => ({
    request: vi.fn(async (operation: string) => {
      if (operation === "me.read") return { role, billingAdmin };
      if (operation === "settings.billing.summary") return summary;
      if (operation === "settings.billing.state") return state;
      return { url };
    }),
  });
  it.each([
    ["standard_user", true],
    ["user_admin", false],
  ])(
    "refuses current permission loss before handoff: %s",
    async (role, billingAdmin) => {
      const fake = api(String(role), Boolean(billingAdmin));
      await expect(
        requestBillingDestination(
          fake as never,
          { kind: "checkout", body: { quantity: 10 } },
          new AbortController().signal,
        ),
      ).rejects.toThrow("unavailable");
      expect(fake.request.mock.calls.map(([op]) => op)).not.toContain(
        "settings.billing.checkout",
      );
    },
  );
  it("preserves reviewed checkout quantity/promo and accepts only the expected HTTPS destination", async () => {
    const fake = api("user_admin", true);
    const body = { quantity: 12, promoCode: "SYNTHETIC" };
    const signal = new AbortController().signal;
    await expect(
      requestBillingDestination(
        fake as never,
        { kind: "checkout", body },
        signal,
      ),
    ).resolves.toBe("https://checkout.stripe.com/c/synthetic");
    expect(fake.request).toHaveBeenCalledWith(
      "settings.billing.checkout",
      { body },
      { signal },
    );
    for (const url of [
      "http://checkout.stripe.com/c/synthetic",
      "https://billing.stripe.com/p/synthetic",
      "https://checkout.stripe.com.evil.test/c",
      "javascript:alert(1)",
    ])
      await expect(
        requestBillingDestination(
          api("user_admin", true, url) as never,
          { kind: "checkout", body },
          signal,
        ),
      ).rejects.toThrow();
  });
  it("does not dispatch a handoff after scope cancellation", async () => {
    const fake = api("capiro_admin", false);
    const controller = new AbortController();
    controller.abort();
    await expect(
      requestBillingDestination(
        fake as never,
        { kind: "checkout", body: { quantity: 10 } },
        controller.signal,
      ),
    ).rejects.toThrow();
    expect(fake.request.mock.calls.map(([op]) => op)).not.toContain(
      "settings.billing.checkout",
    );
  });
});
