# Restart-safe Quick log follow-up recovery

The independent eabc8bf/b5028cf review found a P1 duplicate-write path: a Core
activity/task pair commits, its response is lost, and document reload clears the
query cache so the next submit allocates a replacement request UUID. This is a
source defect. The local pre-repair regression records two pairs where one is
required in evidence/command-restart-red; the published candidate is failed.

## Ownership and persistence design

Keep Core's existing command protocol and current-client writer semantics. The
feature owns its strict retained input/known-receipt schema and fresh Core `me`
and client read; shared Portfolio recovery owns the browser journal, encryption
and storage consistency. No backend endpoint, authorization bypass, global
session credential or copied backend implementation is introduced.

Before dispatch, persist the original request UUID and exact normalized body in
an IndexedDB transaction with strict durability, then read it back. Serialize
journal operations across tabs using Web Locks. An independent localStorage fence
contains only the scope and request UUID; a missing/corrupt record or fence is a
visible hold, never a fresh intent. Schema/request lineage, ciphertext and scope
must all agree. Existing pending intent wins over a competing tab's new submit.

Scope is the normalized tuple of operation, tenant UUID, current Core actor UUID
and client UUID. On every open/reload, validate fresh Core identity/role and current
client access before reading/decrypting that scope; cached browser identity alone
never authorizes recovery. The pending form is hidden while checking and on
refusal. Context change/expiry aborts work and clears rendered/cache state; another
actor, tenant or client cannot select, display or dispatch the former scope.

Only submitted unresolved command input is persisted. AES-GCM encrypts its payload
with a nonextractable CryptoKey structured-cloned into the same IndexedDB record;
scope is authenticated additional data. localStorage contains no draft body.
This avoids plaintext drafts in storage and accidental application disclosure; it
is not a cryptographic boundary against malicious same-origin JavaScript, XSS,
DevTools or a person controlling the browser profile. Backend authorization remains
mandatory. No tokens or credentials are stored. Successful explicit Done replaces
the encrypted payload with an acknowledged marker, allowing the next intent.

Reload never POSTs automatically. It restores the exact pending form/request ID and
offers explicit Read. GET404 is nondisclosing and never permits a new key; explicit
Recover can only replay the stored original body/key. Resume still requires a
fresh exact-context receipt and its server version. Storage read/write refusal,
missing APIs or corruption prevents dispatch and offers explicit retry. Closing or
interrupting a write preserves its original command before any network mutation.

## Limits and required verification

Both browser stores deliberately erased together are indistinguishable from a
first visit under the existing backend contract. Another browser/profile/device
also has no journal. There is no authorized command-list/discard endpoint, so this
change does not claim cross-device or cleared-site-data recovery. Users must not
clear storage to bypass a hold. Server command keys remain authoritative.

Tests must demonstrate the failed original baseline and successful lost-response
reload with one durable pair, exact-key/body replay after nondisclosing404, fresh
Core reads before restoration, actor/tenant/client replacement, expiry, interrupted
writes, unavailable/corrupt storage, opaque payload storage and explicit completion.
Focused repair results are not final combined qualification, live session/provider
checks, native Core/Planner/RLS/migration acceptance or any of the337 Portfolio rows.

## Focused repair evidence, 07:06 UTC

The final focused repair run passed23 command browser cases with no skips/flakes,
including a new document/tab lifetime, and29 command/journal units. Typecheck,
focused lint and format passed. Architecture:401 signals,376 reviewed,25 retained
inherited unreviewed,0 blocking/boundary errors. The separate21-case run includes
seven original capability presentation cases with their original assertions.
The full-suite capability failure was a test sequencing race: Radix roving focus
uses a scheduled callback. Await Profile focus after ArrowLeft before focusing
Details; keep the Name-after-Tab and opener-return assertions unchanged.

The first repair attempt had a bootstrap crash because undefined state and scope
compared equal before reading state.token; the corrected explicit state guard
passed. Its typecheck failure is preserved. A new positive test initially used
an incorrect button label (Recover original request instead of the existing
Recover original save); its failure and trace are preserved separately. Neither
is the pre-repair duplicate-write baseline, which remains under command-restart-red.

The parent reviewer supplied hashes for three immutable controls (negative source,
launcher, positive acceptance), but their source text was not written before
context compaction and is not on this mounted filesystem. Exact byte restoration
has been requested; these independent artifacts have not been reconstructed or
claimed as run. The local red/green control is explicitly separate.
