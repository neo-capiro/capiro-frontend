import { describe, expect, it, vi } from "vitest";
import {
  emptyFields,
  objectiveReadiness,
  objectiveSchema,
  type Objective,
} from "../src/features/portfolio/objectives/contracts";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  saveObjective,
  deleteObjective,
} from "../src/features/portfolio/objectives/writer";

const clientId = "10000000-0000-4000-8000-000000000001";
const fields = {
  outcome: "Evaluate resilient systems",
  governmentProblem: "Insufficient testing capacity",
  askType: "meri_propose" as const,
  minimumWin: "One authorized test event",
  limits: "",
};
const record: Objective = {
  ...fields,
  id: "20000000-0000-4000-8000-000000000001",
  clientId,
  requestId: "30000000-0000-4000-8000-000000000001",
  ownerUserId: null,
  status: "draft",
  version: 1,
  readyAt: null,
  reviewRequestedAt: null,
  createdAt: "2026-10-11T00:00:00Z",
  updatedAt: "2026-10-11T00:00:00Z",
  readiness: {
    isReady: true,
    completedFields: 4,
    requiredFields: 4,
    checklist: {
      outcome: true,
      governmentProblem: true,
      askType: true,
      minimumWin: true,
    },
  },
};

describe("Objective four-field readiness", () => {
  it("does not count limits, whitespace or an unselected ask", () => {
    expect(
      objectiveReadiness({
        ...emptyFields,
        outcome: " \n ",
        limits: "A real constraint",
      }),
    ).toEqual({
      isReady: false,
      completedFields: 0,
      requiredFields: 4,
      checklist: {
        outcome: false,
        governmentProblem: false,
        askType: false,
        minimumWin: false,
      },
    });
    expect(objectiveReadiness({ ...fields, askType: null })).toMatchObject({
      isReady: false,
      completedFields: 3,
      checklist: { askType: false },
    });
  });

  it("accepts Meri propose as an answer without adding owner, semantic or evidence requirements", () => {
    expect(objectiveReadiness(fields)).toEqual(record.readiness);
    expect(objectiveSchema.parse(record)).toEqual(record);
  });

  for (const readiness of [
    { ...record.readiness, completedFields: 3 },
    { ...record.readiness, completedFields: 4.5 },
    { ...record.readiness, completedFields: 5 },
    { ...record.readiness, isReady: false },
    {
      ...record.readiness,
      checklist: { ...record.readiness.checklist, outcome: false },
    },
  ])
    it(`rejects contradictory server readiness ${JSON.stringify(readiness)}`, () => {
      expect(objectiveSchema.safeParse({ ...record, readiness }).success).toBe(
        false,
      );
    });

  it("accepts incomplete drafts but refuses incomplete review and ready records", () => {
    const draft = {
      ...record,
      outcome: "",
      readiness: {
        ...record.readiness,
        completedFields: 3,
        isReady: false,
        checklist: { ...record.readiness.checklist, outcome: false },
      },
    };
    expect(objectiveSchema.safeParse(draft).success).toBe(true);
    expect(
      objectiveSchema.safeParse({ ...draft, status: "in_review" }).success,
    ).toBe(false);
    expect(
      objectiveSchema.safeParse({ ...draft, status: "ready" }).success,
    ).toBe(false);
  });

  for (const action of ["request_review", "confirm_ready"] as const)
    it(`refuses incomplete ${action} before creating a draft`, async () => {
      const fetcher = vi.fn<typeof fetch>();
      await expect(
        saveObjective(
          createApiClient(fetcher),
          clientId,
          {
            fields: { ...fields, minimumWin: "  " },
            requestId: record.requestId,
          },
          action,
          vi.fn(),
        ),
      ).rejects.toThrow("Complete outcome");
      expect(fetcher).not.toHaveBeenCalled();
    });
});

describe("Objective mutation lifetime", () => {
  it("rejects expired authority before the first dispatch", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const guard = () => {
      throw new Error("Authority revoked");
    };
    await expect(
      saveObjective(
        createApiClient(fetcher),
        clientId,
        {
          fields,
          requestId: record.requestId,
        },
        "confirm_ready",
        vi.fn(),
        { guard },
      ),
    ).rejects.toThrow("Authority revoked");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not retain a late create receipt or dispatch a transition after authority changes", async () => {
    let resolve!: (response: Response) => void;
    const fetcher = vi.fn<typeof fetch>().mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const retained = vi.fn();
    const controller = new AbortController();
    const result = saveObjective(
      createApiClient(fetcher),
      clientId,
      {
        fields,
        requestId: record.requestId,
      },
      "confirm_ready",
      retained,
      {
        guard: () => controller.signal.throwIfAborted(),
        signal: controller.signal,
      },
    );
    controller.abort();
    resolve(Response.json(record));
    await expect(result).rejects.toThrow();
    expect(retained).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it("rechecks authority between the saved-draft callback and lifecycle transition", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(record));
    const controller = new AbortController();
    const retained = vi.fn(() => controller.abort());
    await expect(
      saveObjective(
        createApiClient(fetcher),
        clientId,
        {
          fields,
          requestId: record.requestId,
        },
        "confirm_ready",
        retained,
        {
          guard: () => controller.signal.throwIfAborted(),
          signal: controller.signal,
        },
      ),
    ).rejects.toThrow();
    expect(retained).toHaveBeenCalledExactlyOnceWith(record);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not accept a lifecycle result after its editor lifetime ends", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      controller.abort();
      return Response.json({ ...record, status: "ready", version: 2 });
    });
    await expect(
      saveObjective(
        createApiClient(fetcher),
        clientId,
        {
          fields,
          requestId: record.requestId,
          record,
        },
        "confirm_ready",
        vi.fn(),
        {
          guard: () => controller.signal.throwIfAborted(),
          signal: controller.signal,
        },
      ),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("checks delete authority before dispatch and after its exact receipt", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      controller.abort();
      return Response.json({ id: record.id, deleted: true, version: 2 });
    });
    const execution = {
      guard: () => controller.signal.throwIfAborted(),
      signal: controller.signal,
    };
    await expect(
      deleteObjective(createApiClient(fetcher), clientId, record, execution),
    ).rejects.toThrow();
    await expect(
      deleteObjective(createApiClient(fetcher), clientId, record, execution),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});
