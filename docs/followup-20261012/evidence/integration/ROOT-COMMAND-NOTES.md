Root setup command notes (not application gate failures):
- The first targeted ESLint invocation from repository root could not find the app ESLint config. Repeating from apps/web passed.
- After the canonical Clerk mock formatting/lint checks passed, git add was accidentally given a root-relative path while cwd was apps/web and returned128. No files were staged by that failed invocation. The correct root invocation committed a69e092.
- Read-only discovery found no repository-local .agents directory; workspace .agents is an empty restricted mount. Repository AGENTS.md, implementation standards, architecture and inherited handovers remain the governing context.
All final combined checks have separate exact-source command/exit receipts. Setup notes do not substitute for those checks.

- Post-Modules JSON collection first used the presumed apps/web/test-results path, which was absent. Read the canonical config and copied the actual apps/web/test/browser/test-results/modules-browser-results.json;182 expected,0 skipped/unexpected/flaky. A config filename probe also found no apps/web/playwright.modules.config.ts; actual config is test/browser/playwright.config.ts. Neither attempt reran or altered a test.
