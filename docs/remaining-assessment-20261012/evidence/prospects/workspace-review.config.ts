import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'.',testMatch:'workspace-review.spec.ts',workers:1,fullyParallel:false,
 outputDir:'/tmp/capiro-remaining-assessment-20261012/prospects/workspace-artifacts',
 reporter:[['list'],['json',{outputFile:'/tmp/capiro-remaining-assessment-20261012/prospects/workspace-results.json'}]],
 use:{baseURL:'http://127.0.0.1:5197',viewport:{width:1440,height:1040},trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{executablePath:'/usr/bin/chromium',args:['--disable-dev-shm-usage']}},
 webServer:undefined,
});
