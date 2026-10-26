import { z } from "zod";
import type { NewsletterOutreachRecord } from "@capiro/shared/newsletter";
import {
  newsletterDestinationInput,
  type NewsletterDestinationInput,
} from "../../../../shared/capiro/operations/newsletter-delivery";

/** Persisted targets are editable selection hints, never proof of a prepared envelope. */
export function savedDestinations(
  record: NewsletterOutreachRecord,
): NewsletterDestinationInput[] {
  const parsed = z
    .array(newsletterDestinationInput)
    .max(500)
    .safeParse(record.targets);
  return parsed.success ? parsed.data : [];
}
export function addDestination(
  current: NewsletterDestinationInput[],
  candidate: NewsletterDestinationInput,
) {
  const next = newsletterDestinationInput.parse({
    ...candidate,
    email: candidate.email.trim().toLowerCase(),
  });
  return current.some((row) => row.email.toLowerCase() === next.email)
    ? current
    : [...current, next];
}
export function copyAddresses(value: string) {
  return z
    .array(z.email())
    .max(50)
    .parse([
      ...new Set(
        value
          .split(/[,;\n]/)
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ]);
}
