# Native session claim verification remains held

A final read-only check of backend `apps/api/src/auth/clerk.service.ts` at source `111f269d749cae0249c2141779bd6d7deb93f45c` (Git blob `0acf9f955c667df64a8bc4d4b3534b6054abca6c`) confirms that `assertActiveApplicationAuthoritySession` requires a nonempty signed `sid`, signed `sub`, a valid expiry, and a matching active session from Clerk. Preview additionally requires its pinned issuer, organization and existing internal tenant membership.

The frontend receiver deliberately preserves its existing `getToken({ template: "capiro" })` call. No Clerk template, token-selection policy, provider configuration, session handling, or authentication implementation was changed. The actual production template claims have not been read or verified. The synthetic token callback in source tests establishes transport behavior only; it does not prove that a deployed token satisfies this native contract.

Before any activation, the designated auth/runtime owner must establish that the existing approved token supplies the backend's required session and organization claims and is accepted by the isolated preview service. Missing or revoked session authority must fail closed. No fallback to ordinary Core, weaker token checks, template edit, new Clerk app or token-mode change is authorized by this receiving work.

This note follows the preserved evidence archive and does not alter its bytes, qualified source, image inputs or test results. The backend file was read only; its explicit change-control notice remains respected.
