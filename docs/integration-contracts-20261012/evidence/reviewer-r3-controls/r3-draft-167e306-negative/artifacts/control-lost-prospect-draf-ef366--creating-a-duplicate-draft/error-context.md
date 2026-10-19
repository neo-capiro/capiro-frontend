# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control.spec.ts >> lost prospect draft creation retains its original request through reload rather than creating a duplicate draft
- Location: ../../../../tmp/r3-draft-167e306-negative/control.spec.ts:7:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('New prospect document title')
Expected: ""
Received: "Independent uncertain prospect draft"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" with timeout 5000ms
  - waiting for getByLabel('New prospect document title')
    12 × locator resolved to <input disabled maxlength="500" data-slot="input" id="prospect-draft-title" value="Independent uncertain prospect draft" class="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-event…/>
       - unexpected value "Independent uncertain prospect draft"

```

```yaml
- textbox "New prospect document title" [disabled]: Independent uncertain prospect draft
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {randomUUID} from 'node:crypto';
  3  | import {writeFileSync} from 'node:fs';
  4  | import {onlyLocalRequests,operationFixtures} from "/workspace/capiro-control-167e306/apps/web/test/browser/fixtures";
  5  | import {moduleRouteFixtures} from "/workspace/capiro-control-167e306/apps/web/test/browser/module-route-fixtures";
  6  | import {draft,prospectId} from "/workspace/capiro-control-167e306/apps/web/tests/prospect-resources-fixtures";
  7  | test('lost prospect draft creation retains its original request through reload rather than creating a duplicate draft',async({page})=>{
  8  |  await onlyLocalRequests(page);
  9  |  const records=new Map<string,typeof draft>(),posts:unknown[]=[];
  10 |  await operationFixtures(page,{...moduleRouteFixtures,
  11 |   'workspace.prospect.drafts':()=>({drafts:[...records.values()].map(record=>({...record,versions:[]}))}),
  12 |   'workspace.draft':(input:any)=>[...records.values()].find(record=>record.id===input.params.id),
  13 |   'workspace.draft.versions':[],
  14 |  });
  15 |  await page.route('**/api/capiro/workspace.prospect.create',async route=>{
  16 |   const {body}=route.request().postDataJSON();posts.push(body);
  17 |   if(!records.has(body.requestId)){
  18 |    const id=randomUUID();
  19 |    records.set(body.requestId,{...structuredClone(draft),id,docTitle:body.docTitle,documents:[{...draft.documents[0]!,id:randomUUID(),draftId:id}]});
  20 |   }
  21 |   if(records.size===1)return route.fulfill({status:503,json:{message:'Synthetic response lost AFTER draft commit'}});
  22 |   return route.fulfill({json:records.get(body.requestId)});
  23 |  });
  24 |  await page.goto(`/modules/workspace?prospectId=${prospectId}`);
  25 |  await page.getByLabel('New prospect document title').fill('Independent uncertain prospect draft');
  26 |  await page.getByRole('button',{name:'Create manual draft',exact:true}).click();
  27 |  await expect(page.getByRole('button',{name:'Recover original draft',exact:true})).toBeEnabled();
  28 |  expect(records.size).toBe(1);
  29 |  await page.reload();
> 30 |  await expect(page.getByLabel('New prospect document title')).toHaveValue('');
     |                                                               ^ Error: expect(locator).toHaveValue(expected) failed
  31 |  await expect(page.getByRole('button',{name:'Recover original draft',exact:true})).toHaveCount(0);
  32 |  await page.getByLabel('New prospect document title').fill('Independent uncertain prospect draft');
  33 |  await page.getByRole('button',{name:'Create manual draft',exact:true}).click();
  34 |  await expect(page.getByLabel('Document title')).toHaveValue('Independent uncertain prospect draft');
  35 |  writeFileSync("/tmp/r3-draft-167e306-negative/prospect-draft-duplicate.json",JSON.stringify({source:'35b6598c0456ebc9ef4cf48e20aef0e5167660b2',posts,drafts:[...records.values()]},null,2));
  36 |  expect(records.size,'a replacement key cannot recover an uncertain original draft').toBe(1);
  37 | });
  38 | 
```