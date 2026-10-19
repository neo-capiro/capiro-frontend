import { defineConfig } from "/workspace/capiro-p1-billing/node_modules/@playwright/test";
export default defineConfig({
 testDir:"/workspace/capiro-p1-billing/apps/web/test/browser",testMatch:"billing-flow.spec.ts",workers:1,fullyParallel:false,
 outputDir:"/tmp/capiro-p1-billing/results",reporter:[["list"],["json",{outputFile:"/tmp/capiro-p1-billing/results.json"}]],
 use:{baseURL:"http://127.0.0.1:5199",viewport:{width:1440,height:1040},screenshot:"only-on-failure",trace:"retain-on-failure",launchOptions:{executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]}}
});
