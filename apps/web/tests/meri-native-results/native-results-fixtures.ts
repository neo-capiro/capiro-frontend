/**
 * Fixtures for the additive native-result receiver. Only the receiver's own shapes are described
 * here: no network, cloud, provider, model or filesystem is reachable from this file.
 */
export const nativeResultIds = {
  manifest: "00000000-0000-4000-8000-000000000009",
  capturedAt: "2026-10-28T10:00:00.000Z",
} as const;
export const versionId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const digest = (character: string) => character.repeat(64);
export const nativeResultRow = (
  n: number,
  path: string,
  bytes = 7,
  executable = false,
) => ({
  versionId: versionId(n),
  path,
  bytes,
  sha256: digest("a"),
  executable,
});
export const nativeResultsPage = <Row>(
  results: readonly Row[],
  truncated = false,
) => ({
  manifestId: nativeResultIds.manifest,
  capturedAt: nativeResultIds.capturedAt,
  results,
  truncated,
});
/** The exact bytes the contract's closed request puts on the wire. */
export const closedRequestBody = "{}";
export const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
/** A JSON-typed body the receiver cannot parse, to separate format from status refusal. */
export const unparsableResponse = (status = 200) =>
  new Response("not json", {
    status,
    headers: { "Content-Type": "application/json" },
  });
/** A path the receiver's own path rule admits but which is hostile markup when interpolated. */
export const hostilePath = `<img src=x onerror="alert(1)">`;
