import { z } from "zod";
import { safeEvidenceUrl, type Setup } from "./contracts";
import type { Attachment } from "@/features/portfolio/files/public";

export const researchInputSchema = z
  .strictObject({
    sources: z
      .array(
        z.enum([
          "public_web",
          "synced_email",
          "sam_gov",
          "lda",
          "program_elements",
          "bill_tracker",
        ]),
      )
      .max(6),
    attachmentIds: z.array(z.uuid()).max(10),
    ldaClientIds: z.array(z.number().int().positive()).max(20),
    website: z
      .string()
      .max(500)
      .refine((value) => !value || Boolean(safeEvidenceUrl(value))),
  })
  .refine(
    (value) => value.sources.length + value.attachmentIds.length > 0,
    "Choose a source or a ready document.",
  );
export const researchCommandSchema = z.strictObject({
  requestId: z.uuid(),
  input: researchInputSchema,
});
export type ResearchInput = z.infer<typeof researchInputSchema>;
export type ResearchCommand = z.infer<typeof researchCommandSchema>;
export const canResearchFile = (file: Attachment, clientId: string) =>
  file.clientId === clientId &&
  file.usable !== false &&
  file.lifecycleStatus === "available" &&
  ["extracted", "truncated"].includes(file.extractionStatus ?? "");

export function validateResearchSelection(
  input: ResearchInput,
  setup: Setup,
  files: Attachment[],
) {
  const parsed = researchInputSchema.parse(input);
  const offered = new Set(
    [...setup.selectedIdentities, ...setup.suggestedIdentities].map(
      (value) => value.id,
    ),
  );
  if (parsed.ldaClientIds.some((id) => !offered.has(id)))
    throw new Error(
      "An identity is no longer offered. Refresh the setup and review your choices.",
    );
  if (
    parsed.attachmentIds.some(
      (id) =>
        !files.some(
          (file) => file.id === id && canResearchFile(file, setup.clientId),
        ),
    )
  )
    throw new Error(
      "A selected document is no longer ready. Refresh the files and review your choices.",
    );
  for (const values of [
    parsed.sources,
    parsed.attachmentIds,
    parsed.ldaClientIds,
  ])
    if (new Set<string | number>(values).size !== values.length)
      throw new Error("Choose each research input once.");
  return parsed;
}
