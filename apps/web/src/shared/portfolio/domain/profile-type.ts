/**
 * Core stores `profileType` as a nullable column defaulting to "CLIENT", so
 * older client rows are NULL. Comparing it strictly against "CLIENT" drops the
 * record from both the Clients and the Prospects catalogs while leaving it in
 * All — live, that hid 12 of 18 profiles from both filtered tabs.
 *
 * One rule, used by every surface that splits the roster: a record is a prospect
 * only when profileType trims/cases to "PROSPECT"; anything else, including
 * null/undefined, is a client. See `apps/api/prisma/schema.prisma` (Client).
 */
export function isProspectRecord(
  profileType: string | null | undefined,
): boolean {
  return (
    typeof profileType === "string" &&
    profileType.trim().toUpperCase() === "PROSPECT"
  );
}

export function isClientRecord(
  profileType: string | null | undefined,
): boolean {
  return !isProspectRecord(profileType);
}
