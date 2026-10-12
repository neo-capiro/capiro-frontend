import base from "/workspace/capiro-visual-closeout/apps/web/playwright.config.ts";
import {defineConfig} from "@playwright/test";
export default defineConfig({...base,testDir:"/tmp/capiro-visual-closeout/portfolio",outputDir:"/tmp/capiro-candidate-4a16148/defect-portfolio-artifacts",reporter:[["list"],["json",{outputFile:"/tmp/capiro-candidate-4a16148/defect-portfolio-results.json"}]],webServer:{...base.webServer,command:`"${process.execPath}" "/workspace/capiro-visual-closeout/apps/web/tests/browser/server.mjs"`}});
