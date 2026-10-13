import base from "/workspace/capiro-visual-closeout/apps/web/test/browser/playwright.config.ts";
import {defineConfig} from "@playwright/test";
export default defineConfig({...base,testDir:"/tmp/capiro-visual-closeout/modules",outputDir:"/tmp/capiro-candidate-4a16148/defect-modules-artifacts",reporter:[["list"],["json",{outputFile:"/tmp/capiro-candidate-4a16148/defect-modules-results.json"}]],webServer:{...base.webServer,command:`"${process.execPath}" "/workspace/capiro-visual-closeout/apps/web/test/browser/server.mjs"`}});
