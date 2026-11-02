/** Presentation only: retain the original title in the owning record/details. */
export function readableTitle(title: string, fallback: string) {
  const value = title.trim();
  const machine =
    /^(?:user|client|firm|meri|system|agent|memory-review|learning-signal):\S+$/i.test(
      value,
    ) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  return value && !machine ? value : fallback;
}

export const friendlyUtc = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
