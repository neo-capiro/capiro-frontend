import { responseHeaders } from "../../shared/response-headers";

/** Public brand redirect stays relative even when Next uses an internal host. */
export function GET(): Response {
  const headers = new Headers({ Location: "/onboard/favicon.svg" });
  for (const { key, value } of responseHeaders) headers.set(key, value);
  return new Response(null, { status: 308, headers });
}
