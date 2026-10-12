import {defineConfig} from "/workspace/capiro-p1-files/node_modules/@playwright/test";
import base from "/workspace/capiro-p1-files/apps/web/playwright.config";
export default defineConfig({...base,testDir:"/workspace/capiro-p1-files/apps/web/tests/browser",outputDir:"/tmp/capiro-p1-files/browser-output",webServer:undefined,workers:1,reporter:[["list"],["json",{outputFile:process.env.FILES_REPORT||"/tmp/capiro-p1-files/browser-results.json"}]],use:{...base.use,baseURL:"http://127.0.0.1:5205",trace:"on"}});
