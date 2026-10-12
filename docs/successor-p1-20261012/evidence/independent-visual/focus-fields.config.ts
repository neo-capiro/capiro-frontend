import { defineConfig } from '/workspace/capiro-p1-successor/node_modules/@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testDir:'/workspace/capiro-p1-successor/apps/web/tests/browser',testMatch:'dialog-disabled-focus.spec.ts',outputDir:'/tmp/capiro-successor-visual-review/focus-field-artifacts',reporter:[['list'],['json',{outputFile:'/tmp/capiro-successor-visual-review/focus-field-results.json'}]]});
