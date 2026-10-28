/**
 * A Core record is a PROSPECT only when profileType is literally "PROSPECT"
 * (trimmed, case-insensitive). Everything else (including null/undefined)
 * is considered a CLIENT, matching the DB default.
 *
 * This ensures consistency across catalog projection, tab counts, and pulse.
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
