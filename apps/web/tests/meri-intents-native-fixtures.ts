import { readFileSync } from "node:fs";
import { canonicalSha256 } from "./meri-action-wire-fixtures";

/** Synthetic retained records, always admitted through the canonical public receiver in tests. */
export function nativeTaskIntent(update = false) {
  const fixture = JSON.parse(
    readFileSync(
      new URL("./fixtures/meri-intents/listCompleted.json", import.meta.url),
      "utf8",
    ),
  );
  const item = fixture.response.intents[0];
  const { command } = item.proposal;
  const { receipt, result } = item.execution.outcome;
  if (update) {
    item.operation.id = "update_task";
    command.contractVersion = "0.2.0";
    command.action = "task.update";
    command.arguments = {
      taskId: result.id,
      mode: "unconditional_patch",
      patch: { title: "Updated task", status: "in_progress" },
    };
    result.title = "Updated task";
    result.status = "in_progress";
    result.updatedAt = result.createdAt;
    delete result.createdAt;
    item.proposal.commandSha256 = canonicalSha256(command);
    item.decision.commandSha256 = item.proposal.commandSha256;
  }
  item.execution.outcome = {
    execution: {
      kind: "native-task",
      proposalId: item.proposal.proposalId,
      commandSha256: item.proposal.commandSha256,
      idempotencyKey: command.idempotencyKey,
      binding: command.binding,
      completedAt: receipt.completedAt,
      approvalDecisionSha256: canonicalSha256(item.decision),
    },
    result,
  };
  return fixture;
}

export function memoryReviewIntent(withheld = false) {
  const fixture = nativeTaskIntent();
  const original = fixture.response.intents[0];
  fixture.response.intents = [
    {
      deliveryId: original.deliveryId,
      createdAt: original.createdAt,
      operation: { id: "save_memory", version: "0.2.0" },
      state: "prepared",
      kind: "memory_review",
      ...(withheld
        ? { withheld: true }
        : {
            review: {
              status: "review_pending",
              binding: original.proposal.command.binding,
              scopes: [
                {
                  tenantId: "tenant",
                  kind: "private-user",
                  resourceId: "actor",
                  policyRevision: "p1",
                },
              ],
              result: {
                candidateId: "00000000-0000-4000-8000-000000000701",
                commandSha256: "a".repeat(64),
                status: "pending",
              },
            },
          }),
    },
  ];
  return fixture;
}

export function filingIntent(
  statuses: ("saved" | "pending" | "failed")[] = ["saved", "pending", "failed"],
) {
  const fixture = nativeTaskIntent();
  const item = fixture.response.intents[0];
  const command = item.proposal.command;
  item.operation.id = "save_chat_attachments";
  command.action = "artifact.file";
  command.arguments = {
    clientId: "00000000-0000-4000-8000-000000000005",
    conversationId: command.binding.conversationId,
  };
  command.scopes = [
    {
      tenantId: "tenant",
      kind: "client",
      resourceId: command.arguments.clientId,
      policyRevision: "p1",
    },
  ];
  command.attachments = statuses.map((_, index) => ({
    objectId: `00000000-0000-4000-8000-${String(800 + index).padStart(12, "0")}`,
    versionId: `version-${index + 1}`,
    sha256: "a".repeat(64),
    bytes: 2,
    scopes: command.scopes,
  }));
  item.proposal.commandSha256 = canonicalSha256(command);
  item.decision.commandSha256 = item.proposal.commandSha256;
  const proof = item.execution.outcome.execution;
  proof.kind = "native-artifact-file";
  proof.commandSha256 = item.proposal.commandSha256;
  proof.approvalDecisionSha256 = canonicalSha256(item.decision);
  item.execution.outcome.result = {
    commandSha256: item.proposal.commandSha256,
    files: statuses.map((status, index) => ({
      object: command.attachments[index],
      status,
      fileName: `${status}-${index + 1}.txt`,
      ...(status === "failed"
        ? { reason: "File was not stored" }
        : {
            documentId: `00000000-0000-4000-8000-${String(900 + index).padStart(12, "0")}`,
            location: "/files",
            indexingStatus: status === "saved" ? "pending" : "not_indexed",
            reused: false,
            ...(status === "pending"
              ? { reason: "Index registration unavailable" }
              : {}),
          }),
    })),
  };
  return fixture;
}
