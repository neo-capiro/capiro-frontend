import { expect, it } from "vitest";
import type { IntentsInboxRow } from "@capiro/meri-client/intents";
import {
  inboxRowView,
  phaseView,
  proposalLabel,
} from "../src/features/meri/approvals/inbox-view";

const conversationId = "00000000-0000-4000-8000-000000000777";
const clientId = "00000000-0000-4000-8000-000000000901";
const now = Date.UTC(2026, 10, 1, 12);
const row = (over: Partial<IntentsInboxRow> = {}): IntentsInboxRow =>
  ({
    conversationId,
    deliveryId: `sdk:${"1".repeat(64)}`,
    createdAt: "2026-11-01T11:00:00.000Z",
    operation: { id: "create_task", version: "0.2.0" },
    kind: "proposal",
    withheld: false,
    clientId,
    expiresAt: "2026-11-01T12:30:00.000Z",
    phase: "awaiting_approval",
    ...over,
  }) as IntentsInboxRow;

it("a live awaiting proposal is the only pending state; the server's other phases are shown, never re-decided", () => {
  expect(phaseView(row(), now)).toEqual({
    label: "Awaiting your decision",
    tone: "warning",
    pending: true,
  });
  expect(
    phaseView(row({ expiresAt: "2026-11-01T11:59:59.000Z" }), now).pending,
  ).toBe(false);
  const phases: Record<string, string> = {
    approved: "Approved · awaiting execution",
    rejected: "Rejected",
    expired: "Expired",
    executing: "Executing",
    completed: "Completed",
    unknown: "Result uncertain",
    unknown_decision: "Decision unavailable",
  };
  for (const [phase, label] of Object.entries(phases)) {
    const view = phaseView(row({ phase } as Partial<IntentsInboxRow>), now);
    expect(view.label).toBe(label);
    expect(view.pending).toBe(false);
  }
});

it("rows link to the conversation that decides and name the client only from the current roster", () => {
  const view = inboxRowView(row(), {
    clients: [{ id: clientId, name: "Anduril" }],
    titles: [
      { conversationId, title: "Restoration follow-up", status: "active" },
    ],
    now,
  });
  expect(view).toEqual({
    id: `${conversationId}/sdk:${"1".repeat(64)}`,
    proposal: "Create a task",
    client: "Anduril",
    conversation: {
      label: "Restoration follow-up",
      href: `/meri?clientId=${clientId}&conversationId=${conversationId}`,
    },
    created: "Nov 1, 2026, 11:00 AM UTC",
    expires: "Nov 1, 2026, 12:30 PM UTC",
    state: { label: "Awaiting your decision", tone: "warning" },
    pending: true,
  });
  const general = inboxRowView(
    row({
      clientId: null,
      kind: "watch_action",
      operation: { id: "watch_action", version: "0.2.0" },
    }),
    { now },
  );
  expect(general.client).toBe("General");
  expect(general.proposal).toBe("Watch change");
  expect(general.conversation.href).toBe(
    `/meri?scope=general&conversationId=${conversationId}`,
  );
  expect(general.conversation.label).toMatch(/^Conversation · /);
  expect(inboxRowView(row(), { clients: [], now }).client).toBe(
    "Client not in your current list",
  );
});

it("a withheld row carries only its identity", () => {
  const withheld = inboxRowView(
    {
      conversationId,
      deliveryId: `sdk:${"2".repeat(64)}`,
      createdAt: "2026-11-01T10:00:00.000Z",
      operation: { id: "create_task", version: "0.2.0" },
      kind: "proposal",
      withheld: true,
    },
    { clients: [{ id: clientId, name: "Anduril" }], now },
  );
  expect(withheld.client).toBe("No longer visible");
  expect(withheld.expires).toBe("Withheld");
  expect(withheld.state).toEqual({ label: "Withheld", tone: "neutral" });
  expect(withheld.pending).toBe(false);
  expect(withheld.conversation.href).toBe(
    `/meri?scope=general&conversationId=${conversationId}`,
  );
});

it("proposal labels come from the operation; other kinds fall back to their kind", () => {
  expect(
    proposalLabel(row({ operation: { id: "send_mail", version: "0.2.0" } })),
  ).toBe("Send an email");
  expect(
    proposalLabel(
      row({ operation: { id: "unknown_thing", version: "0.2.0" } }),
    ),
  ).toBe("Unknown thing");
  expect(
    proposalLabel(
      row({
        kind: "research_share",
        operation: { id: "something_new", version: "0.2.0" },
      }),
    ),
  ).toBe("Research share link");
});
