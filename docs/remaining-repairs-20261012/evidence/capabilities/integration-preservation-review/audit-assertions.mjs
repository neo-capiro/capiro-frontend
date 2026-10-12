import ts from '/workspace/capiro-remaining-capabilities/node_modules/typescript/lib/typescript.js';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const cwd='/workspace/capiro-remaining';
const out='/tmp/capiro-remaining-capabilities-evidence/integration-preservation-review';
const printer=ts.createPrinter({removeComments:false});
function source(ref,path){return execFileSync('git',['show',`${ref}:${path}`],{cwd,encoding:'utf8'});}
function ast(text){return ts.createSourceFile('file.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);}
function isMessageValue(node){
 return ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='toHaveValue'&&ts.isCallExpression(node.expression.expression)&&node.expression.expression.expression.getText()==='expect'&&node.expression.expression.arguments[0]?.getText().replaceAll(/\s/g,'')==='page.getByLabel("Message",{exact:true})';
}
const results=[];
for(const name of ['email-compose','mail-local-draft','mail-rewrite']){
 const path=`apps/web/tests/browser/${name}.spec.ts`;const before=ast(source('7aca86e',path));const after=ast(source('685e550',path));const oldExpected=[],newExpected=[];
 function visitExpected(node,old){
  if(old&&isMessageValue(node))oldExpected.push(printer.printNode(ts.EmitHint.Expression,node.arguments[0],before));
  if(!old&&ts.isCallExpression(node)&&node.expression.getText()==='expectMailMessage')newExpected.push(printer.printNode(ts.EmitHint.Expression,node.arguments[1],after));
  ts.forEachChild(node,child=>visitExpected(child,old));
 }
 visitExpected(before,true);visitExpected(after,false);
 const transform=context=>{
  const visit=node=>{
   if(isMessageValue(node))return ts.factory.createCallExpression(ts.factory.createIdentifier('expectMailMessage'),undefined,[ts.factory.createIdentifier('page'),node.arguments[0]]);
   return ts.visitEachChild(node,visit,context);
  };return root=>ts.visitNode(root,visit);
 };
 const adapted=ts.transform(before,[transform]).transformed[0];
 const afterWithoutAdapter=ts.factory.updateSourceFile(after,after.statements.filter(statement=>!(ts.isImportDeclaration(statement)&&statement.moduleSpecifier.text==='./mail-message-assertions')));
 const semanticBefore=printer.printFile(adapted);const semanticAfter=printer.printFile(afterWithoutAdapter);
 results.push({path,baselineValueAssertions:oldExpected.length,adaptedValueAssertions:newExpected.length,expectedExpressionsIdentical:JSON.stringify(oldExpected)===JSON.stringify(newExpected),entireTestASTEquivalentAfterOnlyRepresentationAdapter:semanticBefore===semanticAfter,expectedExpressions:oldExpected});
 if(semanticBefore!==semanticAfter){writeFileSync(`${out}/${name}-before-normalized.ts`,semanticBefore);writeFileSync(`${out}/${name}-after-normalized.ts`,semanticAfter);}
}
const path='apps/web/tests/browser/client-header.spec.ts';const before=source('7aca86e',path);const after=source('ced1d1b',path);
const adapted=before.replace('getByRole("menu")','getByRole("listbox", { name: "Client views" })').replace('getByRole("menuitem", { name: "Objectives", exact: true })','getByRole("option", { name: "Objectives", exact: true })');
results.push({path,entireTestASTEquivalentAfterOnlyRoleAdaptation:printer.printFile(ast(adapted))===printer.printFile(ast(after)),adaptations:['menu -> named Client views listbox','Objectives menuitem -> Objectives option']});
writeFileSync(`${out}/assertion-preservation.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.map(({expectedExpressions,...rest})=>rest),null,2));
