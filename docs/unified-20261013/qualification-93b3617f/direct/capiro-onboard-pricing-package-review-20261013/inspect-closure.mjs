import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from '/workspace/capiro-newsletter-port/node_modules/typescript/lib/typescript.js';
const root='/workspace/capiro-newsletter-port/node_modules/@capiro/shared';
const output='/tmp/capiro-onboard-pricing-package-review-20261013';
const queue=['dist/index.js'],seen=new Set(),records=[],externals=[],dynamic=[];
for(let i=0;i<queue.length;i++){
 const file=queue[i];if(seen.has(file))continue;seen.add(file);
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 const imports=[],topLevelCalls=[],interesting=[];
 function visit(node,inFunction=false){
  if(ts.isCallExpression(node)){
   const callee=node.expression.getText(ast),line=ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1;
   if(!inFunction)topLevelCalls.push({line,callee});
   if(callee==='require'||node.expression.kind===ts.SyntaxKind.ImportKeyword){
    const arg=node.arguments[0];const specifier=arg&&ts.isStringLiteral(arg)?arg.text:null;
    imports.push({line,specifier});
    if(!specifier)dynamic.push({file,line});
    else if(!specifier.startsWith('.'))externals.push({file,line,specifier});
    else {let next=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier));if(!path.extname(next))next+='.js';queue.push(next);}
   }
   if(/(?:^|\.)(fetch|eval|Function|setTimeout|setInterval|WebSocket|XMLHttpRequest|open|spawn|exec|require)$/.test(callee))interesting.push({line,callee,inFunction});
  }
  if(ts.isNewExpression(node)){
   const callee='new '+node.expression.getText(ast),line=ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1;
   if(!inFunction)topLevelCalls.push({line,callee});
  }
  ts.forEachChild(node,child=>visit(child,inFunction||ts.isFunctionLike(node)));
 }
 visit(ast);
 records.push({file,bytes:Buffer.byteLength(source),sha256:crypto.createHash('sha256').update(source).digest('hex'),nonblank:source.split(/\r?\n/).filter(l=>l.trim()).length,imports,topLevelCalls,interesting,parseDiagnostics:ast.parseDiagnostics.length});
}
const result={root,entry:'dist/index.js',moduleCount:records.length,totalJSBytes:records.reduce((s,r)=>s+r.bytes,0),externals,dynamic,records};
fs.writeFileSync(`${output}/closure.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({moduleCount:result.moduleCount,totalJSBytes:result.totalJSBytes,externals,dynamic,files:records.map(({file,bytes})=>({file,bytes})),topLevelCallees:[...new Set(records.flatMap(r=>r.topLevelCalls.map(c=>c.callee)))],interesting:records.flatMap(r=>r.interesting.filter(x=>x.callee!=='require').map(x=>({file:r.file,...x})))},null,2));
