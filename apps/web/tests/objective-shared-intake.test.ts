import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  emptyStrategyIntake,
  parseStrategyIntake,
  STRATEGY_INTAKE_FIELDS,
} from "@capiro/shared/strategy-intake";
import {
  emptyFields,
  objectiveReadiness,
  objectiveSavedStatusNote,
  objectiveSchema,
  objectiveFieldsSchema,
  sameObjectiveFields,
  type Objective,
} from "../src/features/portfolio/objectives/contracts";
import { saveObjective } from "../src/features/portfolio/objectives/writer";
import type { ApiClient } from "../src/shared/portfolio/api/http";
import { ObjectiveFields } from "../src/features/portfolio/objectives/ObjectiveFields";
import { ObjectiveReadiness } from "../src/features/portfolio/objectives/ObjectiveReadiness";
import { StrategyIntakeFields } from "../src/shared/strategy-intake/StrategyIntakeFields";

vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({
    data: { people: [{ id: "user_synthetic", name: "Synthetic owner" }] },
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));
const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const intake = {
  ...emptyStrategyIntake("user_synthetic"),
  type: "appropriations" as const,
  goal: "A".repeat(4000),
  meriContext: "B".repeat(8000),
  targetDate: "2027-02-28",
};
const fields = { ...emptyFields, strategyIntake: intake };
function record(overrides: Partial<Objective> = {}): Objective {
  return objectiveSchema.parse({
    ...fields,
    id: id(1),
    clientId: id(2),
    requestId: id(3),
    ownerUserId: id(4),
    status: "draft",
    version: 1,
    readyAt: null,
    reviewRequestedAt: null,
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    readiness: objectiveReadiness(fields),
    ...overrides,
  });
}

