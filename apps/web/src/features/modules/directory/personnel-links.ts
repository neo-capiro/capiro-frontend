/** Only ordinary public web URLs may be opened from personnel evidence. */
export function externalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {
    // Invalid and relative URLs are unavailable, never opened.
  }
  return null;
}
