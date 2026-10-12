import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { format, getFileInfo } from '/workspace/capiro-visual-closeout/node_modules/prettier/index.mjs';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 30*1024*1024 }).trimEnd();
const inputs = [
 ['Portfolio','c330cebbd021eb984b4bf64ae13dbb991ae6b1c0',['apps/web/src/features/portfolio','apps/web/tests','apps/web/public/design']],
 ['Meri','3cc30ff3182e8050d563516607866cf07efe2aef',['apps/web/src/features/meri','packages/meri-client','packages/qualification-transport','apps/web/test','apps/web/public/design/home','apps/web/public/design/cited-answer']],
 ['Modules/Settings','50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a',['apps/web/src/features/modules','apps/web/src/features/settings','apps/web/test','apps/web/public/design/modules','apps/web/public/figma/modules']]
];
const output = { head: git('rev-parse','HEAD'), sourceTree: git('rev-parse','HEAD^{tree}'), scope: 'Tracked feature, meaningful test, asset and governed client package preservation; exact source changes remain reviewable in Git.', inputs: [] };
for (const [name,head,paths] of inputs) {
 execFileSync('git',['merge-base','--is-ancestor',head,'HEAD']);
 const files = git('ls-tree','-r','--name-only',head,'--',...paths).split('\n').filter(Boolean);
 const changed = [], missing = []; let identical = 0, formattingOnly=0;
 for (const file of files) {
  let current; try { current=readFileSync(file); } catch { missing.push(file); continue; }
  const original=execFileSync('git',['show',`${head}:${file}`],{maxBuffer:30*1024*1024});
  if (original.equals(current)) { identical++; continue; }
  let normalized=false;
  try {const { inferredParser }=await getFileInfo(file);if(inferredParser) normalized=await format(original.toString(), { filepath:file })===await format(current.toString(), {filepath:file});} catch {}
  if(normalized)formattingOnly++;else changed.push(file);
 }
 output.inputs.push({name,head,ancestor:true,trackedFiles:files.length,byteIdentical:identical,formattingOnly,missing,changed});
}
writeFileSync('/tmp/capiro-candidate-4a16148/PRESERVATION.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
