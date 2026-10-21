# Missed frontend source receipt — 21 October 2026

Branch: `codex/missed-frontend-source-20261021`. Base: `4f9a7e8dcaa9ba03494dc5a49559daf70cea5100`. A read-only refresh of `origin/main` on 21 October confirmed the same base. This is a supplemental source branch for the owner's final merge. No default/integration branch or PR was merged; no deployment, infrastructure change or feature activation was performed.

This branch includes the complete status-only branch `codex/missed-stalled-status-20261021@599b88a2e65ce8fb7b633ac5c20b82111d2f6067` ([draft PR114](https://github.com/neo-capiro/capiro-frontend/pull/114)). Use this superset when receiving the recovered source together. The status receipt is [recorded separately](CODEX-MISSED-STALLED-STATUS-20261021.md).

## Source census and final disposition

The audit covers **151 remote branches, 113 historical PR heads and eight preserved original local heads**, using ancestry, patch equivalence, per-file Git blobs for 40 distinct non-ancestor commits, and documented semantic supersession. It excludes deleted/unadvertised refs and unrelated local checkouts. An unchanged-tree ancestry marker is not proof of content receipt: PR113's marker and its newer source successors were reconciled explicitly.

The final 264-reference classification is **258 received/already consolidated, four superseded and two intentionally separate historical evidence archives**. Eight refs that required integration at the baseline are now accounted for by the receiving commits below. These are reference counts, not distinct features or commits; overlapping donors were received once.

The [final machine-readable ledger](missed-frontend-source-20261021/final-source-ledger.json) is the receiving overlay. The adjacent raw history audit and ledger retain the original baseline classifications for provenance. Their `integrate` entries are closed by this receipt. In particular, local PR111/112 heads duplicate the same received source as their published donors; their raw `intentional exclusion` classification did **not** exclude those changes from this branch.

| Source | Receiving commits | Disposition |
|---|---|---|
| Local stalled observation fix `0e4a9d748591774e838592ab9bccf89706392e59` | `180ca0be`, `5847d20c`, evidence `599b88a2` | Truthful unknown-run wording, neutral leaving-page hint and tested reconnect/terminal behavior. Original worktree and historical evidence remain untouched. |
| Memory donor `88bf4005621dd1a10fce6888269097cb0d9cc8c0`, shared predecessors of `481c25593bd77c2c96c219c1dd3e16ff21cee8d3` | `0a8cb441`, `4e72c36b`, `0b016607`, `afa1603b`, `b75249b8` | Five missing owner inbox, pagination/reconciliation, correction, proxy and held-preview commits. Settings-only commit `481c2559` was already equivalent to PR93 and is not duplicated. |
| Memory receiving review | `29423245f4b56059ef4666d608e469d8eb4a593c` | Freeze the captured correction draft while submission is pending; otherwise a successful receipt could clear edits made during the request. Add three browser cases and exact architecture design reviews. Correct API inventory to recognize the existing PR102 intents route and preserve its environment-only hold. |
| PR111 `e6180219b589ae8fced7155d1c451840c8663d94` | `c19b70e9`, `51e6c40f` | Exact held Core roster source pin and bounded readiness records. Newer PR113 exact roster routing is preserved. |
| PR112 `cfabbc30c88f5d0078e95ac8062116fc636c13a9` | `fd7d3cb9` | Historical image/build and held rollout records only. They do not qualify this branch's newer source, and no rollout was executed. |
| Browser donors `b6336be53c3515115122578ad22f659cc2fd6ab5` / `dc9a18d28ea934f5e655d13ea1e8686225bb4d73` | `bdad2870ee6e119025739184831fe34bb4a79bc2` | Receive only history-body/session-hint timing and Files exact session-header assertions. Preserve current Figma3.4 heading, already-received roster fixture, stronger task-command header checks and disabled Send styles. |
| Meri PR192 document-access freeze `8eab537a8c60bf086afb56b2ceb24b79f6260b6b`; independent frontend receipt `fbfc59ac61e2cd0f25b45d2e4f98b37ae7161d39` | `4d285a827df8c01f1ca3a5a9852d8533f3f84add` | Exact four immutable public generated files plus provenance and a deliberate client export. Conversation artifacts use that same public receiver for inspection and verified download across TXT, DOCX, XLSX, PPTX, PDF and ZIP. Existing document-write transport shares its HTTP owner; contracts base remains 0.1.10. |

The four superseded references are the intermediate Meri visual receipt, outdated host-status correction, unsupported historical live-wiring count claim and unused preparatory discovery reducer. Current Figma3.4 visual receipts, corrected historical status and canonical history owners remain authoritative. The two intentional exclusions are `integration/capiro-archive-diagnostics-20261012@753eb670` and `meri/f34-evidence-c7e06000@59be1a24`: large retained historical evidence, not missing executable source. See the complete reference table and `docs/integration/FRONTEND-INTEGRATION-LEDGER.md` section 8.

## Compatibility and holds

- PR102's `IntentApprovalsEnabled.Provider`, default `false` and environment-only intent admission remain intact. The Meri home change adds the memory link beside the existing Files and task-updates links.
- PR113's newer exact roster helper and receiving exceptions coexist with memory routing; no older helper or complete contract file overwrote them. The roster pin remains the donor's exact provenance-backed Core SHA `50475125275853299798fc40f8cb119f0b865464`, with deployment held.
- `previewMemoryCoreBackendSource` remains `null`. Memory feature enablement, preview receiving and reviewed source gates stay closed. Three added browser tests use an isolated synthetic harness opt-in, not runtime configuration.
- Root's read-only cross-repository review matched the received endpoints and response shapes against Core `309af848`: candidate pages/status/owner decisions, owner item pages, correction proposals and governed version approvals/rejections. Microsecond `updatedAt` CAS and the `pending_review` / `activeItemUnchanged: true` receipt are preserved. Core owns authorization, canonical writes and reconciliation.
- **Live memory activation remains blocked on Core exporting a versioned public wire DTO** as explicitly required by `owner-review.ts`, followed by the separate reviewed source/runtime gates. Matching source shapes is not a substitute for that release. The minimum resolution is a Core-owned public contract release and deliberate frontend adoption; this branch does not create another canonical DTO or claim live acceptance.
- Pending correction requests now freeze editing as well as item selection/refresh. Unknown outcomes retain a nonsecret account-scoped browser hold across reload; no automatic resubmission or fabricated active-memory update is introduced.
- [Eight memory function reviews](missed-frontend-source-20261021/memory-function-review.md) document cohesive UI, hook and fixed-operation proxy responsibilities. Fingerprinted entries are recorded in the existing architecture manifest; thresholds were not weakened. Architecture found zero errors and zero blocking findings (541 total signals, 523 reviewed and 18 inherited at the memory/browser checkpoint).

## Verification

Node 24.10.0 and npm 11.9.0 were used. Dependencies were isolated from the preserved same-lock installation; the status receipt records exact provenance and the existing offline peer-resolution limitation. No package lock changed. The evidence directory contains retained output.

| Check | Result |
|---|---|
| Focused memory Vitest: owner holds/proxy/routes, inbox pagination, preview policy and activation | **71/71 passed** in six files |
| Roster/first-chat/containment/Settings/Modules regression Vitest | **190/190 passed** in ten files |
| Node tests: preview config, architecture-preview and API admission inventory | **20/20 passed** |
| Full web TypeScript, `tsc --noEmit --incremental false` | **Passed** |
| Scoped ESLint / Prettier | **Passed**, zero errors; one existing unused `run` import warning in the conversation browser fixture |
| Chrome memory browser cases | **3/3 passed**: disabled sends no request; pending draft/CAS remains captured and active memory unchanged; uncertain correction held across reload |
| Recovered Chrome conversation/Files cases | **4/4 passed**: admitted transcript/current cursor; unknown and in-flight writes fenced across navigation; synthetic DOCX creation/revision/inspection/verified download |
| Status-only source verification retained at `599b88a2` | **28/28 Vitest, 3/3 Chrome**, full types, package/architecture checks and **283/283-page production build** passed |

Browser tests used `CAPIRO_QA_CHROMIUM_EXECUTABLE` with installed Chrome. Windows left the test-only Vite server alive after all cases completed; stopping each exact owned server PID allowed Playwright teardown to exit normally. Initial memory browser verification exposed an overly strict label locator; it was replaced with the textbox's accessible role/name and all three cases passed. No application check was weakened.

These checks use synthetic data and establish local source behavior. They do not establish live Clerk/Core/Meri acceptance, full Figma visual parity, native Office/PDF rendering or deployment readiness.

## Final combined verification

Qualified product-source head: `4d285a827df8c01f1ca3a5a9852d8533f3f84add`; subsequent receipt commits contain evidence only.

- Root `npm run build` with Node 24.10.0 / npm 11.9.0: **passed**, including Meri client compilation, Next TypeScript and **286/286** generated pages.
- Combined public-package provenance and full architecture: **passed**, zero errors and zero blocking findings (541 total / 523 reviewed / 18 inherited).
- Combined document-access/transport/link Vitest: **81/81 passed**. Document public-input and boundary Node tests: **6/6 passed**. These are additional to the 71 memory, 190 regression and 20 config cases above.
- Combined Chrome: **12/12 passed**, covering six conversation artifact formats, two refusal paths, the existing DOCX Files workflow and all three memory review cases. The final browser JSON and readable output are retained. The PPTX/PDF/ZIP screenshots were inspected for structural details and explicit pending/unverified rendering statements, not accepted as native document rendering or full Figma parity.
- Standalone full web TypeScript run sequentially after generation: **passed, exit 0**. An initial concurrent TypeScript process saw the old generated route map while Next was regenerating the new memory routes; its output is retained as `frontend-combined-typecheck-during-generation.log`. The production build's own TypeScript phase also passed after generation. No source or compiler settings were relaxed.

The independent document-access worktree also reported 81 focused + 178 additional document/Files cases, 11 script cases, full types, lint/format, package/architecture gates and eight browser cases before receipt. Those are independent source-review results, not additional final-branch counts. Final combined logs above are the evidence for this receiver.
