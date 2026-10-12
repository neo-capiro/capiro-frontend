import ts from '/workspace/capiro-remaining-capabilities/node_modules/typescript/lib/typescript.js';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const cwd='/workspace/capiro-remaining',out='/tmp/capiro-remaining-capabilities-evidence/profile-test-review';
const printer=ts.createPrinter({removeComments:false});
const ast=s=>ts.createSourceFile('file.ts',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const source=(ref,path)=>execFileSync('git',['show',`${ref}:${path}`],{cwd,encoding:'utf8'});
const results=[];
function shape(node){
 const children=[]; ts.forEachChild(node,child=>{children.push(shape(child));});
 return [node.kind,ts.isVariableDeclarationList(node)?node.flags:undefined,node.kind!==ts.SyntaxKind.SourceFile&&'text' in node?node.text:undefined,children];
}

for(const name of ['profile-current-state','profile-write-lifetime']){
 const path=`apps/web/tests/browser/${name}.spec.ts`, before=ast(source('7aca86e',path)),after=ast(source('104495d4',path));
 const adaptations=[];
 const transform=context=>{
  const visit=node=>{
   if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='getByRole'&&node.arguments.length===2){
    const role=node.arguments[0],options=node.arguments[1],receiver=node.expression.expression;
    if(ts.isStringLiteral(role)&&ts.isObjectLiteralExpression(options)){
     const roleText=role.text;
     const dialogScoped=receiver.getText(before)==='dialog'||/getByRole\("dialog",/.test(receiver.getText(before));
     if(roleText==='dialog'||(roleText==='button'&&dialogScoped)){
      let changed=false;
      const props=options.properties.map(prop=>{
       if(ts.isPropertyAssignment(prop)&&prop.name.getText(before)==='name'&&ts.isStringLiteral(prop.initializer)&&prop.initializer.text==='Add facility'){
        const replacement=roleText==='dialog'?'Facilities: Synthetic profile client':'Save facility';
        adaptations.push({line:before.getLineAndCharacterOfPosition(node.getStart(before)).line+1,role:roleText,from:'Add facility',to:replacement});changed=true;
        return ts.factory.updatePropertyAssignment(prop,prop.name,ts.factory.createStringLiteral(replacement));
       }return prop;
      });
      if(changed){const updated=ts.factory.updateCallExpression(node,node.expression,node.typeArguments,[role,ts.factory.updateObjectLiteralExpression(options,props)]);return ts.visitEachChild(updated,visit,context);}
     }
    }
   }
   return ts.visitEachChild(node,visit,context);
  };return root=>ts.visitNode(root,visit);
 };
 const adapted=ts.transform(before,[transform]).transformed[0];
 const a=printer.printFile(adapted),b=printer.printFile(after);
 const tests=tree=>{const names=[];const walk=node=>{if(ts.isCallExpression(node)&&node.expression.getText(tree)==='test')names.push(printer.printNode(ts.EmitHint.Expression,node.arguments[0],tree));ts.forEachChild(node,walk);};walk(tree);return names;};
 results.push({path,entireFileASTEquivalentAfterOnlyApprovedLabelChanges:JSON.stringify(shape(ast(a)))===JSON.stringify(shape(ast(b))),printedFormattingIdentical:a===b,adaptations,baselineTestTitles:tests(before),finalTestTitles:tests(after),testTitlesIdentical:JSON.stringify(tests(before))===JSON.stringify(tests(after))});
 if(a!==b){writeFileSync(`${out}/${name}-adapted.ts`,a);writeFileSync(`${out}/${name}-actual.ts`,b);}
}
writeFileSync(`${out}/assertion-preservation.json`,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results.map(({baselineTestTitles,finalTestTitles,...r})=>({...r,testCount:baselineTestTitles.length})),null,2));
