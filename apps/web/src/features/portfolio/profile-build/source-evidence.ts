/** Evidence is displayed as supplied by its owner, including after a review decision. */
export interface ProfileSourceEvidence {
  label: string;
  url?: string | null;
  excerpt?: string | null;
  source?: string | null;
  observedAt?: string | null;
}

export const safeEvidenceUrl = (value: string | null | undefined) => {
  try {
    const url = new URL(value ?? "");
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
};
