import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  Children,
  isValidElement,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
import { CONVERSATION_SKILLS } from "@capiro/meri-contracts/conversation-application";
import {
  SkillSelectionPicker,
  WINDOW_DAYS_MAX,
} from "../src/features/meri/conversation/SkillSelectionPicker";
import {
  ALL_TYPED_SKILL_IDS,
  type QuickActionGate,
} from "../src/features/meri/conversation/quick-action-gate";
import type { ConversationSkillSelection } from "../src/shared/meri-conversations/query-journal";

/**
 * VQA-026 / B007-07 + B007-08: the typed Skill time window is validated locally, so an invalid draft
 * gets precise feedback and a closed Apply instead of reaching the receiver's generic message — and a
 * reversed explicit window never reaches `onChange`. The canonical server window validation is
 * untouched: this only refuses earlier.
 *
 * Mounted the way this workspace mounts components (jsdom and @testing-library/react are not
 * resolvable): the real component body runs with a controlled `useState`, the resulting element tree
 * is rendered, and the real Apply/input handlers from that tree are invoked. Applying only changes the
 * draft selection — nothing is sent, so the fetch spy must stay untouched.
 */

type Window = NonNullable<ConversationSubmitRequest["windowRequest"]>;
const observed = vi.hoisted(() => ({
  state: [] as unknown[],
  index: 0,
  onChange: (() => undefined) as unknown as (
    selection: ConversationSkillSelection,
  ) => void,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: <T>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] => {
    const index = observed.index++;
    if (!(index in observed.state))
      observed.state[index] =
        typeof initial === "function" ? (initial as () => T)() : initial;
    return [
      observed.state[index] as T,
      (next) => {
        observed.state[index] =
          typeof next === "function"
            ? (next as (previous: T) => T)(observed.state[index] as T)
            : next;
      },
    ];
  },
}));

const SKILL_ID = "quick_skill.mail_history";
const SKILL_VERSION = CONVERSATION_SKILLS.find(
  (skill) => skill.skillId === SKILL_ID,
)!.version;
const TIMEZONE = "America/New_York";
const ANCHOR = "2026-11-03T12:00:00Z";
/** Whole-day rejection text as the component states it. */
const daysMessage = `Enter a whole number of days from 1 to ${WINDOW_DAYS_MAX}.`;
const orderingMessage = "The end must be after the start.";

/** The draft already applied before this interaction; it must survive an invalid edit. */
const applied: ConversationSkillSelection = {
  skill: { skillId: SKILL_ID, skillVersion: SKILL_VERSION },
  windowRequest: {
    basis: "explicit",
    startInclusive: "2026-10-31T04:00:00.000Z",
    endExclusive: "2026-11-02T05:00:00.000Z",
    timezone: TIMEZONE,
  },
};
const gate: QuickActionGate = {
  status: "on",
  available: new Set(ALL_TYPED_SKILL_IDS),
};

type Draft = {
  skillId: string;
  basis: Window["basis"];
  timezone: string;
  offset: -1 | 0;
  weekStartsOn: "monday" | "sunday";
  days: number;
  anchorAt: string;
  start: string;
  end: string;
  error: string | undefined;
};
const draft = (overrides: Partial<Draft> = {}): Draft => ({
  skillId: SKILL_ID,
  basis: "unbounded",
  timezone: TIMEZONE,
  offset: -1,
  weekStartsOn: "monday",
  days: 30,
  anchorAt: ANCHOR,
  start: "",
  end: "",
  error: undefined,
  ...overrides,
});
/** Hook order of the real component: the controlled state replaces exactly those `useState` slots. */
const seed = (value: Draft) =>
  (observed.state = [
    value.skillId,
    value.basis,
    value.timezone,
    value.offset,
    value.weekStartsOn,
    value.days,
    value.anchorAt,
    value.start,
    value.end,
    value.error,
  ]);
function render(value: Draft) {
  seed(value);
  observed.index = 0;
  const tree = SkillSelectionPicker({
    selection: applied,
    clientId: "synthetic-client",
    disabled: false,
    gate,
    onChange: observed.onChange,
  }) as ReactElement;
  // Static markup proves what a user would actually see for this state.
  renderToStaticMarkup(tree);
  return tree;
}
type Element = ReactElement<{ children?: ReactNode; [key: string]: unknown }>;
const walk = (node: ReactNode, found: Element[] = []): Element[] => {
  for (const child of Children.toArray(node)) {
    if (!isValidElement(child)) continue;
    found.push(child as Element);
    walk((child.props as { children?: ReactNode }).children, found);
  }
  return found;
};
const apply = (tree: ReactNode) => {
  const button = walk(tree).find(
    (element) =>
      element.type === "button" && element.props.children === "Apply to draft",
  );
  if (!button) throw new Error("Missing the actual Apply control");
  return button;
};
const input = (tree: ReactNode, label: string) => {
  const field = walk(tree).find(
    (element) =>
      element.type === "label" &&
      Children.toArray(element.props.children).some(
        (child) => typeof child === "string" && child.trim() === label,
      ),
  );
  const control = walk(field?.props.children as ReactNode).find(
    (element) => element.type === "input",
  );
  if (!control) throw new Error(`Missing the actual ${label} input`);
  return control;
};
const alerts = (tree: ReactNode) =>
  walk(tree)
    .filter((element) => element.type === "p" && element.props.role === "alert")
    .map((element) => Children.toArray(element.props.children).join(""));
const appliedWindow = (tree: ReactNode) =>
  walk(tree).find(
    (element) =>
      element.type === "p" &&
      Children.toArray(element.props.children).join("").startsWith("Applied"),
  );
