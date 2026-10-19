import {defineConfig} from '/workspace/capiro-p1-successor/node_modules/@playwright/test';
import base from '/workspace/capiro-p1-successor/apps/web/playwright.config';
export default defineConfig({...base,testDir:'/workspace/capiro-p1-successor/apps/web/tests/browser',testMatch:['dialog-disabled-focus.spec.ts','shared-dialog-layout.spec.ts','profile-dialog-layout.spec.ts'],webServer:undefined,workers:1,outputDir:'/tmp/capiro-successor-qualification/focus-controls-artifacts',reporter:[['list'],['json',{outputFile:'/tmp/capiro-successor-qualification/focus-controls-results.json'}]]});
