# A1 Workspace client association (WS-04 / X-04)

**Policy status: proposed, awaiting Fable ratification through Neo.** Under the revised Wave 1 brief, the immutable client binding, explicit owner association of legacy/null drafts, and historical revision attribution choices remain review proposals. Tests do not constitute policy approval; WS-04 remains open pending ratification and the remaining acceptance gates. The backend `docs/a1-workspace/README.md` contains the complete Workspace policy decision table.

Newsletter create sends canonical nullable `clientId`; reopening uses the saved typed UUID. A missing selected client or attempted reassignment stops the save. Each save step discards completion if its local client scope changed or the view unmounted. Existing shared query/mutation authority guards are unchanged.

Portfolio Work and the merged-library contract use UUID association; client names remain presentation data. Duplicate names and renames do not change association. Name-only legacy rows stay held and prospect rows never become client work through a matching name or supplied client UUID. Backend migration/review is required before these paths are deployed; feature flags remain off.

## Verification

- **17/17 tests in three focused suites**: `work-associations.test.ts`, `newsletter-client-authority.test.ts`, `prospect-workspace.test.ts` under `apps/web/tests`.
- All **eight new tests** are mutation sensitive: restoring contracts and newsletter hook to base `24316f91` yields seven failures and one pass. Removing the prospect exclusion kills the remaining test. All mutations restored; `mutation-evidence.json` records each result.
- The pending-client-create test first failed against the updated UUID hook without response invalidation, then passed with the scope-generation check.
- Existing `domain-behavior.test.ts` was updated for the UUID contract but could not execute because the cached environment has no `next/link`. No broad dependency installation was attempted.

Normal installed-repo command: from `apps/web`, run `pnpm exec vitest run tests/work-associations.test.ts tests/newsletter-client-authority.test.ts tests/prospect-workspace.test.ts`. Local validation used cached Vitest 2.1.9, React Testing Library/jsdom and an explicit Zod v4 alias because the shared dependency cache defaults to Zod v3; the repository declares Vitest 4.1.11 and Zod 4.6.5. These cached-runtime tests do not replace verification with the lockfile-installed versions.

Not run: full frontend build/typecheck/lint, browser end-to-end, live API/staging checks, create/save/reopen/Outreach end-to-end. Real database migration and backend authority/staging negatives remain Fable's deployment gate. The hook tests mock the domain query/mutation transport and exercise the actual hook, including delayed completion and client switch; they do not prove provider behavior.
