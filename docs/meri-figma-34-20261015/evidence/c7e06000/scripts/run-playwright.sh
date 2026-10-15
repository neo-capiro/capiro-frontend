#!/bin/bash
# Evidence copy: as run, with the host worktree path replaced by <worktree> and the scratch path by <scratch>.
# Usage: run-playwright.sh EVIDENCE_DIR
set -u
E=$1
export PATH=/opt/nvm/versions/node/v24.21.0/bin:$PATH
cd <worktree>/apps/web || exit 2
SPECS="test/browser/acceptance-meri-icons.spec.ts test/browser/acceptance-meri-theme.spec.ts test/browser/acceptance-shared-incompletes.spec.ts test/browser/meri-action-host-mobile-navigation.spec.ts test/browser/meri-adopted-disclosures.spec.ts test/browser/meri-adopted-elements.spec.ts test/browser/meri-file-tree-keyboard.spec.ts test/browser/meri-files-navigation.spec.ts test/browser/meri-files-workflow.spec.ts test/browser/settings-scenes.spec.ts test/browser/shared-home-accessibility-interaction.spec.ts test/browser/shared-home-accessibility.spec.ts"
echo "$SPECS" | tr ' ' '\n' > "$E/playwright/spec-list.txt"
CMD="CAPIRO_QA_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome PLAYWRIGHT_JSON_OUTPUT_NAME=<bundle>/playwright/report.json npx playwright test --config test/browser/playwright.config.ts --reporter=json,list $SPECS"
{ echo "# cwd: apps/web at $(git rev-parse HEAD)"; echo "\$ $CMD"; echo "# start_utc $(date -u +%FT%TZ)"; echo "# runner pid $$"; } > "$E/playwright/list-output.txt"
rm -rf test-results/modules-browser
CAPIRO_QA_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome PLAYWRIGHT_JSON_OUTPUT_NAME="$E/playwright/report.json" \
  npx playwright test --config test/browser/playwright.config.ts --reporter=json,list $SPECS >> "$E/playwright/list-output.txt" 2>&1
rc=$?
echo "# end_utc $(date -u +%FT%TZ) exit=$rc" >> "$E/playwright/list-output.txt"
echo "playwright exit=$rc"
