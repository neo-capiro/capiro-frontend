import { expect, it, vi } from "vitest";
import { createCapiroApi } from "../src/shared/capiro/http";
import { procurementOperations } from "../src/shared/capiro/operations/procurement-money-flow";
import { procurementOperations as allProcurementOperations } from "../src/shared/capiro/operations/procurement";
import nativeActions from "./fixtures/procurement-action-details-native.json";
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

it("sends the action-detail opt-in through the authenticated fixed-operation transport", async () => {
  const fetcher = vi.fn(async () => Response.json(nativeActions));
  const api = createCapiroApi(allProcurementOperations, { fetcher });
  const body = {
    awardIdentityKeys: nativeActions.scope.awardIdentityKeys,
    knownAt: nativeActions.knownAt,
    includeActionDetails: true as const,
  };
  const result = await api.request("procurement.actionDetails", { body });
  expect(result.actionDetails).toHaveLength(4);
  expect(result.actionDetails[0]!.obligationUsd).toBe("800000.00");
  expect(allProcurementOperations["procurement.actionDetails"].path).toBe(
    allProcurementOperations["procurement.moneyFlow"].path,
  );
  expect(fetcher).toHaveBeenCalledWith(
    "/api/capiro/procurement.actionDetails",
    expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ body }),
    }),
  );
});

it("refuses a summary-only reply to a requested detail read without fallback", async () => {
  const { actionDetails: _details, ...summary } = nativeActions;
  const fetcher = vi.fn(async () => Response.json(summary));
  const api = createCapiroApi(allProcurementOperations, { fetcher });
  await expect(
    api.request("procurement.actionDetails", {
      body: {
        awardIdentityKeys: nativeActions.scope.awardIdentityKeys,
        includeActionDetails: true,
      },
    }),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("reads native account evidence through the authenticated transport without a SAM cutoff", async () => {
  const value = (
    await import("./fixtures/procurement-account-reports-native.json")
  ).default;
  const fetcher = vi.fn(async () => Response.json(value));
  const api = createCapiroApi(allProcurementOperations, { fetcher });
  const body = {
    awardIdentityKeys: value.scope.awardIdentityKeys,
    knownAt: value.knownAt,
  };
  expect(await api.request("procurement.accountReports", { body })).toEqual(
    value,
  );
  expect(fetcher).toHaveBeenCalledWith(
    "/api/capiro/procurement.accountReports",
    expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ body }),
    }),
  );
});
it.each([401, 403, 503])(
  "account HTTP %s is not retried or replaced with empty data",
  async (status) => {
    const fetcher = vi.fn(async () =>
      Response.json({ message: "Unavailable" }, { status }),
    );
    const api = createCapiroApi(allProcurementOperations, { fetcher });
    await expect(
      api.request("procurement.accountReports", {
        body: { awardIdentityKeys: [first] },
      }),
    ).rejects.toMatchObject({ status });
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
