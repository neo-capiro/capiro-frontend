import { ApiError } from "./http";

/** Core's native identity/roster reads compare live membership snapshots around
 * I/O. A newly created or enriched client can change that snapshot. Only this
 * explicit read refusal gets two fresh attempts; no write uses this policy.
 * Other failures retain the provider's single transient-service retry.
 */
export function retryNativeRead(failures: number, error: unknown) {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    error.message === "Current membership changed; reload"
  )
    return failures < 2;
  return failures < 1 && (!(error instanceof ApiError) || error.status >= 500);
}
