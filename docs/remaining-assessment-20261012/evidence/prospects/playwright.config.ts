import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'review.spec.ts', workers: 1, fullyParallel: false,
  outputDir: '/tmp/capiro-remaining-assessment-20261012/prospects/browser-artifacts',
  reporter: [['list'], ['json', { outputFile: '/tmp/capiro-remaining-assessment-20261012/prospects/browser-results.json' }]],
  use: { launchOptions:{executablePath:'/usr/bin/chromium',args:['--disable-dev-shm-usage']}, baseURL: 'http://127.0.0.1:5191', viewport: {width:1440,height:1040}, screenshot:'only-on-failure', trace:'retain-on-failure' },
  webServer: undefined,
});
