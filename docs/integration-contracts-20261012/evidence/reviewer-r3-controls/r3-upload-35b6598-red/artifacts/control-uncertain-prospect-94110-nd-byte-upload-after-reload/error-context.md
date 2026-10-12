# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control.spec.ts >> uncertain prospect confirmation cannot become a fresh key and second byte upload after reload
- Location: ../../../../tmp/r3-upload-35b6598-red/control.spec.ts:6:1

# Error details

```
Error: the uncertain original attachment requires original confirmation, not a replacement key

expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 2
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to content" [ref=e3] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=e4]:
    - link "Capiro Home" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "Capiro" [ref=e6]
    - navigation "Workspace" [ref=e7]:
      - link "Meri" [ref=e8] [cursor=pointer]:
        - /url: /meri
      - link "Portfolio" [ref=e9] [cursor=pointer]:
        - /url: /
      - link "Modules" [ref=e10] [cursor=pointer]:
        - /url: /modules
    - navigation "Global actions" [ref=e11]:
      - link "Quick log" [ref=e12] [cursor=pointer]:
        - /url: /portfolio?log=1
      - link "Master calendar" [ref=e13] [cursor=pointer]:
        - /url: /calendar
      - link "Search Portfolio" [ref=e14] [cursor=pointer]:
        - /url: /portfolio?search=1
      - button "Updates unavailable" [disabled] [ref=e15]
      - button "Test account" [ref=e17] [cursor=pointer]: T
  - generic [ref=e18]:
    - complementary "Portfolio navigation" [ref=e19]:
      - paragraph [ref=e20]: Portfolio
      - navigation "Portfolio" [ref=e21]:
        - link "Portfolio Overview" [ref=e22] [cursor=pointer]:
          - /url: /portfolio
          - generic [ref=e23]: Overview
        - link "Portfolio Clients" [ref=e24] [cursor=pointer]:
          - /url: /portfolio?type=CLIENT
          - generic [ref=e25]: Clients
        - link "Portfolio Prospects" [ref=e26] [cursor=pointer]:
          - /url: /portfolio/prospects
          - generic [ref=e27]: Prospects
      - link "Settings" [ref=e29] [cursor=pointer]:
        - /url: /settings
    - main [ref=e30]:
      - generic [ref=e31]:
        - navigation "Breadcrumb" [ref=e32]:
          - link "← Prospects" [ref=e33] [cursor=pointer]:
            - /url: /portfolio/prospects
          - generic [ref=e34]: /
          - generic [ref=e35]: Test Prospect
        - generic [ref=e36]:
          - generic [ref=e37]:
            - generic [ref=e38]: TP
            - heading "Test Prospect" [level=1] [ref=e39]
            - generic [ref=e40]: Prospect
          - generic [ref=e41]:
            - 'button "Stage: Proposal" [ref=e42] [cursor=pointer]':
              - generic [ref=e43]: Stage
              - text: Proposal
              - generic [ref=e44]: ⌄
            - button "Link existing client" [ref=e45] [cursor=pointer]
            - button "Edit details" [ref=e46] [cursor=pointer]
        - generic [ref=e47]:
          - generic [ref=e48]:
            - generic [ref=e49]:
              - paragraph [ref=e50]: Synthetic prospect for isolated validation.
              - link "https://prospect.test ↗" [ref=e51] [cursor=pointer]:
                - /url: https://prospect.test/
              - paragraph [ref=e52]: Focus Advocacy
              - separator [ref=e53]
              - generic [ref=e54]:
                - generic [ref=e55]: Owner
                - generic [ref=e56]: Unassigned
                - generic [ref=e57]: Added 10/1/2026
                - generic [ref=e58]: Virginia
            - generic [ref=e59]:
              - generic [ref=e60]:
                - heading "Pipeline stage" [level=2] [ref=e61]
                - button "Change stage" [ref=e62] [cursor=pointer]
              - paragraph [ref=e63]: Stage updates are currently unavailable. Your existing stage is preserved.
            - region "Prospect activity" [ref=e64]:
              - generic [ref=e65]:
                - heading "Activity" [level=2] [ref=e66]
                - button "Refresh activity" [ref=e67] [cursor=pointer]
              - group "Prospect activity type" [ref=e68]:
                - button "All" [pressed] [ref=e69] [cursor=pointer]
              - paragraph [ref=e70]: No activity yet.
            - region "Federal strategy brief" [ref=e71]:
              - heading "Federal strategy brief" [level=2] [ref=e72]
              - paragraph [ref=e73]: A saved, versioned brief from the prospect’s authorized dossier evidence.
              - paragraph [ref=e74]: No brief has been saved yet.
              - button "Generate from dossier" [ref=e75] [cursor=pointer]
              - generic [ref=e76]: Workspace filing and candidate objectives require separate supported workflows.
            - region "Prospect files" [ref=e77]:
              - heading "Files" [level=2] [ref=e78]
              - paragraph [ref=e79]: Files retain this prospect as their origin after conversion.
              - button "Refresh files" [ref=e80] [cursor=pointer]
              - list [ref=e81]:
                - listitem [ref=e82]:
                  - strong [ref=e83]: test.txt
                  - generic [ref=e84]: Pending content checks · Uploader unavailable
                  - button "Delete test.txt" [ref=e86] [cursor=pointer]
                - listitem [ref=e87]:
                  - strong [ref=e88]: test.txt
                  - generic [ref=e89]: Pending content checks · Uploader unavailable
                  - button "Delete test.txt" [ref=e91] [cursor=pointer]
              - generic [ref=e92]: Preview and download links expire after five minutes. Refresh Files to request current links.
              - generic [ref=e93]:
                - text: Upload prospect file
                - button "Upload prospect file" [ref=e94]
              - button "Upload file" [disabled] [ref=e95]
              - status [ref=e96]: test.txt uploaded. Readiness is checked in Files before preview or download.
              - generic [ref=e97]:
                - button "Sharing unavailable" [disabled] [ref=e98]
                - button "Sending unavailable" [disabled] [ref=e99]
                - button "Text import unavailable" [disabled] [ref=e100]
              - generic [ref=e101]: These files cannot be copied into client libraries, Outreach, Meri or generation workflows.
            - region "Prospect Workspace" [ref=e102]:
              - heading "Workspace documents" [level=2] [ref=e103]
              - paragraph [ref=e104]: Open this prospect’s manual drafts, saved versions and exports. Documents retain their prospect origin after conversion.
              - link "Open prospect Workspace" [ref=e105] [cursor=pointer]:
                - /url: /modules/workspace?prospectId=70000000-0000-4000-8000-000000000001
              - generic [ref=e106]: Sharing, sending and generation are unavailable for prospect documents.
            - region "Proposal" [ref=e107]:
              - heading "Proposal" [level=2] [ref=e108]
              - paragraph [ref=e109]: Review available templates in Workspace. Creating and sending a proposal for this prospect is unavailable.
              - button "Browse templates" [ref=e111] [cursor=pointer]
              - generic [ref=e112]: Proposal documents and send history cannot be linked to this prospect yet.
          - generic [ref=e113]:
            - generic [ref=e114]:
              - generic [ref=e115]:
                - heading "Next step" [level=2] [ref=e116]
                - button "Edit" [ref=e117] [cursor=pointer]
              - paragraph [ref=e118]: Review proposal
              - time [ref=e119]:
                - generic [ref=e120]: Due 11/5/2026, 2:00:00 PM
              - generic [ref=e121]: Owner Unassigned
            - region "Prospect contacts" [ref=e122]:
              - generic [ref=e123]:
                - heading "Contacts" [level=2] [ref=e124]
                - button "+ Add" [disabled] [ref=e125]
              - status [ref=e127]: Prospect contacts are unavailable for this account or service. No contact changes can be saved.
            - region "Prospect notes" [ref=e128]:
              - generic [ref=e129]:
                - heading "Notes" [level=2] [ref=e130]
                - button "+ Add note" [ref=e131] [cursor=pointer]
              - generic [ref=e132]: Shared with your firm.
              - paragraph [ref=e133]: No notes yet.
            - button "Archive prospect" [ref=e134] [cursor=pointer]
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {randomUUID} from 'node:crypto';
  3  | import {writeFileSync} from 'node:fs';
  4  | import {installFixtures,json,prospectId} from "/workspace/capiro-control-35b6598/apps/web/tests/browser/fixtures";
  5  | import {actor,attachment,checksum} from "/workspace/capiro-control-35b6598/apps/web/tests/prospect-resources-fixtures";
  6  | test('uncertain prospect confirmation cannot become a fresh key and second byte upload after reload',async({page})=>{
  7  |  const unexpected=await installFixtures(page);
  8  |  await page.route('**/api/backend/core/me',route=>json(route,{user:{id:actor.userId,email:'actor@example.test'},tenant:{id:actor.tenantId,name:'Synthetic firm'},role:'user_admin'}));
  9  |  const records=new Map<string,typeof attachment>(),intents=new Map<string,string>(),posts:unknown[]=[];
  10 |  let bytePosts=0;
  11 |  await page.route('**/api/backend/core/engagement/attachments?prospectId=*',route=>json(route,[...records.values()].map(record=>({...record,usable:false,blockedReason:'Pending content checks'}))));
  12 |  await page.route('**/engagement/attachments/upload-url',route=>{
  13 |   const body=route.request().postDataJSON();posts.push(body);
  14 |   if(!intents.has(body.requestId))intents.set(body.requestId,`tenants/synthetic/engagement/${body.requestId}/test.txt`);
  15 |   const s3Key=intents.get(body.requestId)!;
  16 |   return json(route,{url:'https://storage.example.test/upload',s3Key,uploadIntentId:randomUUID(),requestId:body.requestId,expiresAt:'2099-10-12T12:00:00Z',fields:{key:s3Key,'Content-Type':'text/plain','x-amz-checksum-algorithm':'SHA256','x-amz-checksum-sha256':Buffer.from(checksum,'hex').toString('base64')}});
  17 |  });
  18 |  await page.route('https://storage.example.test/upload',route=>{bytePosts++;return route.fulfill({status:204});});
  19 |  await page.route('**/engagement/attachments/confirm',route=>{
  20 |   const body=route.request().postDataJSON();
  21 |   if(!records.has(body.s3Key))records.set(body.s3Key,{...attachment,prospectId,id:randomUUID(),s3Key:body.s3Key});
  22 |   return records.size===1?json(route,{message:'Synthetic reply lost AFTER attachment commit'},503):json(route,records.get(body.s3Key));
  23 |  });
  24 |  const area=page.getByRole('region',{name:'Prospect files',exact:true});
  25 |  const choose=()=>area.getByLabel('Upload prospect file').setInputFiles({name:'test.txt',mimeType:'text/plain',buffer:Buffer.from('hello')});
  26 |  await page.goto(`/portfolio/prospects/${prospectId}`);
  27 |  await choose();
  28 |  await area.getByRole('button',{name:'Upload file',exact:true}).click();
  29 |  await expect(area.getByRole('button',{name:'Recover original upload',exact:true})).toBeEnabled();
  30 |  expect(records.size).toBe(1);expect(bytePosts).toBe(1);
  31 |  await page.reload();
  32 |  await expect(area.getByRole('button',{name:'Recover original upload',exact:true})).toHaveCount(0);
  33 |  await choose();
  34 |  await area.getByRole('button',{name:'Upload file',exact:true}).click();
  35 |  await expect(area.getByText(/test.txt uploaded/)).toBeVisible();
  36 |  writeFileSync("/tmp/r3-upload-35b6598-red/prospect-upload-duplicate.json",JSON.stringify({source:'35b6598c0456ebc9ef4cf48e20aef0e5167660b2',uploadUrlPosts:posts,bytePosts,attachments:[...records.values()],unexpected},null,2));
  37 |  expect(unexpected).toEqual([]);
> 38 |  expect(records.size,'the uncertain original attachment requires original confirmation, not a replacement key').toBe(1);
     |                                                                                                                 ^ Error: the uncertain original attachment requires original confirmation, not a replacement key
  39 |  expect(bytePosts).toBe(1);
  40 | });
  41 | 
```