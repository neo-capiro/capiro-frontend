import { canonicalSha256 } from "./meri-action-wire-fixtures";
import { nativeTaskIntent } from "./meri-intents-native-fixtures";
import type { IntentsNativeMemoryOutcome } from "@capiro/meri-client/intents";

/** Synthetic memory records are admitted by the installed public receiver before presentation. */
export function memoryIntent(
  status: IntentsNativeMemoryOutcome["result"]["review"]["status"] = "pending",
) {
  const fixture = nativeTaskIntent();
  const item = fixture.response.intents[0];
  const p = item.proposal,
    c = p.command,
    b = c.binding;
  item.operation.id = "save_memory";
  c.action = "memory.propose";
  c.arguments = {
    content: "The exact proposed memory.\nKeep this second line.",
    key: null,
    scope: "personal",
    clientId: null,
    ttlDays: 30,
  };
  c.scopes = [
    {
      tenantId: b.tenantId,
      kind: "private-user",
      resourceId: b.actorId,
      policyRevision: "p1",
    },
  ];
  p.commandSha256 = canonicalSha256(c);
  item.decision.commandSha256 = p.commandSha256;
  const candidate = {
    schema: "meri.memory-candidate.v1",
    candidateId: p.proposalId,
    tenantId: b.tenantId,
    proposerActorId: b.actorId,
    kind: "addition",
    ...c.arguments,
    corrects: null,
    reason: null,
    sources: [],
    origin: {
      kind: "conversation",
      conversationId: b.conversationId,
      runId: b.runId,
      commandId: c.commandId,
      commandSha256: p.commandSha256,
    },
    idempotencyKey: c.idempotencyKey,
    createdAt: p.createdAt,
  };
  item.execution.outcome = {
    execution: {
      kind: "native-memory",
      proposalId: p.proposalId,
      commandSha256: p.commandSha256,
      idempotencyKey: c.idempotencyKey,
      binding: b,
      completedAt: p.createdAt,
      approvalDecisionSha256: canonicalSha256(item.decision),
    },
    result: {
      candidateId: p.proposalId,
      candidateSha256: canonicalSha256(candidate),
      reviewId: "00000000-0000-4000-8000-000000000701",
      review: {
        status,
        decidedAt: ["pending", "not_found"].includes(status)
          ? null
          : "2026-10-12T20:01:00.000Z",
        publishedMemoryId:
          status === "approved"
            ? "clio:00000000-0000-4000-8000-000000000702"
            : null,
        checkedAt: "2026-10-12T20:02:00.000Z",
      },
    },
  };
  return fixture;
}
