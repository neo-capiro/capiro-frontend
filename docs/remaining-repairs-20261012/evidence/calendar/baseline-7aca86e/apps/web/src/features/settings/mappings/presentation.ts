import type { z } from "zod";
import type { mappingSchema } from "../../../shared/capiro/operations/settings-admin/mappings";
import { mappingRelationshipSchema } from "../../../shared/capiro/operations/settings-admin/mappings";
export { eligibleForBulkReview } from "./bulkReview";

export type Mapping = z.infer<typeof mappingSchema>;
export const mappingSources = [
  { id: "lda", label: "LDA registrant (issue codes)" },
  { id: "fec_employer", label: "FEC employer (contributions)" },
  { id: "fec_committee", label: "FEC committee (PAC giving)" },
  { id: "contracting", label: "Federal contractor (contracts)" },
  { id: "assistance_recipient", label: "Assistance recipient (grants)" },
] as const;
export type SearchableMappingSource = (typeof mappingSources)[number]["id"];
export const mappingRelationships = mappingRelationshipSchema.options;
export type MappingRelationship = z.infer<typeof mappingRelationshipSchema>;
export const requiresAwardDecision = (source: string) =>
  source === "contracting" || source === "assistance_recipient";
export function basisLabel(value: string | null) {
  return value
    ? value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())
    : "Basis not recorded";
}
