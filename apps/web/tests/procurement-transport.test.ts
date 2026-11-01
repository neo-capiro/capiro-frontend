import { expect, it, vi } from "vitest";
import { createCapiroApi } from "../src/shared/capiro/http";
import { procurementOperations } from "../src/shared/capiro/operations/procurement-money-flow";
import { first, populated } from "./fixtures/procurement-consumer";

it("uses the existing authenticated fixed-operation transport and parses exact financial strings", async () => {
  const fetcher = vi.fn(async () => Response.json(populated()));
  const api = createCapiroApi(procurementOperations, { fetcher });
  const result = await api.request("procurement.moneyFlow", {
    body: { awardIdentityKeys: [first] },
  });
  expect(result.totals?.obligationUsd).toBe("-9007199254740993.000001");
  expect(result.totals?.outlayUsd).toBeNull();
  expect(fetcher).toHaveBeenCalledWith(
    "/api/capiro/procurement.moneyFlow",
    expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ body: { awardIdentityKeys: [first] } }),
    }),
  );
});

it("rejects malformed monetary values at the actual response boundary", async () => {
  const value = populated();
  const api = createCapiroApi(procurementOperations, {
    fetcher: async () =>
      Response.json({
        ...value,
        totals: { ...value.totals, obligationUsd: 9007199254740993 },
      }),
  });
  await expect(
    api.request("procurement.moneyFlow", {
      body: { awardIdentityKeys: [first] },
    }),
  ).rejects.toThrow();
});

it.each([401, 403, 503])(
  "preserves HTTP %s without fallback or automatic replay",
  async (status) => {
    const fetcher = vi.fn(async () =>
      Response.json({ message: "Unavailable" }, { status }),
    );
    const api = createCapiroApi(procurementOperations, { fetcher });
    await expect(
      api.request("procurement.moneyFlow", {
        body: { awardIdentityKeys: [first] },
      }),
    ).rejects.toMatchObject({ status });
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);

it.each(["request", "session"])(
  "does not admit a late response after %s scope cancellation",
  async (kind) => {
    const controller = new AbortController();
    let finish: ((response: Response) => void) | undefined;
    const api = createCapiroApi(procurementOperations, {
      fetcher: () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
      ...(kind === "session" ? { scopeSignal: () => controller.signal } : {}),
    });
    const pending = api.request(
      "procurement.moneyFlow",
      { body: { awardIdentityKeys: [first] } },
      kind === "request" ? { signal: controller.signal } : {},
    );
    controller.abort();
    finish!(Response.json(populated()));
    await expect(pending).rejects.toThrow();
  },
);
