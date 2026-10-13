import base from "/workspace/capiro-remaining-intake/apps/web/playwright.config.ts";
export default {...base, testDir:"/workspace/capiro-remaining-intake/apps/web/tests/browser", webServer:undefined, workers:1, retries:0, timeout:30000, outputDir:process.env.CI_REVIEW_OUTPUT, reporter:[["line"],["json", {outputFile: process.env.CI_REVIEW_REPORT}]]};
