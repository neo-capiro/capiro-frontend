import { describe, expect, it, vi } from "vitest";
import { STRATEGY_INTAKE_FIELDS } from "@capiro/shared/strategy-intake";
import {
  INTAKE_SEED_PARAMS,
  objectiveIntakeSeed,
  withoutIntakeSeed,
} from "../src/features/portfolio/objectives/intake-seed";

/** The address Meri's conversation link carries (meri-greenfield request-context.mjs): client in the route, seed in the query. */
const clientId = "00000000-0000-4000-8000-0000000000aa";
const link =
  `/portfolio/${clientId}/objectives?new=1` +
  "&goal=Secure%20FY2027%20appropriations%20language%20for%20the%20program" +
  "&context=The%20client%27s%20fiscal%20year%20ends%20in%20September%3B%20the%20House%20bill%20is%20marked%20up%20in%20June.";
const query = (address: string) =>
  new URLSearchParams(address.slice(address.indexOf("?")));

describe("objectiveIntakeSeed", () => {
  it("reads the percent-encoded goal and context from the intake link", () => {
    const params = query(link);
    expect(params.has("new")).toBe(true);
    expect(objectiveIntakeSeed(params)).toEqual({
      goal: "Secure FY2027 appropriations language for the program",
      meriContext:
        "The client's fiscal year ends in September; the House bill is marked up in June.",
    });
  });

  it("is absent for a plain New objective address or empty parameters", () => {
    expect(objectiveIntakeSeed(new URLSearchParams("new=1"))).toBeUndefined();
    expect(
      objectiveIntakeSeed(new URLSearchParams("new=1&goal=%20%20&context=")),
    ).toBeUndefined();
  });

  it("keeps a goal without context and trims whitespace runs", () => {
    expect(
      objectiveIntakeSeed(new URLSearchParams("new=1&goal=%20Protect%0A%0Afunding%20")),
    ).toEqual({ goal: "Protect funding", meriContext: "" });
  });

  it("clips each field to the shared Strategy-intake bound so the seeded draft still parses", () => {
    const params = new URLSearchParams({
      new: "1",
      goal: "g".repeat(STRATEGY_INTAKE_FIELDS.goal.maxLength + 5),
      context: "c".repeat(STRATEGY_INTAKE_FIELDS.meriContext.maxLength + 5),
    });
    const seed = objectiveIntakeSeed(params);
    expect(seed?.goal).toHaveLength(STRATEGY_INTAKE_FIELDS.goal.maxLength);
    expect(seed?.meriContext).toHaveLength(
      STRATEGY_INTAKE_FIELDS.meriContext.maxLength,
    );
  });
});

describe("withoutIntakeSeed", () => {
  it("removes only the seed parameters and leaves the rest of the address", () => {
    const params = query(link);
    params.set("filter", "active");
    const next = withoutIntakeSeed(params);
    for (const key of INTAKE_SEED_PARAMS) expect(next.has(key)).toBe(false);
    expect(next.get("new")).toBe("1");
    expect(next.get("filter")).toBe("active");
    expect(params.get("goal")).not.toBeNull();
  });
});

/** The editor session seeds the Strategy-intake answers of a new objective only. */
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock("react", async () => ({
  ...(await vi.importActual<typeof import("react")>("react")),
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (hooks.values.length <= slot)
      hooks.values[slot] = typeof initial === "function" ? initial() : initial;
    return [
      hooks.values[slot],
      (value: unknown) => {
        hooks.values[slot] =
          typeof value === "function" ? value(hooks.values[slot]) : value;
      },
    ];
  },
  useEffect: () => {},
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({ data: { user: { clerkUserId: "user_owner" } } }),
}));
vi.mock("../src/features/portfolio/objectives/mutations", () => ({
  useSaveObjective: () => ({ isPending: false, canWrite: true, mutate: vi.fn() }),
}));
const { useObjectiveEditorSession } = await import(
  "../src/features/portfolio/objectives/useObjectiveEditorSession"
);

describe("useObjectiveEditorSession", () => {
  it("starts a new objective from the seed with the owner from identity", () => {
    hooks.values = [];
    hooks.cursor = 0;
    const session = useObjectiveEditorSession({
      clientId,
      seed: { goal: "Protect funding", meriContext: "FY ends in September." },
      onSaved: vi.fn(),
    });
    expect(session.fields.strategyIntake).toMatchObject({
      goal: "Protect funding",
      meriContext: "FY ends in September.",
      ownerUserId: "user_owner",
      type: null,
    });
    expect(session.draftStatus).toBe("Draft not saved yet");
  });

  it("never rewrites a saved objective from a seed", () => {
    hooks.values = [];
    hooks.cursor = 0;
    const objective = {
      id: "o1",
      clientId,
      version: 1,
      status: "draft" as const,
      outcome: "Saved outcome",
      governmentProblem: "",
      askType: null,
      minimumWin: "",
      limits: "",
    };
    const session = useObjectiveEditorSession({
      clientId,
      objective: objective as never,
      seed: { goal: "Protect funding", meriContext: "" },
      onSaved: vi.fn(),
    });
    expect(session.fields).toBe(objective);
  });
});
