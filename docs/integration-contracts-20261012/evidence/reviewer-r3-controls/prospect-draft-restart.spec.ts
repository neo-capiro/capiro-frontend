import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {onlyLocalRequests,operationFixtures} from '/workspace/review-pr9/r3/source/apps/web/test/browser/fixtures';
import {moduleRouteFixtures} from '/workspace/review-pr9/r3/source/apps/web/test/browser/module-route-fixtures';
import {draft,prospectId} from '/workspace/review-pr9/r3/source/apps/web/tests/prospect-resources-fixtures';
test('lost prospect draft creation retains its original request through reload rather than creating a duplicate draft',async({page})=>{
 await onlyLocalRequests(page);
 const records=new Map<string,typeof draft>(),posts:unknown[]=[];
 await operationFixtures(page,{...moduleRouteFixtures,
  'workspace.prospect.drafts':()=>({drafts:[...records.values()].map(record=>({...record,versions:[]}))}),
  'workspace.draft':(input:any)=>[...records.values()].find(record=>record.id===input.params.id),
  'workspace.draft.versions':[],
 });
 await page.route('**/api/capiro/workspace.prospect.create',async route=>{
  const {body}=route.request().postDataJSON();posts.push(body);
  if(!records.has(body.requestId)){
   const id=randomUUID();
   records.set(body.requestId,{...structuredClone(draft),id,docTitle:body.docTitle,documents:[{...draft.documents[0]!,id:randomUUID(),draftId:id}]});
  }
  if(records.size===1)return route.fulfill({status:503,json:{message:'Synthetic response lost AFTER draft commit'}});
  return route.fulfill({json:records.get(body.requestId)});
 });
 await page.goto(`/modules/workspace?prospectId=${prospectId}`);
 await page.getByLabel('New prospect document title').fill('Independent uncertain prospect draft');
 await page.getByRole('button',{name:'Create manual draft',exact:true}).click();
 await expect(page.getByRole('button',{name:'Recover original draft',exact:true})).toBeEnabled();
 expect(records.size).toBe(1);
 await page.reload();
 await expect(page.getByLabel('New prospect document title')).toHaveValue('');
 await expect(page.getByRole('button',{name:'Recover original draft',exact:true})).toHaveCount(0);
 await page.getByLabel('New prospect document title').fill('Independent uncertain prospect draft');
 await page.getByRole('button',{name:'Create manual draft',exact:true}).click();
 await expect(page.getByLabel('Document title')).toHaveValue('Independent uncertain prospect draft');
 writeFileSync('/workspace/review-pr9/r3/evidence/prospect-draft-duplicate.json',JSON.stringify({source:'35b6598c0456ebc9ef4cf48e20aef0e5167660b2',posts,drafts:[...records.values()]},null,2));
 expect(records.size,'a replacement key cannot recover an uncertain original draft').toBe(1);
});
