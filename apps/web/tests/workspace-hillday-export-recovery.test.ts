import { describe, expect, it } from "vitest";
import { workspaceExportOperations as operations } from "../src/shared/capiro/operations/workspace-exports";
import {
  bindHillDayExport,
  exportDownloadInput,
  hillDayExportContract,
  hillDayExportScope,
  type HillDayExportIntent,
  type HillDayExportReceipt,
} from "../src/features/modules/workspace/hillday/hillday-export-recovery";

const requestId = "64000000-0000-4000-8000-000000000001";
const documentId = "64000000-0000-4000-8000-000000000002";
const clientId = "64000000-0000-4000-8000-000000000003";
const exportId = "64000000-0000-4000-8000-000000000004";
const other = "64000000-0000-4000-8000-000000000099";
const proof = {
  renderInputSha256: "a".repeat(64),
  contentSha256: "b".repeat(64),
};
const intent: HillDayExportIntent = {
  requestId,
  documentId,
  clientId,
  pageSize: "a4",
};
const expiresAt = "2026-10-26T12:15:00.000Z";
const url = `/workspace-api/hillday/files/${documentId}/${exportId}?exp=${Date.parse(expiresAt)}&sig=${"c".repeat(64)}`;
const receipt: HillDayExportReceipt = {
  requestId,
  documentId,
  exportId,
  ...proof,
  sourceUpdatedAt: "2026-10-26T12:00:00.000Z",
  status: "ready",
  format: "pdf",
  pageSize: "a4",
  filename: "original.pdf",
  sizeBytes: 1200,
  url,
  expiresAt,
  error: null,
  createdAt: "2026-10-26T12:01:00.000Z",
};

describe("request-bound Hill Day export recovery", () => {
  it("uses the exact request GET, accepting absence without inventing a result", () => {
    const read = operations["workspace.hillday.export.request"];
    expect(read.method).toBe("GET");
    expect(read.path).toBe(
      "/hillday/documents/:id/exports/requests/:requestId",
    );
    expect(
      read.request.parse({ params: { id: documentId, requestId } }),
    ).toEqual({ params: { id: documentId, requestId } });
    expect(read.response.parse(null)).toBeNull();
    expect(read.response.safeParse({}).success).toBe(false);
    for (const params of [
      { id: documentId },
      { id: documentId, requestId: "not-a-uuid" },
      { id: documentId, requestId, exportId },
    ])
      expect(read.request.safeParse({ params }).success).toBe(false);
  });
  it("accepts the new producer's explicit proof fields and preserves historical nulls", () => {
    const response = operations["workspace.hillday.export.status"].response;
    expect(response.parse(receipt)).toEqual(receipt);
    expect(
      response.parse({
        ...receipt,
        requestId: null,
        renderInputSha256: null,
        contentSha256: null,
        sourceUpdatedAt: null,
      }).requestId,
    ).toBeNull();
    for (const field of [
      "requestId",
      "renderInputSha256",
      "contentSha256",
      "sourceUpdatedAt",
    ] as const)
      expect(
        response.safeParse({ ...receipt, [field]: undefined }).success,
      ).toBe(false);
    expect(
      response.safeParse({ ...receipt, contentSha256: "bad" }).success,
    ).toBe(false);
  });
  it("requires the original request, document, page inputs and any acknowledged export", () => {
    expect(bindHillDayExport(receipt, intent)).toBe(receipt);
    for (const changed of [
      { requestId: other },
      { requestId: null },
      { documentId: other },
      { pageSize: "letter" as const },
      { exportId: other },
    ])
      expect(() =>
        bindHillDayExport({ ...receipt, ...changed }, { ...intent, exportId }),
      ).toThrow(/original request/);
  });
  it("refuses substituted render or PDF bytes after the original proof is retained", () => {
    const original = { ...intent, exportId, proof };
    for (const changed of [
      { renderInputSha256: "d".repeat(64) },
      { contentSha256: "e".repeat(64) },
      { renderInputSha256: null },
      { contentSha256: null },
      { status: "queued" as const },
      { status: "failed" as const },
    ])
      expect(() =>
        bindHillDayExport({ ...receipt, ...changed }, original),
      ).toThrow(/original request/);
  });
  it("accepts renewed signing metadata while retaining the original content proof", () => {
    const renewed = {
      ...receipt,
      expiresAt: "2026-10-26T13:00:00.000Z",
      url: url.replace(
        String(Date.parse(expiresAt)),
        String(Date.parse("2026-10-26T13:00:00.000Z")),
      ),
    };
    expect(bindHillDayExport(renewed, { ...intent, exportId, proof })).toBe(
      renewed,
    );
    expect(exportDownloadInput(renewed).params).toEqual({
      id: documentId,
      exportId,
    });
  });
  it("allows a ready original without a grant, and cannot turn it into a download", () => {
    const unavailable = { ...receipt, url: null, expiresAt: null };
    expect(bindHillDayExport(unavailable, intent)).toBe(unavailable);
    expect(() => exportDownloadInput(unavailable)).toThrow(/download link/);
  });
  it("rejects foreign origins, documents, artifacts, altered expiry and extra URL syntax", () => {
    for (const bad of [
      `https://example.test${url}`,
      `//example.test${url}`,
      url.replace(documentId, other),
      url.replace(exportId, other),
      `${url}&extra=1`,
      `${url}#fragment`,
      url.replace(String(Date.parse(expiresAt)), "1793017000000"),
    ])
      expect(() => exportDownloadInput({ ...receipt, url: bad })).toThrow(
        /download link/,
      );
    expect(exportDownloadInput(receipt)).toEqual({
      params: { id: documentId, exportId },
      query: { exp: String(Date.parse(expiresAt)), sig: "c".repeat(64) },
    });
  });
  it("only enriches one immutable retained intent and refuses losing acknowledged proof", () => {
    const original = { ...intent, exportId, proof };
    expect(() =>
      hillDayExportContract.validateUpdate?.(intent, original),
    ).not.toThrow();
    for (const change of [
      { requestId: other },
      { documentId: other },
      { clientId: other },
      { pageSize: "letter" as const },
      { exportId: other },
      { exportId: undefined },
      { proof: undefined },
      { proof: { ...proof, contentSha256: "d".repeat(64) } },
    ])
      expect(() =>
        hillDayExportContract.validateUpdate?.(original, {
          ...original,
          ...change,
        }),
      ).toThrow();
    expect(
      hillDayExportContract.schema.safeParse({
        ...intent,
        extra: "new authority",
      }).success,
    ).toBe(false);
  });
  it("separates tenant, user, actor, document and current client journal lifetimes", () => {
    const scope = {
      tenantId: "tenant",
      userId: "user",
      actorId: "actor",
      documentId,
      clientId,
    };
    for (const field of Object.keys(scope) as (keyof typeof scope)[])
      expect(hillDayExportScope({ ...scope, [field]: "other" })).not.toBe(
        hillDayExportScope(scope),
      );
  });
});
