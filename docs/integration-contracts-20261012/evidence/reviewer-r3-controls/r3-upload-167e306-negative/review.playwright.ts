import {defineConfig} from '@playwright/test';
import original from "/workspace/capiro-control-167e306/apps/web/playwright.config";
export default defineConfig({...original,testDir:"/tmp/r3-upload-167e306-negative",testMatch:'control.spec.ts',grep:undefined,outputDir:"/tmp/r3-upload-167e306-negative/artifacts",reporter:[['list'],['json',{outputFile:"/tmp/r3-upload-167e306-negative/results.json"}]],webServer:{...original.webServer,command:"\"/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node\" \"/workspace/capiro-control-167e306/apps/web/tests/browser/server.mjs\""}});
