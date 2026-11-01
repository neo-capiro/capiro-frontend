import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConversationPanels } from "../src/features/meri/conversation/ConversationPanels";
import { ConversationTurn } from "../src/features/meri/conversation/ConversationTurn";
import { IntentApprovalsEnabled } from "../src/features/meri/conversation/intents/approvals-enabled";
import type { TurnView } from "../src/features/meri/conversation/conversation-view";

// One prepared proposal: the panel is dark unless the deployment enables approvals, and when it is
// enabled it shows exactly what Meri prepared, never an empty announcement.
vi.mock(
  "../src/features/meri/conversation/intents/useConversationIntents",
  () => ({
    useConversationIntents: () => ({
      oneTimeResults: [],
      dismissOneTime: vi.fn(),
      list: { status: "ready", items: [], next: null, loadingMore: false },
      rows: [
        {
          deliveryId: "dlv_synthetic-delivery-0001",
          title: "Synthetic prepared action",
          status: "Awaiting your decision",
          tone: "warning",
          detail: "Synthetic detail",
          fields: [],
          result: [],
          decision: "approvable",
          proposal: null,
        },
      ],
      attempts: {},
      refresh: vi.fn(),
      retry: vi.fn(),
      loadMore: vi.fn(),
      decide: vi.fn(),
      decisionsReady: true,
      recoveryError: undefined,
    }),
  }),
);

const turn = {
  runId: "30000000-0000-4000-8000-000000000001",
  prompt: "Prepare the follow-up",
  runState: "waiting-for-approval",
  omittedPrefix: false,
  reasonCode: null,
  messages: [],
  tools: [],
  sources: [],
  nativeSources: [],
  browserReceipts: [],
  approvals: [
    {
      proposalId: "40000000-0000-4000-8000-000000000001",
      expiresAt: "2026-10-21T12:00:00.000Z",
    },
  ],
  artifacts: [],
  errors: [],
  checkpointIds: [],
  usageIds: [],
} as unknown as TurnView;

function access() {
  const list = vi.fn(),
    decide = vi.fn();
  return {
    intents: { list, decide },
    calls: () => list.mock.calls.length + decide.mock.calls.length,
  };
}
const port = (intents: object) =>
  ({
    intents,
    artifacts: {},
    context: {
      tenantId: "synthetic-tenant",
      actorId: "synthetic-user",
      conversationId: "20000000-0000-4000-8000-000000000001",
      runId: turn.runId,
      selectedClientId: "10000000-0000-4000-8000-000000000001",
    },
  }) as never;
const under = (
  enabled: boolean | undefined,
  element: ReturnType<typeof createElement>,
) =>
  renderToStaticMarkup(
    enabled === undefined
      ? element
      : createElement(
          IntentApprovalsEnabled.Provider,
          { value: enabled },
          element,
        ),
  );

describe("conversation approvals stay dark unless the deployment enables them", () => {
  it("renders no approvals panel by default or with the flag off, and the panel with it on", () => {
    for (const enabled of [undefined, false]) {
      const a = access();
      const html = under(
        enabled,
        createElement(ConversationPanels, {
          port: port(a.intents),
          turn,
          earlier: [],
        }),
      );
      expect(html).not.toContain("Actions for your approval");
      expect(a.calls()).toBe(0);
    }
    const html = under(
      true,
      createElement(ConversationPanels, {
        port: port(access().intents),
        turn,
        earlier: [],
      }),
    );
    expect(html).toContain("Actions for your approval");
    expect(html).toContain("Synthetic prepared action");
  });

  it("keeps the approval notice's not-available copy unless approvals are enabled", () => {
    for (const enabled of [undefined, false]) {
      const html = under(
        enabled,
        createElement(ConversationTurn, { turn, label: "Current turn" }),
      );
      expect(html).toContain(
        "once conversation approvals are enabled for this workspace",
      );
      expect(html).not.toContain("Actions for your approval");
    }
    const html = under(
      true,
      createElement(ConversationTurn, { turn, label: "Current turn" }),
    );
    expect(html).toContain("Review and decide it under");
    expect(html).not.toContain(
      "once conversation approvals are enabled for this workspace",
    );
  });
});
