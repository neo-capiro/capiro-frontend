import {
  documentAccessMetadata,
  type DocumentInspectionResponse,
} from "@capiro/meri-client/document-access";
import { created, documentBytes } from "./meri-document-public-fixtures";

type GeneratedInspection = Exclude<
  DocumentInspectionResponse,
  { kind: "native-file" }
>;

/** Synthetic structural receipts only; these bytes do not qualify native files. */
export const accessFormats = documentAccessMetadata.formats;
export type AccessFormat = (typeof accessFormats)[number];
export function accessInspection(format: AccessFormat): GeneratedInspection {
  const base = created("txt");
  const details = {
    txt: { encoding: "UTF-8", whitespace: "unchanged" },
    docx: { paragraphs: 1, tables: 0, pictures: 0 },
    xlsx: {
      sheets: ["Data"],
      formulas: 1,
      formulaCache: "unverified-zero-placeholder; recalculation required",
    },
    pptx: { slides: 3, editable: true, visualInspection: "pending" },
    pdf: {
      conversionCompleted: true,
      renderInspection: "pending",
      sourceDocxSha256: "b".repeat(64),
    },
    zip: { rows: 4, columns: ["Name", "Value"], chart: true },
  }[format];
  return {
    version: {
      ...base.version,
      filename: `Synthetic.${format}`,
      mimeType: documentAccessMetadata.mimeTypes[format],
    },
    inspection: {
      ...base.inspection,
      format,
      details,
      currentBytesVerified: true,
    } as GeneratedInspection["inspection"],
  };
}
export function accessBinary(
  receipt: GeneratedInspection,
  bytes: Uint8Array<ArrayBuffer> = documentBytes,
) {
  return new Response(bytes, {
    headers: {
      "Content-Type": receipt.version.mimeType,
      "Content-Disposition": `attachment; filename="${receipt.version.filename}"`,
      "Content-Length": String(receipt.version.object.bytes),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function nativeInspection(
  path = "exports/report.csv",
): Extract<DocumentInspectionResponse, { kind: "native-file" }> {
  const generated = created("txt"),
    { binding, scopes, createdAt, object } = generated.version;
  return {
    kind: "native-file",
    version: {
      versionId: generated.version.versionId,
      binding,
      manifestId: generated.version.artifactId,
      path,
      object: { ...object, objectId: generated.version.versionId },
      scopes,
      createdAt,
    },
    integrity: {
      sha256: object.sha256,
      bytes: object.bytes,
      currentBytesVerified: true,
    },
  };
}
export function nativeBinary(
  receipt: ReturnType<typeof nativeInspection>,
  disposition = 'attachment; filename="report.csv"',
) {
  return new Response(documentBytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": disposition,
      "Content-Length": String(documentBytes.length),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
