import { z } from "zod";
import { safeEvidenceUrl, type Setup, type ProfileBuildRun } from "./contracts";
import {
  attachmentSchema,
  prospectAttachmentSchema,
  type Attachment,
  type ProspectAttachment,
} from "@/features/portfolio/files/public";
import type { ProfileSubject } from "./subject";

export const researchInputSchema = z
  .strictObject({
    businessUnitId: z.uuid().optional(),
    purpose: z.enum(["capabilities", "alignment", "business_units"]).optional(),
    capabilityId: z.uuid().optional(),
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
  )
  .refine(
    (value) => value.purpose !== "alignment" || Boolean(value.capabilityId),
    "Choose a saved capability for alignment research.",
  )
  .refine(
    (value) => value.purpose !== "business_units" || !value.capabilityId,
    "Business unit discovery does not target a capability.",
  )
  .refine(
    (value) =>
      !value.purpose ||
      value.sources.every((source) => source === "public_web"),
    "This research uses public web sources and ready documents.",
  );
export const researchCommandSchema = z.strictObject({
  requestId: z.uuid(),
  input: researchInputSchema,
});
export type ResearchInput = z.infer<typeof researchInputSchema>;
export type ResearchCommand = z.infer<typeof researchCommandSchema>;
export const canResearchFile = (
  file: Attachment | ProspectAttachment,
  subject: ProfileSubject,
) =>
  (subject.kind === "client"
    ? file.clientId === subject.id
    : "prospectId" in file &&
      file.prospectId === subject.id &&
      file.clientId === null) &&
  file.usable === true &&
  file.viewerMode === "all" &&
  ["ready", "legacy_ready"].includes(file.lifecycleStatus) &&
  ["extracted", "truncated"].includes(file.extractionStatus ?? "");

export function validateResearchSelection(
  input: ResearchInput,
  setup: Setup,
  files: (Attachment | ProspectAttachment)[],
) {
  const parsed = researchInputSchema.parse(input);
  if (
    (parsed.purpose || parsed.capabilityId) &&
    setup.subject.kind !== "client"
  )
    throw new Error(
      "Capability and business unit research require a client profile.",
    );
  if (parsed.businessUnitId && setup.subject.kind !== "client")
    throw new Error("Business unit research requires a client profile.");
  const availableSources =
    setup.availableSources ??
    (setup.subject.kind === "prospect"
      ? ["public_web", "sam_gov", "lda"]
      : undefined);
  if (
    availableSources &&
    parsed.sources.some((source) => !availableSources.includes(source))
  )
    throw new Error(
      "A selected source is no longer available for this profile. Refresh and review the source choices.",
    );
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
          (file) => file.id === id && canResearchFile(file, setup.subject),
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

export function researchFilesSchema(
  subject: ProfileSubject,
  tenantId?: string,
) {
  return z
    .union([prospectAttachmentSchema, attachmentSchema])
    .array()
    .refine(
      (rows) =>
        rows.every((row) =>
          subject.kind === "client"
            ? row.clientId === subject.id
            : "prospectId" in row &&
              row.prospectId === subject.id &&
              row.clientId === null &&
              (!tenantId || row.tenantId === tenantId),
        ),
      "Research documents belong to another profile.",
    );
}

export function matchesResearchScope(
  input: ResearchInput,
  run: ProfileBuildRun,
) {
  return (
    input.purpose === run.setup?.purpose &&
    input.capabilityId === run.setup?.capabilityId &&
    input.businessUnitId === run.setup?.businessUnit?.id &&
    sameSelection(input.sources, run.requestedSources) &&
    sameSelection(input.attachmentIds, run.attachmentIds ?? []) &&
    (!run.setup?.sources || sameSelection(input.sources, run.setup.sources)) &&
    (!run.setup?.attachmentIds ||
      sameSelection(input.attachmentIds, run.setup.attachmentIds)) &&
    // The server includes previously imported identities in addition to the
    // explicitly selected IDs, and uses the saved website when none is supplied.
    input.ldaClientIds.every((id) => run.selectedLdaIds?.includes(id)) &&
    (!input.website.trim() ||
      normalizedResearchWebsite(input.website) ===
        normalizedResearchWebsite(run.setup?.website))
  );
}

function sameSelection(requested: string[], returned: string[]) {
  const actual = new Set(returned);
  return (
    actual.size === requested.length && requested.every((id) => actual.has(id))
  );
}

function normalizedResearchWebsite(value?: string | null) {
  if (!value) return undefined;
  const safe = safeEvidenceUrl(value);
  if (!safe) return undefined;
  const url = new URL(safe);
  url.hash = "";
  return url.toString();
}
