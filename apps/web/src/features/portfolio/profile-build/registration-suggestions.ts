import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { profileSubjectSchema } from "./subject";
export const registrationCodeFieldSchema = z.enum([
  "uei",
  "cageCode",
  "naicsCodes",
  "pscCodes",
  "issueCodes",
]);
export type RegistrationCodeField = z.infer<typeof registrationCodeFieldSchema>;
export const suggestionEvidenceSchema = z.object({
  label: z.string().min(1),
  url: z.string().nullable().optional(),
  attachmentId: z.uuid().nullable().optional(),
  excerpt: z.string().min(1),
  source: z.string().nullable().optional(),
  observedAt: z.string().nullable().optional(),
});
export const codeSuggestionSchema = z.object({
  code: z.string().min(1).max(12),
  label: z.string(),
  reason: z.string(),
  evidence: z.array(suggestionEvidenceSchema).min(1),
  confidence: z.number().min(0).max(1),
  reference: z.json().optional(),
});
export type CodeSuggestion = z.infer<typeof codeSuggestionSchema>;
export type AcceptedCodeEvidence = Partial<
  Record<
    RegistrationCodeField,
    { code: string; evidence: CodeSuggestion["evidence"] }[]
  >
>;
export const registrationSuggestionContextSchema = z.object({
  identity: z.object({
    name: z.string().trim().min(2).max(200),
    website: z.string().max(500).optional(),
    description: z.string().max(600).optional(),
  }),
  existingIdentifiers: z
    .object({
      uei: z.string().max(12).optional(),
      cageCode: z.string().max(5).optional(),
    })
    .optional(),
  contextText: z.string().max(12000).optional(),
  subject: profileSubjectSchema.optional(),
  attachmentIds: z.array(z.uuid()).max(3).optional(),
});
export type RegistrationSuggestionContext = z.infer<
  typeof registrationSuggestionContextSchema
>;
const commandSchema = registrationSuggestionContextSchema.extend({
  requestId: z.uuid(),
  field: registrationCodeFieldSchema,
  currentValue: z.union([z.string(), z.array(z.string())]).optional(),
});
export type RegistrationSuggestionCommand = z.infer<typeof commandSchema>;
export const validSuggestionCode = (
  field: RegistrationCodeField,
  code: string,
) =>
  ({
    uei: /^[A-Z0-9]{12}$/,
    cageCode: /^[A-Z0-9]{5}$/,
    naicsCodes: /^\d{2,6}$/,
    pscCodes: /^[A-Z0-9]{4}$/,
    issueCodes: /^[A-Z]{3}$/,
  })[field].test(code);
export const registrationSuggestionsSchema = z
  .object({
    requestId: z.uuid(),
    field: registrationCodeFieldSchema,
    status: z.enum(["complete", "empty", "unavailable"]),
    message: z.string(),
    suggestions: z.array(codeSuggestionSchema).max(30),
    sourceGaps: z.array(z.string()),
  })
  .refine(
    (response) =>
      response.suggestions.every((item) =>
        validSuggestionCode(response.field, item.code),
      ) &&
      (response.status === "complete" || response.suggestions.length === 0),
    "Invalid sourced code suggestions",
  );
export function requestRegistrationSuggestions(
  api: ApiClient,
  command: RegistrationSuggestionCommand,
  signal?: AbortSignal,
) {
  const body = commandSchema.parse(command);
  return api.request(
    "core",
    "clients/profile-build/registration-suggestions",
    registrationSuggestionsSchema.refine(
      (response) =>
        response.requestId === body.requestId && response.field === body.field,
      "Suggestion receipt mismatch",
    ),
    { method: "POST", body, signal },
  );
}
