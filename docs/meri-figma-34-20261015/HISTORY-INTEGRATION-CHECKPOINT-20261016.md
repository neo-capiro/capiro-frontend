# Meri history UI source checkpoint - consumer qualification pending

This isolated successor to preparation commit
`68619614f23116d3735e5634a466243303cc4acd` prepares native history integration.
It is **not an accepted shipping candidate**. Parent independently accepted the
actual public artifact `5aa13719e8706704785d142ad903fb42db51220e`, generated from
accepted source `b8322cdc86e4b113b326e357acdb148394ee39c3`. The exact `0.1.6` tarball
is now vendored: 467014 bytes, 31 entries, SHA-256
`050ce4a5a0facb0c3df4dbc14c2dedb5b49bfdfe618c4f88148f7779300313a4`.
No install or runtime acceptance is implied by adoption.

## Implemented source and ownership

The server-only history proxy uses the existing Clerk `capiro` membership token,
fixed public metadata routes and the canonical public byte receivers. It rejects
browser Authorization/cursor substitution, foreign origins, aliases, redirects
and encoded responses, bounds complete bodies, and marks indeterminate dispatched
reservations UNKNOWN. Existing opaque-session/run-local routes keep their owner.
The browser history client receives direct admitted envelopes; it never receives
the native membership credential. No new hand-maintained transport DTO is added.

Scoped query state reads real conversation lists and transcript pages. Cross-page
composition checks immutable run/request identity, cursor continuity, event
uniqueness, run ranges and resumed prompt lineage. It preserves original run-local
event sequences. UI prompt keys bind conversation plus logical request identity;
different same-text submissions remain separate. Partial/loading/unavailable
history is explicit. Native membership denial hides saved data and revokes the
existing session through its canonical controller.

Desktop/mobile recents use real admitted rows only when the existing conversation
workflow flag is enabled and the current account/client are verified. Links retain
client and conversation selection through reload. Labels use canonical creation
time because the contract provides no title. Search and new-conversation controls
remain unavailable. Synthetic fixtures remain test-only. Portfolio, Modules,
Settings, selected-client navigation and unrelated registry/source paths are
preserved; additional shell and mixed-test paths were coordinated with the current
frontend owner.

The scoped turn journal records a request ID and prompt **before** reservation
dispatch. Recovery always replays the same source and checks the same target.
It fences cache replacement, immutable-identity replacement and late completion
of an older source. An exact target session receives that retained command identity;
reconnect never broadens to an unspecified successor. The SDK remains the submit,
ACK and observation owner. A terminal replay ACK triggers its exact run-history
read so an ACK with no output events cannot conceal the stored response.

## Required missing-identity barrier

Backend owner C confirmed that RESERVED contains no original first-submit ID or
prompt. A snapshot without an accepted target is not positively-unsent proof.
Hard reload with no recoverable immutable submit identity therefore blocks Send
and allows only the same source mapping/transcript read. An accepted target keeps
its original stored identity for recovery; the UI never substitutes a new one.

The same issue exists for an initial unsubmitted run: native transcript returns
404 `CONVERSATION_NOT_FOUND`, with no empty/unsubmitted admission receipt. Existing
opaque session issuance and a 503 owner failure supply no initial-input proof.
The UI therefore blocks a new first-submit ID in that state. The parent-owned
decision is an additive canonical bootstrap/initial-input admission or recovery
receipt; backend issuance/public-contract ownership must allocate it. No new
shape or migration was invented here. This blocker is separate from accepted
history shape and genuine membership/provider/startup qualification. Permanently
disabled initial Send is not completed first-turn functionality. Parent is
coordinating the additive canonical admission/recovery receipt with its lifecycle
owner; this source intentionally remains fail-closed until that owner supplies it.

## Checks and retained limitations

- **16/16 focused synthetic Node controls PASS**: eight page/scope/lineage cases
  and eight immutable reservation/recovery cases. One 128 MiB V8 process, no test
  children, 120-second hard outer bound; latest combined duration 135.081 ms.
  The process exited before the supervisor's first 250 ms memory sample, so its
  receipt's zero sample is not a measured zero working set. Fresh host capacity,
  stdout/stderr, argv/PID/exit/timeout receipts remain under task-local evidence.
- Parser-only architecture scan PASS: zero dependency errors and zero size
  blockers; 19 inherited unreviewed signals remain. The two exact additive public
  export/server-adapter declarations were authorized by parent. Scanner logic,
  baseline, review DATA and unrelated declarations are unchanged. Earlier failed
  allocation/size scans remain in task-local evidence. Source responsibilities
  were extracted cohesively, with no size exceptions.
