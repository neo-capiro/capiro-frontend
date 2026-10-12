import {readFileSync,writeFileSync,mkdirSync,symlinkSync,existsSync} from 'node:fs';
import {resolve,dirname,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';

const [checkoutArg,outputArg]=process.argv.slice(2);
if(!checkoutArg||!outputArg)throw new Error('Usage: node run-reload-control.mjs CHECKOUT EXTERNAL_OUTPUT_DIRECTORY');
const checkout=resolve(checkoutArg),out=resolve(outputArg);
const relation=relative(checkout,out);
if(!relation||(!relation.startsWith('..')&&!isAbsolute(relation)))throw new Error('Output must be outside the source checkout.');
if(existsSync(out))throw new Error('Use a new output directory to preserve prior evidence.');
const here=dirname(fileURLToPath(import.meta.url));
const template=readFileSync(join(here,'reload-command.spec.ts'),'utf8');
const canonicalSHA='80dfa0fa7c53dc3079055c97777938466d3cbab6e4d66a3c2a38c5e616128815';
if(createHash('sha256').update(template).digest('hex')!==canonicalSHA)throw new Error('Canonical control bytes changed.');
const sourceRoot='/workspace/review-pr9/r2/source';
let executed=template;
const substitutions=[
 [`'${sourceRoot}/apps/web/tests/browser/activity-command-fixtures'`,JSON.stringify(join(checkout,'apps/web/tests/browser/activity-command-fixtures'))],
 [`'${sourceRoot}/apps/web/tests/activity-command-fixtures'`,JSON.stringify(join(checkout,'apps/web/tests/activity-command-fixtures'))],
 [`'${sourceRoot}/apps/web/tests/browser/fixtures'`,JSON.stringify(join(checkout,'apps/web/tests/browser/fixtures'))],
 ["'/workspace/review-pr9/r2/evidence/reload-duplicate.json'",JSON.stringify(join(out,'reload-duplicate.json'))],
];
for(const [original,replacement]of substitutions){
 if(executed.split(original).length!==2)throw new Error(`Expected exactly one path substitution: ${original}`);
 executed=executed.replace(original,replacement);
}
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'package.json'),'{"type":"module"}\n');
symlinkSync(join(checkout,'node_modules'),join(out,'node_modules'),'dir');
writeFileSync(join(out,'replay.spec.ts'),executed);
const source={
 head:execFileSync('git',['rev-parse','HEAD'],{cwd:checkout,encoding:'utf8'}).trim(),
 tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:checkout,encoding:'utf8'}).trim(),
 status:execFileSync('git',['status','--porcelain'],{cwd:checkout,encoding:'utf8'}),
 canonicalControlSHA256:canonicalSHA,
 executedControlSHA256:createHash('sha256').update(executed).digest('hex'),
 substitutions,
 baselineSourceLabel:'eabc8bf8b1d28ce3e3c65993624ea967614a45b2',
};
writeFileSync(join(out,'replay-source.json'),JSON.stringify(source,null,2)+'\n');
writeFileSync(join(out,'review.playwright.ts'),`import {defineConfig} from '@playwright/test';\nimport original from ${JSON.stringify(join(checkout,'apps/web/playwright.config'))};\nexport default defineConfig({...original,testDir:${JSON.stringify(out)},testMatch:'replay.spec.ts',outputDir:${JSON.stringify(join(out,'artifacts'))},reporter:[['list'],['json',{outputFile:${JSON.stringify(join(out,'results.json'))}}]],webServer:{...original.webServer,command:${JSON.stringify(`"${process.execPath}" ${join(checkout,'apps/web/tests/browser/server.mjs')}`)}}});\n`);
const result=spawnSync(process.execPath,[join(checkout,'node_modules/@playwright/test/cli.js'),'test','--config',join(out,'review.playwright.ts')],{cwd:join(checkout,'apps/web'),env:process.env,encoding:'utf8',maxBuffer:8*1024*1024});
const log=(result.stdout??'')+(result.stderr??'');
writeFileSync(join(out,'run.txt'),log);
writeFileSync(join(out,'exit.json'),JSON.stringify({exitCode:result.status,signal:result.signal,error:result.error?.message},null,2)+'\n');
process.stdout.write(log);
process.exitCode=result.status??1;
