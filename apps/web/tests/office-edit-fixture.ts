import type {
  IntentsDecideResponse,
  IntentsItem,
  IntentsListResponse,
} from "@capiro/meri-client/intents";
export const conversationId = "00000000-0000-4000-8000-000000000001";
export const viewer = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
};

export type OfficeItem = Extract<
  IntentsItem,
  { kind: "office_edit"; proposal: unknown }
>;
export type OfficeResult = Exclude<OfficeItem["result"], "unavailable">;
export const officeIds = {
  artifactId: "00000000-0000-4000-8000-00000000000a",
  versionId: "00000000-0000-4000-8000-00000000000b",
  newVersionId: "00000000-0000-4000-8000-00000000000c",
  proposalId: "00000000-0000-4000-8000-00000000000d",
  deliveryId: `sdk:${"c".repeat(64)}`,
};
export const officeDocument = {
  artifactId: officeIds.artifactId,
  versionId: officeIds.versionId,
  objectSha256: "a".repeat(64),
  format: "docx" as const,
  title: "Quarterly report",
  filename: "Quarterly report.docx",
};
export const officeOperations: OfficeItem["proposal"]["operations"] = [
  {
    unit: "p:1",
    kind: "replace_text",
    before: "Quarterly report — Ω",
    after: "Quarterly report — Ω (final)",
  },
  { unit: "p:4", kind: "insert_after", before: null, after: "Added line" },
];
/** One synthetic office proposal item, as Meri lists it, with the result in the given state. The command digest
 * is computed only when a caller supplies a hasher (the public receiver checks it); a browser harness that
 * scripts the access layer needs no Node hashing. */
export function officeEditFixture(
  status: OfficeResult["proposalStatus"] = "proposed",
  code: string | null = null,
  expiresInMs = 60_000,
  hash: (value: unknown) => string = () => "f".repeat(64),
): OfficeItem {
  const now = Date.now();
  const bound: Omit<OfficeItem["proposal"], "commandSha256"> = {
    kind: "office_edit",
    operation: "propose_office_edit",
    proposalId: officeIds.proposalId,
    binding: {
      ...viewer,
      conversationId,
      runId: "00000000-0000-4000-8000-000000000003",
      attemptId: "00000000-0000-4000-8000-000000000004",
      workerId: "00000000-0000-4000-8000-000000000005",
      writerFence: 1,
    },
    scopes: [
      {
        tenantId: viewer.tenantId,
        kind: "private-user",
        resourceId: viewer.actorId,
        policyRevision: "p1",
      },
    ],
    context: { conversationId, selectedClientId: null },
    document: officeDocument,
    summary: "Mark the heading final and add a closing line in the table.",
    operations: officeOperations,
    result: { sha256: "b".repeat(64), bytes: 4321 },
    createdAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + expiresInMs).toISOString(),
    requiredApprover: { ...viewer },
  };
  const proposal = { ...bound, commandSha256: hash(bound) };
  return {
    deliveryId: officeIds.deliveryId,
    createdAt: new Date(now - 1000).toISOString(),
    operation: { id: "propose_office_edit", version: "0.2.0" },
    state: "prepared",
    kind: "office_edit",
    proposal,
    result: officeResult(status, code),
  };
}
export function officeResult(
  status: OfficeResult["proposalStatus"],
  code: string | null = null,
): OfficeResult {
  return {
    proposalId: officeIds.proposalId,
    proposalStatus: status,
    version:
      status === "applied"
        ? {
            artifactId: officeIds.artifactId,
            versionId: officeIds.newVersionId,
            parentVersionId: officeIds.versionId,
            sha256: "b".repeat(64),
            bytes: 4321,
            filename: officeDocument.filename,
          }
        : null,
    code,
  };
}
export const officeListResponse = (item: OfficeItem): IntentsListResponse => ({
  conversationId,
  intents: [item],
  next: null,
});
export const officeDecideResponse = (
  status: OfficeResult["proposalStatus"],
  code: string | null = null,
): IntentsDecideResponse => ({
  status: "office_edit_decided",
  deliveryId: officeIds.deliveryId,
  proposalId: officeIds.proposalId,
  result: officeResult(status, code),
});
