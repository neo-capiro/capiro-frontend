import type {
  ConversationHistoryExportResponse,
  ConversationSummary,
} from "@capiro/meri-contracts/conversation-history";
export const exportId = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
export const exportAccount = {
  tenantId: "synthetic-export",
  actorId: "synthetic-actor",
};
export const exportRow: ConversationSummary = {
  conversationId: exportId(1),
  title: "Synthetic saved chat",
  status: "active",
  revision: "1",
  scopeKind: "client",
  clientId: exportId(5),
  updatedAt: "2026-10-29T07:00:00.000Z",
  archivedAt: null,
  trashedAt: null,
  restoreUntil: null,
  hasTranscript: true,
  canManage: true,
};
/** Synthetic response shared by unit tests and the development-only browser harness. */
export function messageExport(
  now = Date.now(),
): ConversationHistoryExportResponse {
  return {
    schema: "meri.conversation-export/1",
    conversation: {
      conversationId: exportRow.conversationId,
      owner: exportAccount,
      scopes: [
        {
          tenantId: exportAccount.tenantId,
          kind: "client",
          resourceId: exportRow.clientId!,
          policyRevision: "p1",
        },
      ],
      createdAt: "2026-10-29T07:00:00.000Z",
      policyRevision: "p1",
    },
    exportedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 60000).toISOString(),
    throughSequence: 5,
    turns: [
      {
        runId: exportId(2),
        prompt: "Synthetic question <script>literal</script>",
        messages: [{ messageId: exportId(9), text: "Synthetic answer" }],
      },
      {
        runId: exportId(3),
        prompt: null,
        messages: [{ messageId: exportId(10), text: "Resumed answer" }],
      },
    ],
  };
}
