import {defineConfig} from '@playwright/test';
import original from "/workspace/capiro-control-eabc/apps/web/playwright.config";
export default defineConfig({...original,testDir:"/tmp/reload-negative-eabc-1",testMatch:'replay.spec.ts',outputDir:"/tmp/reload-negative-eabc-1/artifacts",reporter:[['list'],['json',{outputFile:"/tmp/reload-negative-eabc-1/results.json"}]],webServer:{...original.webServer,command:"\"/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node\" /workspace/capiro-control-eabc/apps/web/tests/browser/server.mjs"}});
