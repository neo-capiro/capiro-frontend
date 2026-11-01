import { previewBackendRejection } from "../../../shared/preview/backend-policy.server";
import { readBuildIdentity } from "../../../shared/build/build-identity.server";

/** The serving tuple for testers: deployment configuration only, no backend call, no session data. */
export function GET() {
  const held = previewBackendRejection(process.env);
  if (held) return held;
  return Response.json(readBuildIdentity(process.env), {
    headers: { "Cache-Control": "no-store" },
  });
}
