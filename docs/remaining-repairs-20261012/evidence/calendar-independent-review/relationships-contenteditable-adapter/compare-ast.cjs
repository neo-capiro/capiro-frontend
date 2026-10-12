const ts = require('/workspace/capiro-followup/node_modules/typescript/lib/typescript.js');
const fs = require('node:fs');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const base = '/workspace/capiro-remaining-mail';
const out = '/tmp/capiro-remaining-calendar-independent-review/relationships-contenteditable-adapter';
const path = 'apps/web/tests/browser/relationships.spec.ts';
const frozen = 'adbc84b2251fe6b06cb7f75030026fba5b4ff498';
const before = cp.execFileSync('git', ['show', `${frozen}:${path}`], {cwd:base,encoding:'utf8'});
const after = fs.readFileSync(`${base}/${path}`, 'utf8');
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
function analyze(text, method) {
  const source = ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const calls=[], strings=[], functions=[], matches=[];
  function visit(node) {
    if (ts.isCallExpression(node)) {
      calls.push(node.getText(source));
      if (ts.isPropertyAccessExpression(node.expression)
          && node.expression.name.text === method
          && node.expression.expression.getText(source) === 'expect(mail.getByLabel("Message", { exact: true }))'
          && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])
          && node.arguments[0].text === 'Synthetic message') matches.push(node.expression.name);
    }
    if (ts.isStringLiteral(node)) strings.push(node.text);
    if (ts.isFunctionLike(node) && node.body) {
      const lines=node.body.getText(source).split('\n').filter(x=>x.trim()).length;
      let title=node.name?.getText(source) || '<callback>';
      if (ts.isCallExpression(node.parent) && node.parent.expression.getText(source)==='test') title=node.parent.arguments[0].text;
      functions.push({title,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,nonblankBodyLines:lines,nonblankFunctionLines:node.getText(source).split("\n").filter(x=>x.trim()).length,sourceSha256:sha(node.getText(source))});
    }
    ts.forEachChild(node,visit);
  }
  visit(source);
  if(matches.length!==1) throw new Error(`Expected one exact matcher: ${matches.length}`);
  function ast(node) {
    const children=[];ts.forEachChild(node,n=>children.push(ast(n)) && undefined);
    return [node.kind, children.length ? children : node===matches[0] ? '<EXACT_MESSAGE_MATCHER>' : node.getText(source)];
  }
  return {sha256:sha(text),physicalLines:text.trimEnd().split('\n').length,nonblankLines:text.split('\n').filter(x=>x.trim()).length,callCount:calls.length,stringLiterals:strings,functions: functions.filter(x=>x.nonblankBodyLines>80),normalizedAstSha256:sha(JSON.stringify(ast(source))),matcher:{method,line:source.getLineAndCharacterOfPosition(matches[0].getStart(source)).line+1,locator:'mail.getByLabel("Message", { exact: true })',expected:'Synthetic message'}};
}
const a=analyze(before,'toHaveValue'),b=analyze(after,'toHaveText');
const result={frozenSource:frozen,path,before:a,after:b,normalizedAstIdentical:a.normalizedAstSha256===b.normalizedAstSha256,allStringLiteralsIdentical:JSON.stringify(a.stringLiterals)===JSON.stringify(b.stringLiterals),allCallCountsIdentical:a.callCount===b.callCount};
if(!result.normalizedAstIdentical || !result.allStringLiteralsIdentical || !result.allCallCountsIdentical) throw new Error('Non-matcher change found');
fs.writeFileSync(`${out}/ast-preservation.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,before:{...a,stringLiterals:`${a.stringLiterals.length} unchanged literals`},after:{...b,stringLiterals:`${b.stringLiterals.length} unchanged literals`}},null,2));
