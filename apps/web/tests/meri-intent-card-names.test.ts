import { expect, it } from "vitest";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import { intentRow } from "../src/features/meri/conversation/intents/intent-view";
import { INTENT_OPERATION_LABELS } from "../src/features/meri/conversation/intents/intent-labels";
import { proposalLabel } from "../src/features/meri/approvals/inbox-view";
import type { IntentsInboxRow } from "@capiro/meri-client/intents";

/**
 * A journal row that never reached a proposal (preparing, failed, uncertain) carries only its
 * operation id. The 2 Nov acceptance saw "Manage_research_portfolio | Result uncertain" and
 * "Schedule_task | Failed | Preparation failed (REFUSED)": raw identifiers with a capital and a
 * bare code. The card must name the request the way the person asked for it and say, in words,
 * that nothing was prepared and why.
 */
const now = Date.parse("2026-11-02T02:35:00.000Z");
const viewer = { tenantId: "tenant", actorId: "actor" };
const request = { conversationId: "00000000-0000-4000-8000-000000000001" };
const delivery = (n: number) => `sdk:${String(n).padStart(64, "0")}`;

async function rowOf(item: Record<string, unknown>) {
  const received = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({ ...request, intents: [item], next: null }),
    { request },
  );
  if ("error" in received) throw Error(`Unexpected refusal ${received.error}`);
  return intentRow(received.intents[0]!, now, viewer);
}

it("names an uncertain preparation by the request's own label and says what Meri could not confirm", async () => {
  const row = await rowOf({
    deliveryId: delivery(1),
    createdAt: "2026-11-02T02:34:40.000Z",
    operation: { id: "manage_research_portfolio", version: "0.2.0" },
    state: "unknown",
  });
  expect(row.title).toBe("Research Portfolio management action");
  expect(row.status).toBe("Result uncertain");
  expect(row.decision).toBe("closed");
  expect(row.detail).toBe(
    "Meri sent this request but could not confirm the outcome. Nothing was approved or executed. Check Approvals; if nothing is there, ask again.",
  );
});

it("names a failed preparation and explains the closed code in plain words, keeping the code visible", async () => {
  const refused = await rowOf({
    deliveryId: delivery(2),
    createdAt: "2026-11-02T02:44:40.000Z",
    operation: { id: "schedule_task", version: "0.2.0" },
    state: "failed",
    code: "REFUSED",
  });
  expect(refused.title).toBe("Schedule a routine");
  expect(refused.status).toBe("Not prepared");
  expect(refused.tone).toBe("danger");
  expect(refused.detail).toBe(
    "The service that prepares this kind of request refused it. Nothing was approved or executed.",
  );
  const unavailable = await rowOf({
    deliveryId: delivery(3),
    createdAt: "2026-11-02T02:44:41.000Z",
    operation: { id: "watch_action", version: "0.2.0" },
    state: "failed",
    code: "UNAVAILABLE",
  });
  expect(unavailable.title).toBe("Change a watch");
  expect(unavailable.detail).toBe(
    "The service that prepares this kind of request could not be reached. Nothing was approved or executed.",
  );
  const other = await rowOf({
    deliveryId: delivery(4),
    createdAt: "2026-11-02T02:44:42.000Z",
    operation: { id: "create_research_portfolio_snapshot", version: "0.2.0" },
    state: "failed",
    code: "UNKNOWN",
  });
  expect(other.title).toBe("Research Portfolio snapshot");
  expect(other.detail).toBe(
    "Preparation failed before anything was prepared (UNKNOWN). Nothing was approved or executed.",
  );
});

it("titles every catalog intent with the one shared label, in the conversation card and the Approvals inbox alike", async () => {
  const ids = [
    "save_note",
    "watch_action",
    "create_client",
    "update_client_profile",
    "save_legiwatch_relevance",
    "mail_send",
    "apply_legiwatch_suggestion",
    "save_business_development_brief",
    "prepare_legiwatch_briefing",
    "save_legislative_research",
    "publish_research_portfolio_share_link",
    "revoke_research_portfolio_share_link",
    "manage_research_portfolio",
    "create_research_portfolio_snapshot",
    "request_research_portfolio_output",
    "save_research_portfolio_output_to_client",
    "watch_research_portfolio",
    "update_research_portfolio_change_state",
    "create_research_portfolio_bookmark",
    "add_research_portfolio_review_note",
    "prepare_research_portfolio_brief",
    "prepare_research_portfolio_meeting",
    "create_word",
    "create_excel",
    "create_powerpoint",
    "propose_office_edit",
    "run_analysis",
    "schedule_task",
    "update_scheduled_task",
    "cancel_scheduled_task",
    "create_task",
    "update_task",
    "save_memory",
    "save_chat_attachments",
  ];
  for (const [index, id] of ids.entries()) {
    expect(INTENT_OPERATION_LABELS[id], id).toBeDefined();
    expect(
      proposalLabel({
        operation: { id, version: "0.2.0" },
        kind: "proposal",
      } as IntentsInboxRow),
      id,
    ).toBe(INTENT_OPERATION_LABELS[id]);
    const row = await rowOf({
      deliveryId: delivery(10 + index),
      createdAt: "2026-11-02T02:50:00.000Z",
      operation: { id, version: "0.2.0" },
      state: "pending",
    });
    expect(row.title, id).toBe(INTENT_OPERATION_LABELS[id]);
    expect(row.title, id).not.toContain("_");
    expect(row.title, id).not.toBe(id.charAt(0).toUpperCase() + id.slice(1));
    expect(row.status, id).toBe("Preparing");
  }
  // An id the map does not know still reads as words rather than an identifier.
  const unknown = await rowOf({
    deliveryId: delivery(99),
    createdAt: "2026-11-02T02:50:00.000Z",
    operation: { id: "future_write_kind", version: "0.2.0" },
    state: "pending",
  });
  expect(unknown.title).toBe("Future write kind");
});
