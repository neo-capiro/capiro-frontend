import type {
  DocumentContentRequest,
  DocumentCreatedResponse,
  DocumentInspectionResponse,
} from "@capiro/meri-contracts/document-application";

/** Synthetic bytes/identities authored against the public 0.1.2 schema only. */
export const ids = {
  conversation: "11111111-1111-4111-8111-111111111111",
  run: "22222222-2222-4222-8222-222222222222",
  client: "33333333-3333-4333-8333-333333333333",
  artifact: "44444444-4444-4444-8444-444444444444",
  version: "55555555-5555-4555-8555-555555555555",
  revision: "66666666-6666-4666-8666-666666666666",
  other: "77777777-7777-4777-8777-777777777777",
};
export const session = {
  credential: `action_session_${"x".repeat(43)}`,
  expiresAtMs: 301_000,
  context: {
    tenantId: "synthetic-tenant",
    actorId: "synthetic-actor",
    conversationId: ids.conversation,
    runId: ids.run,
    selectedClientId: ids.client,
  },
};
export const textContent: DocumentContentRequest = {
  operation: "create_word",
  format: "txt",
  title: "Synthetic",
  content: { text: "Synthetic document" },
};
export const wordContent: DocumentContentRequest = {
  operation: "create_word",
  format: "docx",
  title: "Synthetic",
  content: {
    blocks: [{ kind: "paragraph", runs: [{ text: "Synthetic document" }] }],
  },
};
export const workbookContent: DocumentContentRequest = {
  operation: "create_excel",
  format: "xlsx",
  title: "Synthetic",
  content: {
    sheets: [
      { name: "Data", rows: [[{ value: "Synthetic" }, { formula: "=1+1" }]] },
    ],
  },
};
export const documentBytes = new TextEncoder().encode("Synthetic document");
export const jsonBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
export const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
export function created(
  format: "txt" | "docx" | "xlsx" = "txt",
): DocumentCreatedResponse {
  const scope = {
    tenantId: session.context.tenantId,
    kind: "client" as const,
    resourceId: ids.client,
    policyRevision: "synthetic-policy-v1",
  };
  const sha256 =
    "95a5a3b9cf4ddcc7a93e4a0d4c6de680257932fbf5994ad15daa64142aaae3a0";
  const inspection = {
    sha256,
    bytes: documentBytes.length,
    format,
    nativeOpened: false as const,
    rendered: false as const,
    recalculated: false as const,
    members: [],
    details:
      format === "txt"
        ? { encoding: "UTF-8", whitespace: "unchanged" }
        : format === "docx"
          ? { paragraphs: 1, tables: 0, pictures: 0 }
          : {
              sheets: ["Data"],
              formulas: 1,
              formulaCache:
                "unverified-zero-placeholder; recalculation required",
            },
  } as DocumentCreatedResponse["inspection"];
  return {
    version: {
      contractVersion: "0.1.0",
      artifactId: ids.artifact,
      versionId: ids.version,
      parentVersionId: null,
      binding: {
        tenantId: session.context.tenantId,
        actorId: session.context.actorId,
        conversationId: ids.conversation,
        runId: ids.run,
        attemptId: ids.other,
        workerId: ids.revision,
        writerFence: 7,
      },
      object: {
        objectId: ids.other,
        versionId: "synthetic-object-version",
        sha256,
        bytes: documentBytes.length,
        scopes: [scope],
      },
      filename: `Synthetic.${format}`,
      mimeType:
        format === "txt"
          ? "text/plain; charset=utf-8"
          : format === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      scopes: [scope],
      evidence: [],
      generationStatus: "draft",
      previewStatus: "pending",
      createdAt: "2026-10-13T08:00:00.000Z",
    },
    inspection,
    execution: {
      requestSha256: "a".repeat(64),
      authorizationReceiptId: "synthetic-authorization",
      budgetTicketId: "synthetic-budget",
      objectCommitted: true,
      versionCommitted: true,
      nativeQualified: false,
    },
  };
}
export function inspected(value = created()): DocumentInspectionResponse {
  return {
    version: value.version,
    inspection: { ...value.inspection, currentBytesVerified: true },
  };
}
export function binary(
  value = created(),
  bytes: Uint8Array<ArrayBuffer> = documentBytes,
) {
  return new Response(bytes, {
    headers: {
      "Content-Type": value.version.mimeType,
      "Content-Disposition": `attachment; filename="${value.version.filename}"`,
      "Content-Length": String(value.version.object.bytes),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
