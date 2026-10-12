import {defineConfig} from '@playwright/test';
import original from "/workspace/capiro-contracts/apps/web/playwright.config";
export default defineConfig({...original,testDir:"/tmp/capiro-reopen-f4e9e1f",testMatch:'control.spec.ts',grep:undefined,outputDir:"/tmp/capiro-reopen-f4e9e1f/artifacts",reporter:[['list'],['json',{outputFile:"/tmp/capiro-reopen-f4e9e1f/results.json"}]],webServer:{...original.webServer,command:"\"/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node\" \"/workspace/capiro-contracts/apps/web/tests/browser/server.mjs\""}});
