import { defineConfig } from '@playwright/test';
import original from "/workspace/capiro-contracts/apps/web/playwright.config";
export default defineConfig({...original,testDir:"/tmp/capiro-reviewer-positive-f4e9e1f/browser",testMatch:'control.spec.ts',outputDir:"/tmp/capiro-reviewer-positive-f4e9e1f/artifacts",reporter:[['list'],['json',{outputFile:"/tmp/capiro-reviewer-positive-f4e9e1f/results.json"}]],webServer:{...original.webServer,command:"node /workspace/capiro-contracts/apps/web/tests/browser/server.mjs"}});
