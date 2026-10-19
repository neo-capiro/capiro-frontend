import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  strategyDetailFor,
  workspaceDraftSchema,
} from "../src/features/portfolio/work/contracts";

const strategyId = "93000000-0000-4000-8000-000000000001";
const clientId = "10000000-0000-4000-8000-000000000001";
const detail = {
  id: strategyId,
  clientId,
  title: "Synthetic native strategy",
  type: "policy",
  ownerUserId: "synthetic-owner",
  goal: null,
  targetDate: null,
  draftedByMeri: false,
  nodes: [],
  artifacts: [],
};

describe("Strategy detail request association", () => {
  it("accepts the existing native projection for the exact requested strategy and client", () => {
    expect(strategyDetailFor(strategyId, clientId).parse(detail)).toEqual(
      detail,
    );
  });

  for (const field of ["id", "clientId"] as const) {
    it(`rejects an otherwise valid response with a different ${field} at the API boundary`, async () => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          ...detail,
          [field]: "99000000-0000-4000-8000-000000000001",
        }),
      );
      const api = createApiClient(fetcher);
      await expect(
        api.request(
          "strategy",
          `strategies/${strategyId}`,
          strategyDetailFor(strategyId, clientId),
        ),
      ).rejects.toMatchObject({ name: "ApiError", status: 502 });
      expect(fetcher).toHaveBeenCalledExactlyOnceWith(
        `/api/backend/strategy/strategies/${strategyId}`,
        expect.objectContaining({ method: "GET", cache: "no-store" }),
      );
    });
  }

  it("requires the native association fields without weakening UUID validation", () => {
    const schema = strategyDetailFor(strategyId, clientId);
    expect(schema.safeParse({ ...detail, clientId: undefined }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...detail, id: undefined }).success).toBe(false);
    expect(
      strategyDetailFor("invalid", clientId).safeParse({
        ...detail,
        id: "invalid",
      }).success,
    ).toBe(false);
  });
});

describe("Work native Workspace projection", () => {
  it("continues to parse nullable client-name association and document status without a client UUID", () => {
    const draft = {
      id: "94000000-0000-4000-8000-000000000001",
      docTitle: "Synthetic native draft",
      client: null,
      product: null,
      ownerId: "synthetic-owner",
      status: "complete",
      updatedAt: "2026-10-11T12:00:00Z",
    };
    expect(workspaceDraftSchema.parse(draft)).toEqual(draft);
    expect(
      workspaceDraftSchema.safeParse({ ...draft, status: "completed" }).success,
    ).toBe(false);
  });
});
