import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CONVERSATION_SKILLS } from "@capiro/meri-contracts/conversation-application";
import type { ConversationSkillSelection } from "../src/shared/meri-conversations/query-journal";
import {
  CORE_QUICK_ACTION_IDS,
  QUICK_SKILL_PREFIX,
  UNGATED_SKILL_IDS,
  gateMessage,
  gatedSkillIds,
  newSelectionAllowed,
  offeredSkillIds,
  quickActionGate,
} from "../src/features/meri/conversation/quick-action-gate";
import {
  SkillSelectionPicker,
  skillsForScope,
} from "../src/features/meri/conversation/SkillSelectionPicker";

/**
 * SCRUM-240 — the composer's skill selection must follow Core's QuickActions rollout for NEW intent
 * while the bundled typed contract stays authoritative and an already applied selection is never
 * rewritten.
 */

const typedIds = CONVERSATION_SKILLS.map((skill) => skill.skillId);
const allCoreIds = [...CORE_QUICK_ACTION_IDS];

it("maps the fourteen Core quick actions onto the bundled typed ids explicitly", () => {
  expect(allCoreIds).toHaveLength(14);
  expect(gatedSkillIds.size).toBe(14);
  for (const id of allCoreIds) {
    expect(typedIds).toContain(`${QUICK_SKILL_PREFIX}${id}`);
  }
});

it("leaves cited_report outside the Core catalog and never invents a fifteenth starter", () => {
  expect(UNGATED_SKILL_IDS).toEqual(["quick_skill.cited_report"]);
  expect(gatedSkillIds.has("quick_skill.cited_report")).toBe(false);
  // Drift guard: the typed catalog is exactly the fourteen Core actions plus the native report skill.
  expect(new Set(typedIds)).toEqual(
    new Set([...gatedSkillIds, ...UNGATED_SKILL_IDS]),
  );
  expect(typedIds).toHaveLength(15);
});

it("offers the full typed set when Core reports the rollout on", () => {
  const gate = quickActionGate({
    pending: false,
    failed: false,
    enabled: true,
    ids: allCoreIds,
  });
  expect(gate.status).toBe("on");
  const offered = offeredSkillIds(gate);
  expect(offered.size).toBe(15);
  for (const id of typedIds) expect(offered.has(id)).toBe(true);
  expect(gateMessage(gate)).toBeUndefined();
});

it("offers only the ids Core actually listed", () => {
  const gate = quickActionGate({
    pending: false,
    failed: false,
    enabled: true,
    ids: ["research_company", "bill_watch"],
  });
  const offered = offeredSkillIds(gate);
  expect([...offered].sort()).toEqual([
    "quick_skill.bill_watch",
    "quick_skill.cited_report",
    "quick_skill.research_company",
  ]);
  expect(newSelectionAllowed(gate, "quick_skill.bill_watch")).toBe(true);
  expect(newSelectionAllowed(gate, "quick_skill.hearing_watch")).toBe(false);
});

it("suppresses every gated skill when the rollout is off but keeps cited_report", () => {
  const gate = quickActionGate({ pending: false, failed: false, enabled: false });
  expect(gate.status).toBe("off");
  expect([...offeredSkillIds(gate)]).toEqual(["quick_skill.cited_report"]);
  expect(newSelectionAllowed(gate, "quick_skill.research_company")).toBe(false);
  expect(newSelectionAllowed(gate, "quick_skill.cited_report")).toBe(true);
  expect(gateMessage(gate)).toContain("turned off");
});

it("refuses gated selections while loading or unavailable", () => {
  const loading = quickActionGate({ pending: true, failed: false });
  const unavailable = quickActionGate({ pending: false, failed: true });
  for (const gate of [loading, unavailable]) {
    expect(newSelectionAllowed(gate, "quick_skill.meeting_prep")).toBe(false);
    expect(newSelectionAllowed(gate, "quick_skill.cited_report")).toBe(true);
    expect(gateMessage(gate)).toBeTruthy();
  }
  expect(loading.status).toBe("loading");
  expect(unavailable.status).toBe("unavailable");
});

it("never rewrites an already applied typed selection when the rollout turns off", () => {
  const applied: ConversationSkillSelection = {
    skill: { skillId: "quick_skill.commitments_audit", skillVersion: "1.0.0" },
    windowRequest: { basis: "unbounded" },
  };
  const before = JSON.stringify(applied);
  const gate = quickActionGate({ pending: false, failed: false, enabled: false });
  expect(newSelectionAllowed(gate, applied.skill!.skillId)).toBe(false);
  // The gate is a decision function only: the retained selection bytes are untouched.
  expect(JSON.stringify(applied)).toBe(before);
  expect(applied.skill?.skillVersion).toBe("1.0.0");
});

it("renders only offered skills for a client scope when the rollout is off", () => {
  const markup = renderToStaticMarkup(
    createElement(SkillSelectionPicker, {
      selection: {},
      clientId: "11111111-2222-3333-4444-555555555555",
      disabled: false,
      gate: quickActionGate({ pending: false, failed: false, enabled: false }),
      onChange: () => {},
    }),
  );
  const clientChoices = skillsForScope(
    "11111111-2222-3333-4444-555555555555",
  ).map((skill) => skill.skillId);
  // With the rollout off every gated client choice disappears; the native report skill stays.
  for (const id of clientChoices) {
    if (gatedSkillIds.has(id)) expect(markup).not.toContain(id);
  }
  expect(markup).toContain("turned off");
  expect(markup).toContain("Apply to draft");
});

it("renders the whole typed client scope when the rollout is on", () => {
  const markup = renderToStaticMarkup(
    createElement(SkillSelectionPicker, {
      selection: {},
      clientId: "11111111-2222-3333-4444-555555555555",
      disabled: false,
      gate: quickActionGate({
        pending: false,
        failed: false,
        enabled: true,
        ids: allCoreIds,
      }),
      onChange: () => {},
    }),
  );
  for (const skill of skillsForScope("11111111-2222-3333-4444-555555555555")) {
    expect(markup).toContain(skill.skillId);
  }
});
