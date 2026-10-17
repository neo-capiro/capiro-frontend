import { describe, expect, it, vi } from "vitest";
import { createCapiroApi } from "../src/shared/capiro/http";
import { capiroOperations } from "../src/shared/capiro/registry";
import {
  currentGovernedPlannerRequest,
  receiveCurrentGovernedPlannerRead,
  requireCurrentGovernedPlannerGeneration,
  reverifyCurrentGovernedPlannerProject,
} from "../src/features/portfolio/objectives/objective-governed-planner-read";

const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const client = { id: id(1), status: "active" };
const objective = {
  clientId: client.id,
  id: id(2),
  status: "ready" as const,
  version: 8,
};
const generation = {
  schemaVersion: 1,
  clientId: client.id,
  objective: {
    id: objective.id,
    revision: { id: id(3), version: 8 },
    status: "ready",
  },
  workAction: "objective.plan.prepare",
  requestedSource: {
    revision: { id: id(4), version: 7 },
    canonicalBindingVersion: 3,
  },
  control: {
    version: 1,
    currentAuthorizationRequestId: null,
    cancelledAt: null,
  },
  consent: null,
  reconciliation: "accounted",
  accounting: { outcome: "applied", sourceRevision: { id: id(5), version: 6 } },
  commandReceipt: null,
  observedAt: "2026-10-17T12:00:00.000Z",
};
const output = {
  schemaVersion: 1,
  scope: "planner_project_receipts",
  clientId: client.id,
  objective: generation.objective,
  workAction: "objective.plan.prepare",
  requestedSource: generation.requestedSource,
  selectedSource: generation.requestedSource,
  observation: {
    state: "applied",
    strategy: { availability: "unavailable" },
    planner: {
      availability: "available",
      projects: [
        {
          availability: "available",
          creation: {
            receiptVersion: 2,
            recordedAt: "2026-10-17T11:00:00.000Z",
            version: 1,
          },
          application: {
            receiptVersion: 3,
            recordedAt: "2026-10-17T11:30:00.000Z",
          },
          current: {
            selection: { kind: "planner_project", id: id(6) },
            title: "Human edited project",
            ownerVersion: { kind: "counter", value: 4 },
            observedAt: "2026-10-17T12:01:00.000Z",
          },
        },
      ],
    },
  },
  taskDiscovery: "unsupported",
  observedAt: "2026-10-17T12:01:00.000Z",
};

function readApi(
  generationValue: unknown = generation,
  outputValue: unknown = output,
) {
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    const key = new URL(String(url), "https://example.invalid").pathname;
    return Response.json(
      key.endsWith("/objectives.governedGeneration.read")
        ? generationValue
        : outputValue,
    );
  });
  return {
    api: createCapiroApi(capiroOperations, { fetcher }),
    fetcher,
  };
}

describe("governed Planner Portfolio receiving", () => {
  it("selects only the current ready Objective in the active selected client", () => {
    expect(currentGovernedPlannerRequest(objective, client)).toEqual({
      params: { clientId: client.id, objectiveId: objective.id },
      query: { workAction: "objective.plan.prepare" },
    });
    for (const changed of [
      { ...client, id: id(9) },
      { ...client, status: "archived" },
    ])
      expect(() => currentGovernedPlannerRequest(objective, changed)).toThrow();
    expect(() =>
      currentGovernedPlannerRequest(
        { ...objective, status: "in_review" },
        client,
      ),
    ).toThrow();
  });

  it("keeps a newer editable Objective and requested source separate from old accounting", () => {
    const current = requireCurrentGovernedPlannerGeneration(
      generation,
      objective,
      client,
    );
    expect(current.objective.revision.version).toBe(8);
    expect(current.requestedSource.revision.version).toBe(7);
    expect(current.accounting?.sourceRevision.version).toBe(6);
    expect(() =>
      requireCurrentGovernedPlannerGeneration(
        {
          ...generation,
          objective: {
            ...generation.objective,
            revision: { id: id(8), version: 9 },
          },
        },
        objective,
        client,
      ),
    ).toThrow();
  });

  it("rechecks both exact GETs and returns only a verified current Planner route", async () => {
    const { api, fetcher } = readApi();
    const href = await reverifyCurrentGovernedPlannerProject(
      api,
      objective,
      client,
      id(6),
      new AbortController().signal,
    );
    expect(href).toBe(
      `/modules/planner?view=projects&clientId=${client.id}&project=${id(6)}`,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    const first = new URL(
      String(fetcher.mock.calls[0]![0]),
      "https://example.invalid",
    );
    const second = new URL(
      String(fetcher.mock.calls[1]![0]),
      "https://example.invalid",
    );
    expect(first.pathname).toBe(
      "/api/capiro/objectives.governedGeneration.read",
    );
    expect(second.pathname).toBe("/api/capiro/objectives.governedOutputs.read");
    expect(JSON.parse(second.searchParams.get("input")!)).toEqual({
      params: { clientId: client.id, objectiveId: objective.id },
      query: {
        workAction: "objective.plan.prepare",
        sourceRevisionId: id(4),
        sourceObjectiveVersion: "7",
        canonicalBindingVersion: "3",
      },
    });
    expect(fetcher.mock.calls.every((call) => call[1]?.method === "GET")).toBe(
      true,
    );
  });

  it("stops after a changed Objective before issuing the output GET", async () => {
    const { api, fetcher } = readApi({
      ...generation,
      objective: {
        ...generation.objective,
        revision: { id: id(8), version: 9 },
      },
    });
    await expect(
      reverifyCurrentGovernedPlannerProject(
        api,
        objective,
        client,
        id(6),
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("withholds a changed source, a masked project, or a replaced project", async () => {
    const changedSource = {
      ...output,
      selectedSource: {
        ...output.selectedSource,
        revision: { id: id(5), version: 6 },
      },
    };
    const masked = {
      ...output,
      observation: {
        ...output.observation,
        planner: {
          availability: "unavailable",
          projects: [
            {
              availability: "unavailable",
              creation: null,
              application: null,
              current: null,
            },
          ],
        },
      },
    };
    for (const payload of [changedSource, masked]) {
      const { api, fetcher } = readApi(generation, payload);
      await expect(
        reverifyCurrentGovernedPlannerProject(
          api,
          objective,
          client,
          id(6),
          new AbortController().signal,
        ),
      ).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledTimes(2);
    }
    const { api } = readApi();
    await expect(
      reverifyCurrentGovernedPlannerProject(
        api,
        objective,
        client,
        id(7),
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    expect(
      receiveCurrentGovernedPlannerRead(masked, generation, objective, client)
        .currentProject,
    ).toBeNull();
  });

  it("aborts before the first read instead of navigating from a replaced scope", async () => {
    const { api, fetcher } = readApi();
    const controller = new AbortController();
    controller.abort();
    await expect(
      reverifyCurrentGovernedPlannerProject(
        api,
        objective,
        client,
        id(6),
        controller.signal,
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
