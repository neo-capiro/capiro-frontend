import { defineConfig } from '@playwright/test';
import original from "/workspace/capiro-contracts/apps/web/playwright.config";
export default defineConfig({...original,testDir:"/tmp/capiro-candidate-2d50edd/immutable-reviewer-positive/browser",testMatch:'control.spec.ts',outputDir:"/tmp/capiro-candidate-2d50edd/immutable-reviewer-positive/artifacts",reporter:[['list'],['json',{outputFile:"/tmp/capiro-candidate-2d50edd/immutable-reviewer-positive/results.json"}]],webServer:{...original.webServer,command:"node /workspace/capiro-contracts/apps/web/tests/browser/server.mjs"}});
