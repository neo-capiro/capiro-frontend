import { createHash } from "node:crypto";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { accessInspection } from "./meri-document-access-fixtures";
import { ids } from "./meri-document-public-fixtures";
/** Synthetic receiving fixtures only, never native PDF qualification. */
export const previewBytes = new TextEncoder().encode(
  "%PDF-1.7\nSynthetic preview\n%%EOF",
);
export const previewSha = createHash("sha256")
  .update(previewBytes)
  .digest("hex");
export const previewSource = () => accessInspection("docx");
export function previewResponse(
  changes: Record<string, string> = {},
  bytes = previewBytes,
) {
  const source = previewSource().version;
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(previewBytes.length),
      "Content-Disposition": `inline; filename="${source.filename}.preview.pdf"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "x-meri-preview-id": ids.other,
      "x-meri-preview-source-version": source.versionId,
      "x-meri-preview-source-sha256": source.object.sha256,
      "x-meri-preview-sha256": previewSha,
      "x-meri-preview-pages": "1",
      "x-meri-preview-record-sha256": "a".repeat(64),
      ...changes,
    },
  });
}
export function memoryStorage() {
  const data = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
  syncMeriTabIdentity("synthetic-preview-revision", storage);
  return storage;
}

export function previewPublication(source = previewSource()) {
  const v = source.version;
  return {
    status: "published",
    preview: {
      recordVersion: "meri.artifact-preview.proposal-1",
      previewId: ids.other,
      versionId: v.versionId,
      artifactId: v.artifactId,
      tenantId: v.binding.tenantId,
      conversationId: v.binding.conversationId,
      source: {
        sha256: v.object.sha256,
        bytes: v.object.bytes,
        mimeType: v.mimeType,
      },
      preview: {
        object: { ...v.object, sha256: previewSha, bytes: previewBytes.length },
        mimeType: "application/pdf",
        pages: 1,
      },
      conversion: {
        method: "office-pdf",
        inputSha256: v.object.sha256,
        outputSha256: previewSha,
        qualificationId: "synthetic-not-native",
        imageDigest: "sha256:" + "b".repeat(64),
      },
      status: "published",
      nativeQualified: false,
      createdAt: v.createdAt,
    },
  };
}
