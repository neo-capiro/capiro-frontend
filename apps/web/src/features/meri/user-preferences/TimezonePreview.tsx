/** Fixed example keeps the preview stable across server and browser rendering. */
export function TimezonePreview({ timezone }: { timezone: string }) {
  if (!timezone.trim())
    return (
      <p>
        Timezone preview uses the workspace default when selected by a connected
        time display. This panel does not change application-wide timestamps.
      </p>
    );
  try {
    const sample = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone.trim(),
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date("2026-01-15T15:00:00Z"));
    return (
      <p role="status">
        Timezone preview: {sample} ({timezone.trim()}). Example instant: January
        15, 2026 at 15:00 UTC. Application-wide timestamps are unchanged.
      </p>
    );
  } catch {
    return (
      <p role="status">
        Enter a valid IANA timezone to preview its time display.
      </p>
    );
  }
}
