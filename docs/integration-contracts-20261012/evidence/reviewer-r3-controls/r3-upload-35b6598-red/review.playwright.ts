import {defineConfig} from '@playwright/test';
import original from "/workspace/capiro-control-35b6598/apps/web/playwright.config";
export default defineConfig({...original,testDir:"/tmp/r3-upload-35b6598-red",testMatch:'control.spec.ts',grep:undefined,outputDir:"/tmp/r3-upload-35b6598-red/artifacts",reporter:[['list'],['json',{outputFile:"/tmp/r3-upload-35b6598-red/results.json"}]],webServer:{...original.webServer,command:"\"/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node\" \"/workspace/capiro-control-35b6598/apps/web/tests/browser/server.mjs\""}});
