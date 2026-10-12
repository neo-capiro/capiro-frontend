# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control.spec.ts >> lost prospect draft creation retains its original request through reload rather than creating a duplicate draft
- Location: ../../../../tmp/r3-draft-35b6598-red/control.spec.ts:7:1

# Error details

```
Error: a replacement key cannot recover an uncertain original draft

expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 2
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "Skip to content" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - banner [ref=e5]:
      - link "Capiro Home" [ref=e6] [cursor=pointer]:
        - /url: /
        - img "Capiro" [ref=e7]
      - navigation "Product modes" [ref=e8]:
        - link "Meri" [ref=e9] [cursor=pointer]:
          - /url: /meri
          - img [ref=e11]
        - link "Portfolio" [ref=e12] [cursor=pointer]:
          - /url: /
          - img [ref=e14]
        - link "Modules" [ref=e15] [cursor=pointer]:
          - /url: /modules
          - img [ref=e17]
      - navigation "Workspace actions" [ref=e18]:
        - link "Quick log" [ref=e19] [cursor=pointer]:
          - /url: /?log=1
          - img [ref=e21]
        - link "Master calendar" [ref=e22] [cursor=pointer]:
          - /url: /calendar
          - img [ref=e24]
        - link "Search intelligence" [ref=e25] [cursor=pointer]:
          - /url: /modules/intelligence
          - img [ref=e27]
        - button "Updates — unavailable" [disabled] [ref=e28]:
          - img [ref=e30]
        - link "Account settings" [ref=e31] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e33]
    - generic [ref=e34]:
      - complementary [ref=e35]:
        - paragraph [ref=e36]: Modules
        - navigation "Modules" [ref=e37]:
          - link "Module hub" [ref=e38] [cursor=pointer]:
            - /url: /modules
            - img [ref=e40]
            - generic [ref=e41]: Module hub
          - link "Engagement" [ref=e42] [cursor=pointer]:
            - /url: /modules/engagement
            - img [ref=e44]
            - generic [ref=e45]: Engagement
          - link "Planner" [ref=e46] [cursor=pointer]:
            - /url: /modules/planner
            - img [ref=e48]
            - generic [ref=e49]: Planner
          - link "Calendar" [ref=e50] [cursor=pointer]:
            - /url: /modules/calendar
            - img [ref=e52]
            - generic [ref=e53]: Calendar
          - link "Workspace" [ref=e54] [cursor=pointer]:
            - /url: /modules/workspace
            - img [ref=e56]
            - generic [ref=e57]: Workspace
          - link "Strategies" [ref=e58] [cursor=pointer]:
            - /url: /modules/strategies
            - img [ref=e60]
            - generic [ref=e61]: Strategies
          - link "Directory" [ref=e62] [cursor=pointer]:
            - /url: /modules/directory
            - img [ref=e64]
            - generic [ref=e65]: Directory
          - link "Intelligence" [ref=e66] [cursor=pointer]:
            - /url: /modules/intelligence
            - img [ref=e68]
            - generic [ref=e69]: Intelligence
          - link "Research portfolios" [ref=e70] [cursor=pointer]:
            - /url: /modules/research-portfolios
            - img [ref=e72]
            - generic [ref=e73]: Research portfolios
        - link "Settings" [ref=e74] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e76]
          - generic [ref=e77]: Settings
      - main [ref=e78]:
        - navigation "Breadcrumb" [ref=e79]:
          - link "← Modules" [ref=e80] [cursor=pointer]:
            - /url: /modules
          - generic [ref=e81]: /
          - combobox "Switch module" [ref=e82] [cursor=pointer]:
            - generic: Workspace
            - img [ref=e83]
        - generic [ref=e85]:
          - generic [ref=e86]:
            - generic [ref=e87]:
              - button "← Workspace" [ref=e88] [cursor=pointer]
              - heading "Independent uncertain prospect draft" [level=1] [ref=e89]
              - paragraph [ref=e90]: Document · Firm
            - generic [ref=e91]:
              - button "History" [ref=e92] [cursor=pointer]
              - button "Save draft" [ref=e93] [cursor=pointer]
          - paragraph [ref=e94]: "Immutable prospect origin: 30000000-0000-4000-8000-000000000001. Manual edits only."
          - button "Read current document" [ref=e95] [cursor=pointer]
          - generic [ref=e96]:
            - button "Export saved PDF" [ref=e97] [cursor=pointer]
            - button "Export saved DOCX" [ref=e98] [cursor=pointer]
            - paragraph [ref=e99]: Exports contain saved content. Sharing, sending and generation remain unavailable.
          - generic [ref=e100]:
            - generic [ref=e101]: Document title
            - textbox "Document title" [ref=e102]: Independent uncertain prospect draft
          - generic [ref=e103]:
            - heading "Body" [level=2] [ref=e106]
            - textbox "Body content" [ref=e107]
  - paragraph [ref=e108]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {randomUUID} from 'node:crypto';
  3  | import {writeFileSync} from 'node:fs';
  4  | import {onlyLocalRequests,operationFixtures} from "/workspace/capiro-control-35b6598/apps/web/test/browser/fixtures";
  5  | import {moduleRouteFixtures} from "/workspace/capiro-control-35b6598/apps/web/test/browser/module-route-fixtures";
  6  | import {draft,prospectId} from "/workspace/capiro-control-35b6598/apps/web/tests/prospect-resources-fixtures";
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
  30 |  await expect(page.getByLabel('New prospect document title')).toHaveValue('');
  31 |  await expect(page.getByRole('button',{name:'Recover original draft',exact:true})).toHaveCount(0);
  32 |  await page.getByLabel('New prospect document title').fill('Independent uncertain prospect draft');
  33 |  await page.getByRole('button',{name:'Create manual draft',exact:true}).click();
  34 |  await expect(page.getByLabel('Document title')).toHaveValue('Independent uncertain prospect draft');
  35 |  writeFileSync("/tmp/r3-draft-35b6598-red/prospect-draft-duplicate.json",JSON.stringify({source:'35b6598c0456ebc9ef4cf48e20aef0e5167660b2',posts,drafts:[...records.values()]},null,2));
> 36 |  expect(records.size,'a replacement key cannot recover an uncertain original draft').toBe(1);
     |                                                                                      ^ Error: a replacement key cannot recover an uncertain original draft
  37 | });
  38 | 
```