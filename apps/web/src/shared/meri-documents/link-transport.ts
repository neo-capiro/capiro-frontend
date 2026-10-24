import { boundedJsonBytes } from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";
import { issuedLink, linkRefusal } from "./link-wire";

type Refused = { ok: false; code: string; accessDenied?: true };
const decode = async (response: Response, signal: AbortSignal) =>
  JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(
      await boundedJsonBytes(response, signal, 4096),
    ),
  ) as unknown;

/**
 * Browser side of the signed download-link routes. The opaque session credential is cleared when
 * the session lifetime ends. The token is returned to the caller in memory only and is sent back in
 * the redeem body; it is never placed in a URL, stored or logged.
 */
export function createLinkTransport(
  credential: string,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  let current = lifetime.aborted ? "" : credential;
  lifetime.addEventListener("abort", () => (current = ""), { once: true });
  function post(
    action: "issue" | "redeem",
    body: unknown,
    signal: AbortSignal,
  ) {
    if (!current) throw new Error("Artifact session ended");
    return fetcher(`/api/documents/links/${action}`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        [actionSessionHeader]: current,
      },
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal,
    });
  }
  async function refused(
    response: Response,
    signal: AbortSignal,
  ): Promise<Refused> {
    const accessDenied = response.status === 401 || response.status === 403;
    let code: string;
    try {
      code = linkRefusal.parse(await decode(response, signal)).error.code;
    } catch {
      code = "DOWNLOAD_LINK_UNAVAILABLE";
    }
    return {
      ok: false,
      code,
      ...(accessDenied ? { accessDenied: true as const } : {}),
    };
  }
  return {
    async issue(versionId: string, signal: AbortSignal) {
      const response = await post("issue", { versionId }, signal);
      if (response.status !== 200) return refused(response, signal);
      const link = issuedLink.parse(await decode(response, signal));
      return link.versionId === versionId
        ? { ok: true as const, token: link.token }
        : ({ ok: false, code: "VERSION_MISMATCH" } as Refused);
    },
    /** The attachment response for a 200; the closed refusal otherwise. */
    async redeem(token: string, signal: AbortSignal) {
      const response = await post("redeem", { token }, signal);
      return response.status === 200
        ? { ok: true as const, response }
        : refused(response, signal);
    },
  };
}
