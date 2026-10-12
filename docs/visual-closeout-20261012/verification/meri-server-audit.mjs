// Future audit entry point. Historical audit sources and receipts remain immutable.
// Usage: node meri-server-audit.mjs CHECKOUT FRESH_OUTPUT BUILD_EXECUTION_RECEIPT
// Exit 0: audit passed; 1: provenance/server/browser failure; 2: invalid arguments.
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const usage = 'Usage: node meri-server-audit.mjs CHECKOUT FRESH_OUTPUT BUILD_EXECUTION_RECEIPT';
const git = (root,args) => execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();

export async function auditProvenance(root, receiptPath) {
 const built = JSON.parse(await readFile(receiptPath,'utf8'));
 if(built.state!=='finished'||built.exitCode!==0||built.head!==built.headAtFinish||built.statusAtStart!==''||built.statusAtFinish!=='') throw new Error('A successful clean-source build execution receipt is required.');
 const source=git(root,['rev-parse','HEAD']);
 const status=git(root,['status','--porcelain']);
 if(status) throw new Error('The audit requires a clean checkout.');
 const changed=git(root,['diff','--name-only',built.head,source]).split('\n').filter(Boolean);
 if(changed.some(path=>!path.startsWith('docs/'))) throw new Error('Build inputs changed after the recorded build. Rebuild and supply its new receipt.');
 const sourceTree=git(root,['rev-parse','HEAD:apps/web/src']);
 const builtSourceTree=git(root,['rev-parse',built.head+':apps/web/src']);
 if(sourceTree!==builtSourceTree) throw new Error('Application source differs from the recorded build.');
 const buildId=(await readFile(join(root,'apps/web/.next/BUILD_ID'),'utf8')).trim();
 if(!buildId||!existsSync(join(root,'apps/web/.next/standalone/apps/web/server.js'))) throw new Error('A completed standalone build is required.');
 return {source,sourceTree,sourceDerivedFromGit:true,builtSource:built.head,builtSourceTree,buildId,buildReceipt:resolve(receiptPath),documentationOnlyChangesSinceBuild:changed,statusAtStart:status};
}

async function runAudit(root,output,provenance) {
 const {chromium,expect}=await import(pathToFileURL(join(root,'node_modules/@playwright/test/index.mjs')).href);
const env = { ...process.env, PORT: '5199', HOSTNAME: '127.0.0.1', NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY','CLERK_SECRET_KEY','CORE_API_BASE_URL','STRATEGY_API_BASE_URL','WORKSPACE_API_BASE_URL','INTELLIGENCE_API_BASE_URL','MERI_API_BASE_URL']) env[key] = '';
const server = spawn(process.execPath, [`${root}/apps/web/.next/standalone/apps/web/server.js`], { cwd: root, env, stdio: ['ignore','pipe','pipe'] });
let log = '', browser; server.stdout.on('data', value => log += value);server.stderr.on('data', value => log += value);
const results = [], errors = [], network = [];
try {
 await new Promise((resolve, reject) => {const timer = setTimeout(() => reject(new Error('Readiness timeout')), 30000);server.stdout.on('data', () => {if(log.includes('Ready')){clearTimeout(timer);resolve();}});server.once('error', reject);});
 browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--disable-dev-shm-usage'] });
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
 await writeFile(`${output}/meri-actual-server.json`,JSON.stringify({...provenance,sourceAtFinish:git(root,['rev-parse','HEAD']),statusAtFinish:git(root,['status','--porcelain']),scope:'Actual Next server; disconnected synthetic Meri fixtures only; no identity or service interception.',browser:browser.version(),results,errors,serviceRequests:network},null,2)+'\n');
 console.log('Meri actual-server audit passed.');
} finally {
 await browser?.close();if(server.exitCode===null){server.kill('SIGTERM');await once(server,'exit');}await writeFile(`${output}/meri-actual-server.txt`,log);
}

}

export async function main(args) {
 if(args.length===1&&args[0]==='--help'){console.log(usage);return 0;}
 if(args.length!==3){console.error(usage);return 2;}
 const [root,output,receipt]=args.map(path=>resolve(path));
 const rel=relative(root,output);
 if(!rel||(!rel.startsWith('..')&&!isAbsolute(rel))||existsSync(output)){console.error('Choose a fresh output directory outside the checkout.');return 2;}
 const provenance=await auditProvenance(root,receipt);
 await mkdir(output,{recursive:true});
 await runAudit(root,output,provenance);
 return 0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{process.exitCode=await main(process.argv.slice(2));}
 catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
}
