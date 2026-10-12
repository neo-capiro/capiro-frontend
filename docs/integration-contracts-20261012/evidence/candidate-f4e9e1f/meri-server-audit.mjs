import { chromium, expect } from '/workspace/capiro-contracts/node_modules/@playwright/test/index.mjs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
const root = '/workspace/capiro-contracts';
const output = '/tmp/capiro-candidate-f4e9e1f';
const env = { ...process.env, PORT: '5199', HOSTNAME: '127.0.0.1', NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY','CLERK_SECRET_KEY','CORE_API_BASE_URL','STRATEGY_API_BASE_URL','WORKSPACE_API_BASE_URL','INTELLIGENCE_API_BASE_URL','MERI_API_BASE_URL']) env[key] = '';
const server = spawn(process.execPath, [`${root}/apps/web/.next/standalone/apps/web/server.js`], { cwd: root, env, stdio: ['ignore','pipe','pipe'] });
let log = '', browser; server.stdout.on('data', value => log += value);server.stderr.on('data', value => log += value);
const results = [], errors = [], network = [];
try {
 await new Promise((resolve, reject) => {const timer = setTimeout(() => reject(new Error('Readiness timeout')), 30000);server.stdout.on('data', () => {if(log.includes('Ready')){clearTimeout(timer);resolve();}});server.once('error', reject);});
 browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--disable-dev-shm-usage'] });
 for (const width of [1440,390]) {
  const page=await browser.newPage({ viewport:{width,height:1040} });page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort('blockedbyclient'));
  page.on('request',request=>{if(request.url().includes('/api/'))network.push(request.url());});
  await page.goto('http://127.0.0.1:5199/meri');
  await expect(page.getByRole('heading',{name:'Good morning, Jordan.',exact:true})).toBeVisible();
  await page.screenshot({path:`${output}/meri-home-${width}.png`,fullPage:true});
  await page.goto('http://127.0.0.1:5199/meri/fixture/cited-answer');
  await expect(page.getByRole('heading',{name:'Anduril meeting brief',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Show sample source 1, Funding update'}).click();
  await expect(page.getByRole('region',{name:'Sample source references'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeDisabled();
  await page.screenshot({path:`${output}/meri-cited-answer-${width}.png`,fullPage:true});
  await page.goto('http://127.0.0.1:5199/meri/fixture/run-activity');
  await expect(page.getByRole('heading',{name:'Sample research workspace'})).toBeVisible();
  for (const [value,label] of [['queued','Queued'],['starting','Starting'],['running','Running'],['waiting-for-approval','Waiting for approval'],['paused','Paused'],['completed','Completed'],['failed','Failed'],['cancelled','Cancelled']]) {
   await page.getByLabel('Sample scenario').selectOption(value);
   await expect(page.getByRole('status').filter({hasText:new RegExp(`^${label}$`)})).toBeVisible();
  }
  await expect(page.getByRole('button',{name:'Approve',exact:true})).toBeDisabled();
  await page.getByLabel('Sample scenario').focus();await expect(page.getByLabel('Sample scenario')).toBeFocused();
  results.push({width,citations:true,runStates:8,unavailableActionsDisabled:true,keyboard:true,fit:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)});
  await page.screenshot({path:`${output}/meri-run-activity-${width}.png`,fullPage:true});await page.close();
 }
 expect(errors).toEqual([]);expect(network).toEqual([]);expect(results.every(result=>result.fit)).toBe(true);
 await writeFile(`${output}/meri-actual-server.json`,JSON.stringify({source:'f4e9e1f3f1ce4cc1d19502b0b617cdf6b3ba624b',scope:'Actual Next server; disconnected synthetic Meri fixtures only; no identity or service interception.',browser:browser.version(),results,errors,serviceRequests:network},null,2)+'\n');
 console.log('Meri actual-server audit passed.');
} finally {
 await browser?.close();server.kill('SIGTERM');await once(server,'exit');await writeFile(`${output}/meri-actual-server.txt`,log);
}
