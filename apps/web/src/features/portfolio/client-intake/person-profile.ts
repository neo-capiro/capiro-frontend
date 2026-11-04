import type {
  PersonProfileInput,
  AcceptedCodeEvidence,
  RegistrationCodeField,
  ProfileSnapshot,
} from "@/features/portfolio/profile-build/public";
import { intakeFormSchema, type IntakeForm } from "./form";
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
export function personProfileInput(
  values: IntakeForm,
  initial?: IntakeForm,
  acceptedEvidence: AcceptedCodeEvidence = {},
): PersonProfileInput {
  const changed = (key: keyof IntakeForm) =>
    !initial || !same(values[key], initial[key]);
  const fields: NonNullable<PersonProfileInput["fields"]> = {};
  for (const key of [
    "name",
    "website",
    "description",
    "primaryContactName",
    "primaryContactEmail",
    "primaryContactPhone",
    "uei",
    "cageCode",
    "naicsCodes",
    "pscCodes",
    "issueCodes",
    "samStatus",
    "samExpirationDate",
    "ein",
    "ldaRegistrantName",
    "sbClassification",
    "applicantTypes",
    "setAsideCertifications",
  ] as const) {
    if (changed(key) && (initial || values[key] !== ""))
      fields[key] = values[key];
  }
  const fieldEvidence = Object.fromEntries(
    Object.entries(acceptedEvidence).flatMap(([key, rows]) => {
      const field = key as RegistrationCodeField;
      const value = values[field];
      const selected = Array.isArray(value) ? value : [value];
      const evidence =
        rows
          ?.filter((row) => selected.includes(row.code))
          .map((row) => ({
            ...row,
            evidence: row.evidence.map((item) => ({
              label: item.label,
              excerpt: item.excerpt,
              ...(item.url ? { url: item.url } : {}),
              ...(item.attachmentId ? { attachmentId: item.attachmentId } : {}),
              ...(item.source ? { source: item.source } : {}),
              ...(item.observedAt ? { observedAt: item.observedAt } : {}),
            })),
          })) ?? [];
      return field in fields && evidence.length ? [[field, evidence]] : [];
    }),
  );
  const advocacyKeys = [
    "sectors",
    "submissionTracks",
    "issueCodes",
    "fundingPriorities",
    "engagementStartDate",
    "internalNotes",
  ] as const;
  return {
    ...(Object.keys(fields).length ? { fields } : {}),
    ...(Object.keys(fieldEvidence).length ? { fieldEvidence } : {}),
    ...Object.fromEntries(
      (["locations", "leadership", "capabilities"] as const)
        .filter(changed)
        .map((key) => [
          key,
          key === "locations"
            ? values.locations.map((row) => ({
                ...row,
                country: row.country.trim()
                  ? row.country.trim().toUpperCase()
                  : undefined,
              }))
            : values[key],
        ]),
    ),
    ...(advocacyKeys.some(changed)
      ? {
          advocacy: Object.fromEntries(
            advocacyKeys.map((key) => [key, values[key]]),
          ),
        }
      : {}),
  };
}
export function profileToIntake(
  base: IntakeForm,
  profile: ProfileSnapshot,
): IntakeForm {
  const record = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const advocacy = Array.isArray(profile.sections.advocacy)
    ? Object.assign({}, ...profile.sections.advocacy.map(record))
    : record(profile.sections.advocacy);
  const draft = {
    ...base,
    ...profile.fields,
    ...advocacy,
  };
  const text = (value: unknown, fallback = "") =>
    typeof value === "string" ? value : fallback;
  draft.locations = profile.sections.locations.map((value) => {
    const v = record(value);
    return {
      id: text(v.id) || undefined,
      name: text(v.name),
      role: text(v.role ?? v.siteRole, "other"),
      status: text(v.status ?? v.siteStatus, "unknown"),
      country: text(v.country),
      addressLine: text(v.addressLine ?? v.address),
      city: text(v.city),
      state: text(v.state),
      zip: text(v.zip ?? v.postalCode),
    };
  }) as IntakeForm["locations"];
  draft.leadership = profile.sections.leadership.map((value) => {
    const v = record(value);
    return {
      id: text(v.id) || undefined,
      name: text(v.name),
      title: text(v.title),
      email: text(v.email),
    };
  });
  draft.capabilities = profile.sections.capabilities.map((value) => {
    const v = record(value);
    return {
      id: text(v.id) || undefined,
      name: text(v.name ?? v.title),
      type: text(v.type, "product"),
      description: text(v.description),
    };
  }) as IntakeForm["capabilities"];
  return Object.fromEntries(
    Object.entries(base).map(([key, fallback]) => {
      const schema = intakeFormSchema.shape[key as keyof IntakeForm];
      const value = draft[key as keyof IntakeForm];
      return [
        key,
        ["locations", "leadership", "capabilities"].includes(key) ||
        schema.safeParse(value).success
          ? value
          : fallback,
      ];
    }),
  ) as IntakeForm;
}
