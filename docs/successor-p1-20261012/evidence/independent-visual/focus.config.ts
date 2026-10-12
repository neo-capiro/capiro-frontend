import { defineConfig } from '/workspace/capiro-p1-successor/node_modules/@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:'focus-regression.spec.ts',outputDir:'/tmp/capiro-successor-visual-review/focus-regression-artifacts',reporter:[['list'],['json',{outputFile:'/tmp/capiro-successor-visual-review/focus-regression-results.json'}]]});
