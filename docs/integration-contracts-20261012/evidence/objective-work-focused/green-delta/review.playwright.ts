import {defineConfig} from '@playwright/test';
import original from "/workspace/capiro-contracts/apps/web/test/browser/playwright.config";
export default defineConfig({...original,testDir:"/tmp/objective-work-green-delta",testMatch:'control.spec.ts',grep:undefined,outputDir:"/tmp/objective-work-green-delta/artifacts",reporter:[['list'],['json',{outputFile:"/tmp/objective-work-green-delta/results.json"}]],webServer:{...original.webServer,command:"\"/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node\" \"/workspace/capiro-contracts/apps/web/test/browser/server.mjs\""}});
