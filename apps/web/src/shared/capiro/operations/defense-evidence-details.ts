import { z } from "zod";
// Native-only details from capiro-backend@b49f01017 DefenseEvidenceLocatorDetailsDto.

export const evidenceTextSpan = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  })
  .refine((span) => span.end >= span.start, "Invalid source span");

export const evidenceLocatorDetails = z.object({
  availability: z.enum(["available", "partial", "unavailable"]),
  reason: z.string().nullable(),
  printedPage: z.string().nullable(),
  tableLabel: z.string().nullable(),
  rowLabel: z.string().nullable(),
  columnLabel: z.string().nullable(),
  textSpan: evidenceTextSpan.nullable(),
  boundingBox: z
    .object({
      x0: z.number(),
      y0: z.number(),
      x1: z.number(),
      y1: z.number(),
      coordinateSystem: z.enum(["pdf_points", "pixels", "normalized_0_1"]),
      pageWidth: z.number().positive().optional(),
      pageHeight: z.number().positive().optional(),
    })
    .nullable(),
  structuredElement: z
    .object({
      companionByteSha256: z.string(),
      elementPath: z.string(),
      elementId: z.string().optional(),
    })
    .nullable(),
  sourceSpanHash: z.string().nullable(),
});
