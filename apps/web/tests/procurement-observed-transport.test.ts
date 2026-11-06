/**
 * Transport tests for procurement.observedActionDetails.
 * Verifies the operation uses the correct route and the transport layer
 * parses and rejects observed responses correctly.
 */
import { expect, it, vi } from "vitest";
import { createCapiroApi } from "../src/shared/capiro/http";
import { procurementOperations } from "../src/shared/capiro/operations/procurement";
import { syntheticObservedFlow } from "./fixtures/procurement-observed-synthetic";

const observedKey =
  "usaspending|award|CONT_AWD_OBSERVED01_9700_-NONE-_-NONE-";

it("observed operation uses POST /defense-budget/procurement/money-flow via the transport", async () => {
  const fetcher = vi.fn(async () => Response.json(syntheticObservedFlow()));
  const api = createCapiroApi(procurementOperations, { fetcher });
  const result = await api.request("procurement.observedActionDetails", {
    body: {
      awardIdentityKeys: [observedKey],
      revisionBasis: "latest_observed",
      includeActionDetails: true,
    },
  });
  expect(result.contract).toBe("defproc-observed-money-flow/v1");
  expect(result.revisionBasis).toBe("latest_observed");
  expect(result.sourceThrough).toBeNull();
  expect(fetcher).toHaveBeenCalledWith(
    "/api/capiro/procurement.observedActionDetails",
    expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    }),
  );
});

it("transport preserves verbatim sourceRevisionLabel (not converted to date)", async () => {
  const fixture = syntheticObservedFlow();
  const fetcher = vi.fn(async () => Response.json(fixture));
  const api = createCapiroApi(procurementOperations, { fetcher });
  const result = await api.request("procurement.observedActionDetails", {
    body: {
      awardIdentityKeys: [observedKey],
      revisionBasis: "latest_observed",
      includeActionDetails: true,
    },
  });
  const detail = result.actionDetails?.[0];
  expect(detail?.sourceRevisionLabel).toBe("2026-10-14");
  // Verify it's not a Date object or reformatted UTC string
  expect(typeof detail?.sourceRevisionLabel).toBe("string");
});

it("transport rejects observed response with wrong contract", async () => {
  const fixture = syntheticObservedFlow();
  const fetcher = vi.fn(async () =>
    Response.json({
      ...fixture,
      contract: "defproc-scoped-money-flow/v1",
      measure: "qualified_observed_actions",
    }),
  );
  const api = createCapiroApi(procurementOperations, { fetcher });
  await expect(
    api.request("procurement.observedActionDetails", {
      body: {
        awardIdentityKeys: [observedKey],
        revisionBasis: "latest_observed",
        includeActionDetails: true,
      },
    }),
  ).rejects.toThrow();
});

it("transport rejects an observed response that includes sourceRevisionOrder", async () => {
  const fixture = syntheticObservedFlow();
  const fetcher = vi.fn(async () =>
    Response.json({
      ...fixture,
      actionDetails: fixture.actionDetails.map((d) => ({
        ...d,
        sourceRevisionOrder: "2026-10-14T00:00:00.000000Z",
      })),
    }),
  );
  const api = createCapiroApi(procurementOperations, { fetcher });
  await expect(
    api.request("procurement.observedActionDetails", {
      body: {
        awardIdentityKeys: [observedKey],
        revisionBasis: "latest_observed",
        includeActionDetails: true,
      },
    }),
  ).rejects.toThrow();
});

it.each([401, 403, 503])(
  "preserves HTTP %s from observed operation without fallback",
  async (status) => {
    const fetcher = vi.fn(async () =>
      Response.json({ message: "Unavailable" }, { status }),
    );
    const api = createCapiroApi(procurementOperations, { fetcher });
    await expect(
      api.request("procurement.observedActionDetails", {
        body: {
          awardIdentityKeys: [observedKey],
          revisionBasis: "latest_observed",
          includeActionDetails: true,
        },
      }),
    ).rejects.toMatchObject({ status });
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
