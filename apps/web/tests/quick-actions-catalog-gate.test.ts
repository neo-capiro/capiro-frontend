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
import { composerAvailability } from "../src/features/meri/conversation/MeriLiveConversation";
import { MeriComposer } from "../src/features/meri/MeriComposer";
import {
  applyCatalogAnswer,
  catalogGate,
  initialCatalogState,
} from "../src/features/meri/conversation/useQuickActionCatalog";
import { newIntentRefusal } from "../src/features/meri/conversation/quick-action-gate";

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

// ---------------------------------------------------------------------------------------------
// P2-1 — a NEW submission/next turn must be refused, not only a new picker choice
// ---------------------------------------------------------------------------------------------
const applied = {
  skill: { skillId: "quick_skill.commitments_audit", skillVersion: "1.0.0" },
  windowRequest: { basis: "unbounded" as const },
};
const onAll = quickActionGate({
  pending: false,
  failed: false,
  enabled: true,
  ids: allCoreIds,
});

it("refuses a new intent carrying a gated skill while the rollout is closed", () => {
  for (const gate of [
    quickActionGate({ pending: false, failed: false, enabled: false }),
    quickActionGate({ pending: true, failed: false }),
    quickActionGate({ pending: false, failed: true }),
    quickActionGate({ pending: false, failed: false, enabled: true, ids: ["bill_watch"] }),
  ]) {
    expect(newIntentRefusal(gate, applied)).toBeTruthy();
  }
  expect(newIntentRefusal(onAll, applied)).toBeUndefined();
  expect(newIntentRefusal(quickActionGate({ pending: true, failed: false }), {})).toBeUndefined();
  expect(
    newIntentRefusal(quickActionGate({ pending: false, failed: false, enabled: false }), {
      skill: { skillId: "quick_skill.cited_report", skillVersion: "1.0.0" },
    }),
  ).toBeUndefined();
});

it("blocks Send through the real availability decision and keeps the draft", () => {
  const run = { intent: {}, busy: false, snapshot: { status: "ready", observation: {} } } as never;
  const blocked = composerAvailability(
    run,
    null,
    [],
    undefined,
    undefined,
    "Quick actions are turned off for this workspace.",
    undefined,
    false,
    false,
  );
  // The composer still knows this is the first-send path; the rollout refusal is what closes Send.
  expect(blocked.initial).toBe(true);
  expect(blocked.sendBlocked).toBe("Quick actions are turned off for this workspace.");
  expect(blocked.readyForNext).toBe(false);

  const open = composerAvailability(
    run,
    null,
    [],
    undefined,
    undefined,
    undefined,
    undefined,
    false,
    false,
  );
  expect(open.initial).toBe(true);
  expect(open.sendBlocked).toBeUndefined();
});

it("renders the real Send control disabled with the refusal reason", () => {
  const markup = renderToStaticMarkup(
    createElement(MeriComposer, {
      draft: "Summarise this client's commitments",
      onDraft: () => {},
      textareaRef: { current: null },
      live: {
        onSend: () => {},
        onStop: () => {},
        sendBlocked: "Quick actions are turned off for this workspace.",
        scope: "client",
        attachUnavailable: "Attachments unavailable",
      },
    }),
  );
  expect(markup).toContain("Quick actions are turned off for this workspace.");
  expect(markup).not.toContain(">Send to Meri<");
});

// ---------------------------------------------------------------------------------------------
// P2-2 — no cached or previous-tenant admission while a current read is pending
// ---------------------------------------------------------------------------------------------
const loadedA = {
  key: "tenant-a",
  status: "loaded" as const,
  enabled: true,
  ids: allCoreIds,
};

it("never admits from an idle or unbound read", () => {
  expect(catalogGate(initialCatalogState, null).status).toBe("loading");
  expect(catalogGate(initialCatalogState, "tenant-a").status).toBe("loading");
  expect(newSelectionAllowed(catalogGate(initialCatalogState, "tenant-a"), "quick_skill.bill_watch")).toBe(false);
});

it("never exposes another tenant's answer, even before the new read resolves", () => {
  expect(catalogGate(loadedA, "tenant-a").status).toBe("on");
  expect(catalogGate(loadedA, "tenant-b").status).toBe("loading");
  expect(catalogGate(loadedA, null).status).toBe("loading");
  expect(newSelectionAllowed(catalogGate(loadedA, "tenant-b"), "quick_skill.bill_watch")).toBe(false);
});

it("a failed read is unavailable for its own tenant and never leaks to another", () => {
  const failedA = { key: "tenant-a", status: "failed" as const };
  expect(catalogGate(failedA, "tenant-a").status).toBe("unavailable");
  expect(catalogGate(failedA, "tenant-b").status).toBe("loading");
});

it("drops a late answer for a superseded key or request", () => {
  const loadingA = { key: "tenant-a", status: "loading" as const };
  expect(applyCatalogAnswer(loadingA, "tenant-b", { ok: true, enabled: true, ids: allCoreIds })).toBeNull();
  expect(applyCatalogAnswer(loadedA, "tenant-a", { ok: true, enabled: true, ids: allCoreIds })).toBeNull();
  expect(applyCatalogAnswer(initialCatalogState, "tenant-a", { ok: true, enabled: true, ids: [] })).toBeNull();
  expect(applyCatalogAnswer(loadingA, "tenant-a", { ok: true, enabled: false, ids: [] })).toEqual({
    key: "tenant-a",
    status: "loaded",
    enabled: false,
    ids: [],
  });
  // A stale rejection also cannot overwrite an answer that already arrived for the same key.
  expect(applyCatalogAnswer(loadedA, "tenant-a", { ok: false })).toBeNull();
});

it("an unresolved explicit refresh refuses until its own answer arrives", () => {
  const refreshing = { key: "tenant-a", status: "loading" as const };
  const gate = catalogGate(refreshing, "tenant-a");
  expect(gate.status).toBe("loading");
  expect(newIntentRefusal(gate, applied)).toBeTruthy();
  const answered = applyCatalogAnswer(refreshing, "tenant-a", { ok: true, enabled: true, ids: allCoreIds });
  expect(answered && catalogGate(answered, "tenant-a").status).toBe("on");
});