describe("one shared Strategy intake", () => {
  it("renders exactly the same questionnaire inside Objective and Strategy entry", () => {
    const props = { value: intake, disabled: false, onChange: vi.fn() };
    const objective = renderToStaticMarkup(
      createElement(ObjectiveFields, {
        fields,
        onChange: vi.fn(),
        disabled: false,
        presentation: "page",
      }),
    );
    const strategy = renderToStaticMarkup(
      createElement(StrategyIntakeFields, props),
    );
    // React useId seeds differ across roots; compare the user-visible labels and limits.
    for (const definition of Object.values(STRATEGY_INTAKE_FIELDS).filter(
      (d) => d.label !== "Client",
    )) {
      expect(objective).toContain(definition.label);
      expect(strategy).toContain(definition.label);
    }
    expect(objective).toContain('maxLength="4000"');
    expect(objective).toContain('maxLength="8000"');
    expect(objective).not.toContain("Minimum win");
    expect(objective).not.toContain("Government problem");
    expect(objective).toContain("Goal statement · Required");
    expect(strategy).toContain("Context for Meri · Optional");
  });
  it("round-trips full answers and accepts optional empty context/date without fabricated legacy answers", () => {
    expect(objectiveSchema.parse(record()).strategyIntake).toEqual(intake);
    expect(
      objectiveReadiness({
        ...fields,
        strategyIntake: { ...intake, meriContext: "", targetDate: null },
      }).isReady,
    ).toBe(true);
    expect(record().governmentProblem).toBe("");
    expect(record().minimumWin).toBe("");
    expect(
      sameObjectiveFields(fields, JSON.parse(JSON.stringify(fields))),
    ).toBe(true);
    expect(
      sameObjectiveFields(fields, {
        ...fields,
        strategyIntake: { ...intake, goal: "Changed" },
      }),
    ).toBe(false);
  });
  it.each([
    { goal: "A".repeat(4001) },
    { meriContext: "B".repeat(8001) },
    { targetDate: "2027-02-29" },
    { type: "invented" },
  ])("uses the same server parser for invalid answers %j", (delta) => {
    const invalid = { ...intake, ...delta };
    expect(() => parseStrategyIntake(invalid)).toThrow();
    expect(
      objectiveFieldsSchema.safeParse({ ...fields, strategyIntake: invalid })
        .success,
    ).toBe(false);
  });
  it("keeps older Objective records readable and validates their original readiness", () => {
    const legacy = {
      ...emptyFields,
      outcome: "Original",
      governmentProblem: "Original problem",
      askType: "funding" as const,
      minimumWin: "Original win",
    };
    const saved = record({
      ...legacy,
      strategyIntake: undefined,
      readiness: objectiveReadiness(legacy),
    });
    expect(saved.strategyIntake).toBeUndefined();
    expect(saved.minimumWin).toBe("Original win");
    expect(
      objectiveSchema.safeParse({
        ...saved,
        readiness: objectiveReadiness(fields),
      }).success,
    ).toBe(false);
  });
  it("saves once and recovers the same saved answers after a failed ready transition", async () => {
    let persisted: Objective | undefined;
    const calls: string[] = [];
    const api = {
      request: vi.fn(async (_service, path, schema, options) => {
        calls.push(options.method);
        if (path.endsWith("objectives")) return schema.parse(record());
        if (calls.length === 2) throw new Error("lost transition response");
        return schema.parse(record({ version: 2, status: "ready" }));
      }),
    } as unknown as ApiClient;
    await expect(
      saveObjective(
        api,
        id(2),
        { fields, requestId: id(3) },
        "confirm_ready",
        (r) => {
          persisted = r;
        },
      ),
    ).rejects.toThrow("lost transition");
    expect(persisted?.strategyIntake).toEqual(intake);
    const ready = await saveObjective(
      api,
      id(2),
      { fields, record: persisted, requestId: id(3) },
      "confirm_ready",
      () => {},
    );
    expect(calls).toEqual(["POST", "POST", "POST"]);
    expect(ready.id).toBe(persisted?.id);
    expect(ready.strategyIntake).toEqual(intake);
  });
  it("refuses mismatched saved answers or client and stops a canceled continuation", async () => {
    for (const bad of [
      record({ clientId: id(9) }),
      record({ strategyIntake: { ...intake, goal: "Substituted" } }),
    ]) {
      const api = { request: async () => bad } as unknown as ApiClient;
      await expect(
        saveObjective(
          api,
          id(2),
          { fields, requestId: id(3) },
          "save",
          () => {},
        ),
      ).rejects.toThrow("exact objective");
    }
    const controller = new AbortController();
    let calls = 0;
    const api = {
      request: async () => {
        calls++;
        controller.abort();
        return record();
      },
    } as unknown as ApiClient;
    await expect(
      saveObjective(
        api,
        id(2),
        { fields, requestId: id(3) },
        "confirm_ready",
        () => {},
        {
          signal: controller.signal,
          guard: () => controller.signal.throwIfAborted(),
        },
      ),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });
});

describe("editor status line", () => {
  it("agrees with the readiness note once a complete intake draft is saved", () => {
    const saved = record();
    const readinessNote = renderToStaticMarkup(
      createElement(ObjectiveReadiness, { fields: saved }),
    );
    expect(readinessNote).toContain(
      "3 of 3 required fields complete. Ready for review or confirmation.",
    );
    expect(objectiveSavedStatusNote(saved)).toBe(
      "Required fields saved. Request review or confirm ready.",
    );
  });

  it("asks for the required fields only while the saved draft is incomplete", () => {
    const incomplete = { ...fields, strategyIntake: { ...intake, goal: " " } };
    const saved = record({
      strategyIntake: incomplete.strategyIntake,
      readiness: objectiveReadiness(incomplete),
    });
    expect(saved.readiness.isReady).toBe(false);
    expect(objectiveSavedStatusNote(saved)).toBe(
      "Complete the required fields before review or ready.",
    );
    expect(objectiveSavedStatusNote(undefined)).toBe(
      "Complete the required fields before review or ready.",
    );
  });

  it("reports the saved review and ready states", () => {
    expect(objectiveSavedStatusNote(record({ status: "in_review" }))).toBe(
      "Review requested. Confirm ready when approved.",
    );
    expect(objectiveSavedStatusNote(record({ status: "ready" }))).toBe(
      "Confirmed ready.",
    );
  });
});
