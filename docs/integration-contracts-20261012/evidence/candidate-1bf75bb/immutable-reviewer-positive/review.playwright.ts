import { defineConfig } from "@playwright/test";
import original from "/workspace/capiro-contracts/apps/web/playwright.config";
export default defineConfig({...original,testDir:"/tmp/capiro-reviewer-positive-1bf75bb/browser",testMatch:"control.spec.ts",outputDir:"/tmp/capiro-reviewer-positive-1bf75bb/artifacts",reporter:[["list"],["json",{outputFile:"/tmp/capiro-reviewer-positive-1bf75bb/results.json"}]],webServer:{...original.webServer,command:"node /workspace/capiro-contracts/apps/web/tests/browser/server.mjs"}});
