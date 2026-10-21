import {
  documentAccessMetadata,
  type DocumentInspectionResponse,
} from "@capiro/meri-client/document-access";
import { created, documentBytes } from "./meri-document-public-fixtures";

/** Synthetic structural receipts only; these bytes do not qualify native files. */
export const accessFormats = documentAccessMetadata.formats;
export type AccessFormat = (typeof accessFormats)[number];
export function accessInspection(
  format: AccessFormat,
): DocumentInspectionResponse {
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
    } as DocumentInspectionResponse["inspection"],
  };
}
export function accessBinary(
  receipt: DocumentInspectionResponse,
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
