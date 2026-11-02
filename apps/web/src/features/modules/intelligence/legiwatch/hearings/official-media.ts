export type OfficialMedia =
  | {
      kind: "video";
      url: string;
      type: "video/mp4" | "video/webm" | "application/vnd.apple.mpegurl";
    }
  | { kind: "link"; url: string }
  | { kind: "unavailable" };

/** Inspect only the supplied public source. Never scrape, proxy or invent media URLs. */
export function officialMedia(source?: string | null): OfficialMedia {
  if (!source) return { kind: "unavailable" };
  try {
    const url = new URL(source);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    // Reject clearly nonpublic destinations before requesting media metadata.
    if (
      !host.includes(".") ||
      host.includes(":") ||
      /^[\d.]+$/.test(host) ||
      /(^|\.)(localhost|local|internal|lan|home|home\.arpa|test|invalid)$/.test(host)
    )
      return { kind: "unavailable" };
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return { kind: "unavailable" };
    const extension = url.pathname.toLowerCase().split(".").at(-1);
    const type =
      extension === "mp4"
        ? "video/mp4"
        : extension === "webm"
          ? "video/webm"
          : extension === "m3u8"
            ? "application/vnd.apple.mpegurl"
            : null;
    return type
      ? { kind: "video", url: url.href, type }
      : { kind: "link", url: url.href };
  } catch {
    return { kind: "unavailable" };
  }
}
