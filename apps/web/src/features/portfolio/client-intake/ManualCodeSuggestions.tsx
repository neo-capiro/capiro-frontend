import {
  CodeSuggestions,
  type RegistrationCodeField,
} from "@/features/portfolio/profile-build/public";
import type { StepProps } from "./Fields";
export function ManualCodeSuggestions({
  field,
  label,
  values,
  suggestionSubject,
  onAcceptCode,
}: StepProps & { field: RegistrationCodeField; label: string }) {
  if (!onAcceptCode) return null;
  const contextText = [
    values.description,
    ...values.capabilities.map((item) => `${item.name}: ${item.description}`),
    `Sectors: ${values.sectors.join(", ")}`,
    `Funding priorities: ${values.fundingPriorities.join("; ")}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 12000);
  return (
    <CodeSuggestions
      field={field}
      label={label}
      value={values[field]}
      context={{
        identity: {
          name: values.name.trim(),
          ...(values.website.trim() ? { website: values.website.trim() } : {}),
          ...(values.description.trim()
            ? { description: values.description.trim().slice(0, 600) }
            : {}),
        },
        existingIdentifiers: {
          ...(/^[A-Z0-9]{12}$/i.test(values.uei)
            ? { uei: values.uei.toUpperCase() }
            : {}),
          ...(/^[A-Z0-9]{5}$/i.test(values.cageCode)
            ? { cageCode: values.cageCode.toUpperCase() }
            : {}),
        },
        contextText,
        ...(suggestionSubject ? { subject: suggestionSubject } : {}),
      }}
      onAccept={(suggestion) => onAcceptCode(field, suggestion)}
    />
  );
}
