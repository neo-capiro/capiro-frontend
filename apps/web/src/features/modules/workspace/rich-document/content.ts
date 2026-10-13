/** Existing Workspace sectionContent is HTML or a legacy literal plain string. */
export function isRichSection(value: string) {
  return /<\/?[a-z][^>]*>/i.test(value);
}
export function plainSectionHtml(value: string) {
  const escaped = value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
  return escaped
    .split(/\r?\n/)
    .map((line) => `<p>${line || "<br>"}</p>`)
    .join("");
}
export function workspaceLink(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ["https:", "http:", "mailto:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
/** Matches the existing canonical operation bound; never truncate content. */
export function sectionSizeError(value: string) {
  return value.length > 50_000
    ? "This section exceeds the 50,000-character saved-content limit. Shorten it before saving."
    : "";
}
