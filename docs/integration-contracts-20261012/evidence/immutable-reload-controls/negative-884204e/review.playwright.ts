import {defineConfig} from '@playwright/test';
import original from "/workspace/capiro-control-884204e/apps/web/playwright.config";
export default defineConfig({...original,testDir:"/tmp/reload-negative-884204e-1",testMatch:'replay.spec.ts',outputDir:"/tmp/reload-negative-884204e-1/artifacts",reporter:[['list'],['json',{outputFile:"/tmp/reload-negative-884204e-1/results.json"}]],webServer:{...original.webServer,command:"\"/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node\" /workspace/capiro-control-884204e/apps/web/tests/browser/server.mjs"}});
