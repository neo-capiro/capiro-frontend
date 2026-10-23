# M2 on the Claude Agent SDK harness

Neo's 23 October SDK-first standing requirements and item 0 supersede the former receiving packet. Root owns integration and deployment. No per-operation authority, proxy, reservation/settlement or custom checkpoint continuity is to be rebuilt. This document records unfinished work, not acceptance of the current branch.

## Boundary and retained behavior

- Control checks the Clerk identity and Core access once per turn. Core enforces tenant, member and client/wall restrictions on data calls. The browser carries context and drafts, never authority.
- General/client binding remains explicit and immutable. Legacy null-client history is not silently General. General can read authorized clients, with walls applied to each result; General memory remains personal and firm only.
- Core remains the title/status/search owner. Rename, archive and 30-day Trash/Restore retain revision/idempotency semantics; archive/Trash/Restore wait for the active run to finish. The canonical retention system owns permanent deletion.
- SDK `SessionStore`, `resume`, `forkSession`, partial events and `session_id` are supported by the pinned SDK and observed spike. R confirms Step2 preserves the public submit/stream DTO; its new record-usage wire is private. Do not invent a browser protocol from SDK option names.

## Completed simplification

PF02 and command-palette client navigation no longer poll for a bootstrap capability. The sole-consumer capability schema/operation/registry/Clerk path and Core endpoint/service/helper are deleted together. The existing account-scoped tab draft keeps its bootstrap request ID, does not embed profile text in a URL and never sends a message. The selected-client read and ordinary Core bootstrap still check access. A new browser test admits only the expected identity/roster/title/client reads and fails on any unexpected traffic, including a capability poll or submit.

## Remaining M2 work and deletion map

| Requirement | Current reusable source | Next implementation on item 0 |
|---|---|---|
| General/client chat, list, history, switching | Explicit binding, current conversation routes, Core bootstrap, history UI;13 current-main offline client-wire cases | Integrate the explicit General source delta with the current runtime. Remove obsolete native-session and input-allocation adapters in the owning replacement. Qualify General/client isolation and T3–T6/H1/H2. |
| MF09 | Core metadata/CAS/list and UI search, recents, palette, management, persistent uncertain mutations, receipt-only cross-tab refresh and Sonner | Connect terminal-run checks to the new run owner and canonical retention. Complete scheduled permanent deletion without the proposed duplicate finalization machinery. |
| MG05 | Core canonical profile reader and six-section context behavior | Deliver compact canonical context before ordinary model work through the SDK prompt append/tool gateway. Test rich/sparse/ambiguous subjects, corrections and walls; measure actual token/call/latency cost. No profile store in the browser. |
| MG02 | Canonical 14-skill/15-version assets, typed version/window drafts and account/client retirement | Derive advisory availability from the installed SDK manifest and actual exposed tools. Delete measured-installation/admission-proof presentation. Send explicit version/window choices and preserve them through SDK resume/fork; no implicit latest version or keyword launch. Full lifecycle matrix remains open. |
| PF02/MF19 | Client navigation plus typed Workspace draft/Planner task references, fresh canonical reads before showing titles, local scope retirement and keyboard source-return links; no capability request or automatic send | Connect these plain IDs to the SDK input owner; entity submission stays visibly unavailable meanwhile. Add A-owned source mounts and version/project/file/Mail coverage plus completion links. Mail detail currently lacks connectionId; do not infer it from an email address. |
| MP | ReUI picker, explicit synthetic fixture, shared libraries | Consume the SDK provider/model configuration after the spike. Provider keys stay server-side. Connect Settings default and per-conversation choice; test both providers, Stop and usage. The mock is not a runtime setting. |

The old Core General read-delegation v2 code is not a shipping prerequisite. Its unshipped reserved migration30000, fixture, U-specific auth/read-delegation, signed memory page/proof/helper and retained-source wrappers are deletion candidates once the real gateway scope and negative-test mapping are concrete. Preserve Core data authorization and the personal/firm SQL restriction before paging. Applied historical migrations stay immutable; no table-drop migration is proposed here.

## Preview and qualification

Main `ecaa747d6a18662425454704ab2402d2b639e4ce` is merged into this branch, preserving PR125/126 native reads, the reviewed shared UI foundation and SDK-first AGENTS. Their focused receiving suite passes120 tests. U may now update Meri preview receiver files for item0; none changed in the capability-removal checkpoint, and no deployment flags changed.

The preview gate and opt-in manifest now require installed contracts0.1.11 and reject stale0.1.10. [Exact package and current-main client-wire evidence](CLIENT-WIRE-COMPATIBILITY.md) records unchanged receiver bytes and13 genuine offline composed client cases. R confirms Step2 does not change the public submit/stream DTO. General input/session support remains an unresolved main delta. The previous frozen-file policy and signed delegation restoration plan are superseded.

The SDK spike, gateway/stream DTO, final independent review, full Linux build and service-backed acceptance remain root-coordinated dependencies. Source tests and synthetic browser checks do not establish live acceptance.
