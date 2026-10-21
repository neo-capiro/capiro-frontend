import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConversationPanels } from "../src/features/meri/conversation/ConversationPanels";
import { ConversationTurn } from "../src/features/meri/conversation/ConversationTurn";
import { IntentApprovalsEnabled } from "../src/features/meri/conversation/intents/approvals-enabled";
import type { TurnView } from "../src/features/meri/conversation/conversation-view";

const turn = {
  runId: "30000000-0000-4000-8000-000000000001",
  prompt: "Prepare the follow-up",
  runState: "waiting-for-approval",
  omittedPrefix: false,
  reasonCode: null,
  messages: [],
  tools: [],
  sources: [],
  approvals: [
    {
      proposalId: "40000000-0000-4000-8000-000000000001",
      expiresAt: "2026-10-21T12:00:00.000Z",
    },
  ],
  artifacts: [],
  errors: [],
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
  });

  it("keeps the approval notice's not-available copy unless approvals are enabled", () => {
    for (const enabled of [undefined, false]) {
      const html = under(
        enabled,
        createElement(ConversationTurn, { turn, label: "Current turn" }),
      );
      expect(html).toContain("Decisions cannot be made here yet.");
      expect(html).not.toContain("Actions for your approval");
    }
    const html = under(
      true,
      createElement(ConversationTurn, { turn, label: "Current turn" }),
    );
    expect(html).toContain("Review and decide it under");
    expect(html).not.toContain("Decisions cannot be made here yet.");
  });
});