let dispatched: ReturnType<typeof vi.fn>;
beforeEach(() => {
  observed.onChange = vi.fn() as unknown as typeof observed.onChange;
  dispatched = vi.fn();
  vi.stubGlobal("fetch", dispatched);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

it("refuses zero days with precise feedback, a closed Apply and no dispatch", () => {
  const tree = render(draft({ basis: "relative-duration", days: 0 }));
  expect(alerts(tree)).toEqual([daysMessage]);
  expect(apply(tree).props.disabled).toBe(true);
  expect(input(tree, "Days").props["aria-invalid"]).toBe(true);
  // Even if the control were invoked programmatically, the draft cannot be admitted.
  (apply(tree).props.onClick as () => void)();
  expect(observed.onChange).not.toHaveBeenCalled();
  expect(dispatched).not.toHaveBeenCalled();
  // The previously applied selection is preserved in the visible applied-window line.
  expect(Children.toArray(appliedWindow(tree)?.props.children).join("")).toBe(
    "Applied window: Date range · " + TIMEZONE,
  );
});

it.each([[-1], [0], [1.5], [WINDOW_DAYS_MAX + 1]])(
  "refuses %s days before Apply",
  (days) => {
    const tree = render(draft({ basis: "relative-duration", days }));
    expect(alerts(tree)).toEqual([daysMessage]);
    expect(apply(tree).props.disabled).toBe(true);
    (apply(tree).props.onClick as () => void)();
    expect(observed.onChange).not.toHaveBeenCalled();
  },
);

it("applies a corrected positive day count through the public receiver", () => {
  const tree = render(draft({ basis: "relative-duration", days: 1 }));
  expect(alerts(tree)).toEqual([]);
  expect(apply(tree).props.disabled).toBe(false);
  (apply(tree).props.onClick as () => void)();
  expect(observed.onChange).toHaveBeenCalledExactlyOnceWith({
    skill: { skillId: SKILL_ID, skillVersion: SKILL_VERSION },
    windowRequest: {
      basis: "relative-duration",
      days: 1,
      anchorAt: "2026-11-03T12:00:00.000Z",
      timezone: TIMEZONE,
    },
  });
  const admitted = (
    observed.onChange as unknown as { mock: { calls: unknown[][] } }
  ).mock.calls[0]![0] as ConversationSkillSelection;
  expect(Object.isFrozen(admitted.windowRequest)).toBe(true);
  expect(admitted).not.toHaveProperty("prompt");
  expect(dispatched).not.toHaveBeenCalled();
});

it("accepts the published upper day bound", () => {
  const tree = render(
    draft({ basis: "relative-duration", days: WINDOW_DAYS_MAX }),
  );
  expect(alerts(tree)).toEqual([]);
  expect(apply(tree).props.disabled).toBe(false);
});

it("refuses a reversed explicit window with precise feedback and no onChange", () => {
  const tree = render(
    draft({
      basis: "explicit",
      start: "2026-11-04T00:00:00.000Z",
      end: "2026-11-03T00:00:00.000Z",
    }),
  );
  expect(alerts(tree)).toEqual([orderingMessage]);
  expect(apply(tree).props.disabled).toBe(true);
  expect(input(tree, "End, exclusive").props["aria-invalid"]).toBe(true);
  (apply(tree).props.onClick as () => void)();
  expect(observed.onChange).not.toHaveBeenCalled();
  expect(dispatched).not.toHaveBeenCalled();
});

it("refuses equal start and end instants", () => {
  const tree = render(
    draft({
      basis: "explicit",
      start: "2026-11-03T00:00:00.000Z",
      end: "2026-11-03T00:00:00.000Z",
    }),
  );
  expect(alerts(tree)).toEqual([orderingMessage]);
  expect(apply(tree).props.disabled).toBe(true);
  (apply(tree).props.onClick as () => void)();
  expect(observed.onChange).not.toHaveBeenCalled();
});

it("applies a corrected increasing explicit window as canonical UTC instants", () => {
  const tree = render(
    draft({
      basis: "explicit",
      start: "2026-11-02T20:00:00-04:00",
      end: "2026-11-03T19:00:00-05:00",
    }),
  );
  expect(alerts(tree)).toEqual([]);
  expect(apply(tree).props.disabled).toBe(false);
  (apply(tree).props.onClick as () => void)();
  expect(observed.onChange).toHaveBeenCalledExactlyOnceWith({
    skill: { skillId: SKILL_ID, skillVersion: SKILL_VERSION },
    windowRequest: {
      basis: "explicit",
      startInclusive: "2026-11-03T00:00:00.000Z",
      endExclusive: "2026-11-04T00:00:00.000Z",
      timezone: TIMEZONE,
    },
  });
  expect(dispatched).not.toHaveBeenCalled();
});

it("keeps the local day bound equal to the published contract schema", () => {
  const schema = JSON.parse(
    readFileSync(
      createRequire(import.meta.url).resolve(
        "@capiro/meri-contracts/conversation-application/schema",
      ),
      "utf8",
    ),
  ) as unknown;
  const relative = (node: unknown): { minimum: number; maximum: number } => {
    if (!node || typeof node !== "object") throw new Error("No days bound");
    const record = node as Record<string, unknown>;
    const properties = record.properties as
      | Record<string, { const?: string; minimum?: number; maximum?: number }>
      | undefined;
    if (
      properties?.basis?.const === "relative-duration" &&
      properties.days?.minimum !== undefined
    )
      return properties.days as { minimum: number; maximum: number };
    for (const value of Object.values(record))
      if (value && typeof value === "object") {
        try {
          return relative(value);
        } catch {
          continue;
        }
      }
    throw new Error("No days bound");
  };
  expect(relative(schema)).toMatchObject({
    minimum: 1,
    maximum: WINDOW_DAYS_MAX,
  });
});