- Public package byte bindings PASS for all nine recorded rows. A separate lock
  proof verified only four package objects changed: app dependency, client dev/
  peer dependency, and each consumer's installed contract version/path/integrity.
  Restoring those exact allowed fields reproduces the complete prior lock object.
  New lock SHA-256 is
  `b4fd9802aa4acefc0f596becc500fa133d4ee4ddd2b49e679abae95286408751`.
- **16 new proxy/client byte-boundary cases UNRUN** pending admitted checkpoint.
  Five new saved-current/order display cases in the existing live unit file are
  also **UNRUN**. Six new native-history browser cases and the three
  existing selector/reload cases are **UNRUN**. Existing unknown-submit/retry and
  mixed Meri cases now begin from an admitted terminal source and fixed native
  reservation; original exact-retry/scoping assertions remain.
- Semantic typing, production build and Meri/Settings browser qualification remain
  **UNRUN**. Prior manual accessibility incomplete records and untested states are
  preserved; no visual baseline or test-server/config/supervisor change was made.
  These authored browser tests are synthetic identity/transport interaction
  controls, never real provider, authentication or durability acceptance.

## Next admitted integration checkpoint

The accepted tarball, additive vendor provenance and narrow package/lock references
are authored. Meri client peer/dev references move with the app to `0.1.6`;
qualification-transport's separate frozen `0.1.0` dependency, unrelated versions/
integrities, historical vendor records and manifests remain unchanged. Parent
authorized the two additive architecture declarations:
`@capiro/meri-contracts/conversation-history` in `publicExports`, and the existing
conversation route's `history-proxy.ts` server-adapter dependency.

Independent read-only UI archive inspection verified all 31 entries, exact
integrity, four generated outputs and sixteen provenance source rows. Its receipt
`history-artifact-independent-review.json` has SHA-256
`8e40d9a06b0856cb9ad778a4dcc5edc2ac0d8742c36bbed592222dfd3eb42b94`.
Compared with the historical `0.1.3` archive, eighteen of twenty-three prior
entries are byte-identical. Five changed rows are explicitly retained: package
manifest, README, conversation/document application metadata and `validate.mjs`.
The latter is the reviewed lazy per-shape validator compilation; canonical schema,
receiver/browser/declaration bytes for prior wires remain unchanged. The first
inspection's mistaken metadata-file assumption failed and is preserved separately;
the corrected archive inspection passed. No artifact executable was run by that
read-only review. Author generation/determinism, corrected type fixture and thirty
generated-byte controls are reused at their exact artifact, not claimed as UI runs.

Then submit the final source/artifact pins to Shipping and qualification. Extend
the existing [bounded qualification request](UI-QUALIFICATION-REQUEST-20261016.md)
with `tests/meri-history-proxy.test.ts` (16 authored cases), the five new live-view
unit cases, and the new selector/
native-history browser files (3 + 6 authored cases). Registration counts must come
from the actual admitted inventory, not this manual count. Use the canonical
Vitest/browser configs and server, one worker, zero browser retries, fresh reports,
owned PID/port cleanup and the previously requested memory/deadline bounds.
The unchanged default production build still requests its separate 6144 MiB /
20-minute slot. Do not repeat a successful full compiler after that build.

Only the earlier dependency-install slot was granted and completed, at old
`36974aa470d9e1ae5b6cd89c16b8e19dc77e2b6e` with its unchanged root lock. That is
not a grant to install the new artifact or run compiler/browser/build stages.
No main merge, cloud, provider, paid, credential or live-database action occurred.

The requested first stage is a new, separate 512 MiB / ten-minute clean locked
install of this adopted artifact: `node --max-old-space-size=512
"C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" ci --ignore-scripts
--no-audit --no-fund`. Capture exact pin and lock before/after, native host capacity,
PID/tree, exit and cleanup. No install scripts or compiler stage is authorized by
the file adoption. Then request the focused Vitest stage with the original four
files plus `tests/meri-history-proxy.test.ts`, one worker, no file parallelism,
1024 MiB and 120 seconds. The five new display/order cases are in the existing
`meri-conversation-live.test.ts`; no separate duplicate run is needed.

The final two ordering cases cover an important boundary: a reserved target must
not be redirected backwards when history still names its accepted source. Only a
known accepted segment with a strictly later sequence base offers an exact
"Open latest accepted turn" action. That action reuses canonical session issuance
and never creates or submits a new command identity.
