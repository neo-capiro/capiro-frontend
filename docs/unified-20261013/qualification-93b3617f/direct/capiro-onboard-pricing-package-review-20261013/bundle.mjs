import fs from 'node:fs';
import crypto from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {build} from '/workspace/capiro-newsletter-port/node_modules/vite/dist/node/index.js';
const root='/tmp/capiro-onboard-pricing-package-review-20261013';
const startedUTC=new Date().toISOString();
const result=await build({configFile:false,root,envDir:root,logLevel:'warn',build:{write:false,minify:true,sourcemap:false,lib:{entry:`${root}/entry.js`,formats:['es'],fileName:'pricing'},rolldownOptions:{output:{codeSplitting:false}}}});
const outputs=(Array.isArray(result)?result:[result]).flatMap(r=>r.output);
const rows=[];
for(const output of outputs){
 if(output.type!=='chunk')continue;
 fs.writeFileSync(`${root}/${output.fileName}`,output.code);
 rows.push({file:output.fileName,bytes:Buffer.byteLength(output.code),gzipBytes:gzipSync(output.code).length,sha256:crypto.createHash('sha256').update(output.code).digest('hex'),imports:output.imports,dynamicImports:output.dynamicImports,moduleIds:output.moduleIds,exports:output.exports});
}
const receipt={startedUTC,endedUTC:new Date().toISOString(),mode:'static Vite8.3.4 minified ES library bundle only; no application/server/browser or output evaluation',rows};
fs.writeFileSync(`${root}/bundle-receipt.json`,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
