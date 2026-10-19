import { z } from "zod";

/**
 * Wire shapes of the signed download-link routes mounted by the Meri control runtime
 * (`apps/runtime/artifacts/download-links.mjs` in neo-capiro/meri-greenfield). The public
 * `@capiro/meri-contracts` 0.1.3 package does not export them yet; this is the frontend's only
 * copy and it is deliberately closed. Replace it with the package export when one is published.
 */
export type LinkAction = "issue" | "redeem";

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
/** `<base64url claims>.<base64url HMAC-SHA256>`; opaque to the browser. */
const token = z.string().regex(/^[A-Za-z0-9_-]{1,1024}\.[A-Za-z0-9_-]{43}$/);

const issueRequest = z.strictObject({ versionId: uuid });
const redeemRequest = z.strictObject({ token });
export const issuedLink = z.strictObject({
  versionId: uuid,
  token,
  expiresAtMs: z.number().int().safe().positive(),
});
export const linkRefusal = z.strictObject({
  error: z.strictObject({ code: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/) }),
});

/** Admits exactly one closed request body and returns its canonical JSON text. */
export function linkRequestBody(action: LinkAction, bytes: Uint8Array) {
  const value: unknown = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  );
  return JSON.stringify(
    action === "issue" ? issueRequest.parse(value) : redeemRequest.parse(value),
  );
}
