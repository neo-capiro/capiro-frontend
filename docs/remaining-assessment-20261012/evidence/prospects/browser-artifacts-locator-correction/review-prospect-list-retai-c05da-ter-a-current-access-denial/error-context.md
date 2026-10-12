# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: review.spec.ts >> prospect list retains cached cards and pipeline after a current access denial
- Location: ../../tmp/capiro-remaining-assessment-20261012/prospects/review.spec.ts:43:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('alert').filter({ hasText: 'Synthetic prospect access revoked' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('alert').filter({ hasText: 'Synthetic prospect access revoked' })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Workspace":
    - link "Meri":
      - /url: /meri
    - link "Portfolio":
      - /url: /
    - link "Modules":
      - /url: /modules
  - navigation "Global actions":
    - link "Quick log":
      - /url: /portfolio?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search Portfolio":
      - /url: /portfolio?search=1
    - button "Updates unavailable" [disabled]
    - button "Test account": T
- complementary "Portfolio navigation":
  - paragraph: Portfolio
  - navigation "Portfolio":
    - link "Portfolio Overview":
      - /url: /portfolio
      - text: Overview
    - link "Portfolio Clients":
      - /url: /portfolio?type=CLIENT
      - text: Clients
    - link "Portfolio Prospects":
      - /url: /portfolio/prospects
      - text: Prospects
  - link "Settings":
    - /url: /settings
- main:
  - paragraph: Portfolio
  - heading "Prospects 1" [level=1]
  - button "+ Add prospect"
  - textbox "Search prospects"
  - combobox "Prospect owner":
    - option "All owners" [selected]
  - combobox "Prospect stage":
    - option "All stages" [selected]
    - option "Identified" [disabled]
    - option "Initiated" [disabled]
    - option "Engaged" [disabled]
    - option "Proposal"
    - option "Negotiation" [disabled]
    - option "Closed won" [disabled]
    - option "Closed lost" [disabled]
    - option "Researching"
    - option "Qualified"
    - option "Outreach"
    - option "Meeting"
    - option "Won"
    - option "Lost"
    - option "Parked"
  - combobox "Prospect visibility":
    - option "Active" [selected]
    - option "Archived"
    - option "All"
  - button "Pipeline"
  - alert:
    - paragraph: You do not have permission for this operation.
    - button "Retry"
  - text: Proposal · 1
  - link "TP Test Prospect Virginia Proposal Unassigned Review proposal":
    - /url: /portfolio/prospects/70000000-0000-4000-8000-000000000001
    - text: TP
    - heading "Test Prospect" [level=3]
    - text: Virginia Proposal Unassigned
    - paragraph: Review proposal
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { installFixtures, json, prospectId, prospect } from '/workspace/capiro-acceptance-assessment/apps/web/tests/browser/fixtures';
  3  | import { actor, attachment } from '/workspace/capiro-acceptance-assessment/apps/web/tests/prospect-resources-fixtures';
  4  | const catalog={version:'portfolio-3.1',createStage:'identified',legacyMapping:'pending',allowLegacyTransitions:false,stages:['identified','initiated','engaged','proposal','negotiation','closed_won','closed_lost'].map(value=>({value,label:value}))};
  5  | 
  6  | test('capture previously unreviewed prospect editor and pipeline frames',async({page},info)=>{
  7  |  await installFixtures(page);
  8  |  await page.route('**/business-development/prospect-stages',route=>json(route,catalog));
  9  |  await page.goto('/portfolio/prospects');
  10 |  await expect(page.getByRole('heading',{name:'Prospects 1'})).toBeVisible();
  11 |  await page.getByRole('button',{name:'Pipeline',exact:true}).click();
  12 |  await expect(page.getByRole('dialog',{name:'Prospects pipeline'})).toBeVisible();
  13 |  await page.screenshot({path:info.outputPath('pipeline-1440.png')});
  14 |  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  15 |  await page.getByRole('button',{name:'+ Add prospect',exact:true}).click();
  16 |  await expect(page.getByRole('dialog',{name:'Add prospect'})).toBeVisible();
  17 |  await page.screenshot({path:info.outputPath('prospect-create-1440.png')});
  18 |  await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
  19 |  await page.getByRole('link',{name:/Test Prospect/}).click();
  20 |  await page.getByRole('button',{name:'Edit details',exact:true}).click();
  21 |  await page.screenshot({path:info.outputPath('prospect-editor-1440.png')});
  22 |  await page.setViewportSize({width:390,height:844});
  23 |  await page.screenshot({path:info.outputPath('prospect-editor-390.png')});
  24 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  25 | });
  26 | 
  27 | test('Figma files search is absent although current file records are available',async({page},info)=>{
  28 |  await installFixtures(page);
  29 |  await page.route('**/api/backend/core/me',route=>json(route,{user:{id:actor.userId,email:'synthetic@example.test'},tenant:{id:actor.tenantId,name:'Synthetic firm'},role:'user_admin'}));
  30 |  await page.route('**/api/backend/core/engagement/attachments?prospectId=*',route=>json(route,[{...attachment,prospectId,usable:true,lifecycleStatus:'available',scanStatus:'clean',uploadedByName:'Synthetic user',previewUrl:'https://storage.example.test/preview',downloadUrl:'https://storage.example.test/download'}]));
  31 |  await page.goto(`/portfolio/prospects/${prospectId}`);
  32 |  const files=page.getByRole('region',{name:'Prospect files',exact:true});
  33 |  await expect(files.getByRole('link',{name:'Preview test.txt',exact:true})).toBeVisible();
  34 |  await expect(files.getByRole('textbox',{name:/search/i})).toHaveCount(0);
  35 |  await expect(files.getByRole('searchbox')).toHaveCount(0);
  36 |  await files.screenshot({path:info.outputPath('prospect-files-current.png')});
  37 |  await page.screenshot({path:info.outputPath('prospect-detail-files-1440.png'),fullPage:true});
  38 |  await page.setViewportSize({width:390,height:844});
  39 |  await files.screenshot({path:info.outputPath('prospect-files-390.png')});
  40 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  41 | });
  42 | 
  43 | test('prospect list retains cached cards and pipeline after a current access denial',async({page},info)=>{
  44 |  await installFixtures(page);
  45 |  await page.clock.install();
  46 |  let denied=false;let reads=0;
  47 |  await page.route('**/api/backend/core/business-development/prospects?*',route=>{reads++;return denied?json(route,{message:'Synthetic prospect access revoked'},403):json(route,{prospects:[prospect],counts:{visible:1,total:1,active:1,dismissed:0,byStage:{proposal:1}}});});
  48 |  await page.goto('/portfolio/prospects');
  49 |  await expect(page.getByRole('link',{name:/Test Prospect/})).toBeVisible();
  50 |  await page.getByRole('link',{name:/Test Prospect/}).click();
  51 |  await expect(page.getByRole('heading',{name:'Test Prospect',exact:true})).toBeVisible();
  52 |  denied=true;
  53 |  await page.clock.fastForward(31000);
  54 |  await page.getByRole('link',{name:'← Prospects',exact:true}).click();
> 55 |  await expect(page.getByRole('alert').filter({hasText:'Synthetic prospect access revoked'})).toBeVisible();
     |                                                                                              ^ Error: expect(locator).toBeVisible() failed
  56 |  await expect(page.getByRole('link',{name:/Test Prospect/})).toBeVisible();
  57 |  await expect(page.getByRole('button',{name:'Pipeline',exact:true})).toBeEnabled();
  58 |  await page.screenshot({path:info.outputPath('denied-prospect-list.png')});
  59 |  await page.getByRole('button',{name:'Pipeline',exact:true}).click();
  60 |  await expect(page.getByRole('dialog',{name:'Prospects pipeline'}).getByRole('link',{name:'Test Prospect',exact:true})).toBeVisible();
  61 |  await page.screenshot({path:info.outputPath('denied-prospect-pipeline.png')});
  62 |  expect(reads).toBeGreaterThanOrEqual(2);
  63 | });
  64 | 
```