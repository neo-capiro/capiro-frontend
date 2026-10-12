import {defineConfig} from '@playwright/test';
import original from "/workspace/capiro-control-d79a16c/apps/web/playwright.config";
export default defineConfig({...original,testDir:"/tmp/r3-reopen-d79a16c-green",testMatch:'control.spec.ts',grep:undefined,outputDir:"/tmp/r3-reopen-d79a16c-green/artifacts",reporter:[['list'],['json',{outputFile:"/tmp/r3-reopen-d79a16c-green/results.json"}]],webServer:{...original.webServer,command:"\"/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node\" \"/workspace/capiro-control-d79a16c/apps/web/tests/browser/server.mjs\""}});
