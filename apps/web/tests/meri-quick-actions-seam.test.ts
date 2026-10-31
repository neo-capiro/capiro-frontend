import { afterEach, expect, it, vi } from "vitest";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionComposer } from "../src/features/meri/conversation/ConversationView";
import { createConversationComposer } from "../src/features/meri/conversation/conversation-composer";
import { MeriComposer } from "../src/features/meri/MeriComposer";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import { ALL_TYPED_SKILL_IDS } from "../src/features/meri/conversation/quick-action-gate";

/**
 * SCRUM-240 review-353 P2: the QuickActions rollout refusal closes Send, but it must never disable
 * the selection controls for an idle, unsent draft — the user has to be able to clear the selection
 * or switch to an allowed skill.
 *
 * This joins the ACTUAL SessionComposer composition (the real `selectionDisabled`/`modelDisabled`
 * computation, the real SkillSelectionPicker select/options and the real MeriComposer Send control)
 * with the real published composer controls. The signed-in boundary fixture is provided here because
 * a sibling picker in this composition requires it.
 */

vi.mock("../src/shared/capiro/CapiroBoundary", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../src/shared/capiro/CapiroBoundary")
    >();
  return {
    ...actual,
    useCapiro: () => ({
      request: vi.fn(async () => ({})),
      upload: vi.fn(async () => ({})),
      download: vi.fn(async () => ({})),
    }),
  };
});

const harness = vi.hoisted(() => ({
  submit: undefined as
    | ComponentProps<
        typeof import("@capiro/ui/prompt-input").PromptInput
      >["onSubmit"]
    | undefined,
}));
vi.mock("@capiro/ui/prompt-input", async (original) => {
  const actual = await original<typeof import("@capiro/ui/prompt-input")>();
  return {
    ...actual,
    PromptInput: (props: ComponentProps<typeof actual.PromptInput>) => {
      harness.submit = props.onSubmit;
      return createElement(actual.PromptInput, props);
    },
  };
});
afterEach(() => {
  harness.submit = undefined;
});

type Session = ComponentProps<typeof SessionComposer>["session"];
const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  selectedClientId: "synthetic-client",
  conversationId: "synthetic-conversation",
  runId: "synthetic-run",
};
const port = () => ({ context }) as MeriConversationPort;
const baseControls = () => ({
  onSend: vi.fn(),
  onStop: vi.fn(),
  scope: "Synthetic client",
  attachUnavailable: "Attachments unavailable",
});
function session(bound: MeriConversationPort): Session {
  return {
    selectedId: context.conversationId,
    accessLost: false,
    connection: { state: { status: "ready" } },
    ready: { port: bound, lifetimeKey: JSON.stringify(context) },
    draft: "Summarise this client's commitments",
    setDraft: vi.fn(),
    textarea: { current: null },
    skillSelection: {},
    setSkillSelection: vi.fn(),
    continuation: {
      intent: undefined,
      busy: false,
      failed: false,
      notReady: false,
      storageError: undefined,
      start: vi.fn(async () => false),
      retry: vi.fn(async () => false),
      readMapping: vi.fn(async () => false),
    },
  } as unknown as Session;
}

type Gate = ComponentProps<typeof SessionComposer>["gate"];
const ROLLOUT = "Quick actions are turned off for this workspace.";
const LOCK =
  "Delivery of your last request is uncertain. Retry it before sending another.";
const applied = {
  skill: { skillId: "quick_skill.commitments_audit", skillVersion: "1.0.0" },
  windowRequest: { basis: "unbounded" as const },
};
const skillSelect = (html: string) =>
  html.match(
    /<select[^>]*>[\s\S]*?No selected skill[\s\S]*?<\/select>/i,
  )?.[0] ?? "";
const sendButton = (html: string) =>
  html.match(/<button[^>]*aria-label="Send message"[^>]*>/i)?.[0] ?? "";

type LiveControls = NonNullable<ComponentProps<typeof MeriComposer>["live"]>;
function compose(gate: Gate, controls: Partial<LiveControls>) {
  const channel = createConversationComposer();
  const current = port();
  channel.publish({
    port: current,
    controls: { ...baseControls(), ...controls } as never,
    running: false,
  });
  const value = session(current);
  value.skillSelection = applied as Session["skillSelection"];
  return renderToStaticMarkup(
    createElement(SessionComposer, {
      channel,
      session: value,
      scope: "Synthetic client",
      gate,
      toolsOpen: true,
      onToggleTools: () => undefined,
    }),
  );
}

it("rollout refusal closes Send but leaves the unsent selection editable", () => {
  const html = compose({ status: "off" }, { sendBlocked: ROLLOUT });
  const select = skillSelect(html);
  expect(select).toContain("No selected skill");
  expect(select).not.toMatch(/^<select[^>]*\sdisabled/i);
  expect(select).toContain("Saved skill · not offered for new messages");
  expect(html).toContain(ROLLOUT);
  expect(sendButton(html)).toMatch(/\sdisabled(?:=|\s|>)/i);
});

it("a genuine pending/unknown lock still disables the selection control", () => {
  const html = compose(
    { status: "off" },
    { sendBlocked: LOCK, selectionLocked: LOCK },
  );
  expect(skillSelect(html)).toMatch(/^<select[^>]*\sdisabled/i);
  expect(html).toContain(LOCK);
});

it("an allowed subset offers the allowed skill so the user can switch", () => {
  const html = compose(
    {
      status: "on",
      available: new Set([
        "quick_skill.bill_watch",
        "quick_skill.cited_report",
      ]),
    },
    { sendBlocked: ROLLOUT },
  );
  const select = skillSelect(html);
  expect(select).not.toMatch(/^<select[^>]*\sdisabled/i);
  expect(select).toContain("quick_skill.bill_watch");
  expect(select).not.toContain("quick_skill.research_company");
});

it("with no rollout refusal a permitted selection leaves Send available", () => {
  const html = compose({ status: "on", available: ALL_TYPED_SKILL_IDS }, {});
  expect(sendButton(html)).not.toMatch(/\sdisabled(?:=|\s|>)/i);
  expect(skillSelect(html)).not.toMatch(/^<select[^>]*\sdisabled/i);
});
