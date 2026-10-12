# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: review.spec.ts >> Files ACL pending unknown review at 1440
- Location: ../tmp/capiro-successor-visual-review/review.spec.ts:17:6

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic:
  - generic:
    - link:
      - /url: "#main"
      - text: Skip to content
    - banner:
      - link:
        - /url: /
        - img
      - navigation:
        - link:
          - /url: /meri
        - link:
          - /url: /
        - link:
          - /url: /modules
      - navigation:
        - link:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
        - link:
          - /url: /calendar
        - link:
          - /url: /portfolio?search=1
        - button [disabled]
        - generic:
          - button: T
    - generic:
      - complementary:
        - paragraph: Portfolio
        - navigation:
          - link:
            - /url: /portfolio
            - generic: Overview
          - link:
            - /url: /portfolio?type=CLIENT
            - generic: Clients
          - link:
            - /url: /portfolio/prospects
            - generic: Prospects
        - separator
        - paragraph: Test Aerospace
        - navigation:
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001
            - generic: Overview
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
            - generic: Objectives
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
            - generic: Calendar
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
            - generic: Relationships
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
            - generic: Work
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
            - generic: Capabilities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
            - generic: Bill Tracker
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
            - generic: Opportunities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
            - generic: Files
        - generic:
          - link:
            - /url: /settings
            - text: Settings
      - main:
        - generic:
          - generic:
            - navigation:
              - link:
                - /url: /portfolio
              - link:
                - /url: /portfolio
                - text: Portfolio
              - generic: /
              - link:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001
                - text: Test Aerospace
              - generic: /
              - button: Files
            - generic:
              - button:
                - generic: Quick add
              - button:
                - generic: Meri actions
              - button:
                - img
          - region:
            - generic: TA
            - generic:
              - strong: Test Aerospace
              - paragraph: Aerospace
            - generic: active client
        - generic:
          - generic:
            - generic:
              - heading [level=1]: Client files
              - generic:
                - button [disabled]: New folder
                - button: Upload
                - button [disabled]: Create with Meri
            - generic:
              - textbox:
                - /placeholder: Search files
              - combobox
              - combobox
            - generic:
              - complementary:
                - generic:
                  - generic: Folders
                  - button [disabled]: Access
                - button [pressed]: Test Aerospace · 1
                - button:
                  - text: Reports
                  - generic: "1"
                - button:
                  - text: Unfiled
                  - generic: "0"
                - separator
                - generic: Visible file storage
                - paragraph: 0.0 MiB
                - generic: Storage quota is not provided by this service. Only accessible current attachments are counted.
              - generic:
                - generic:
                  - generic: 1 files · 0 selected
                  - button [disabled]: Move to folder
                - generic:
                  - table:
                    - rowgroup:
                      - row:
                        - columnheader:
                          - checkbox
                        - columnheader: Name
                        - columnheader: Linked to / location
                        - columnheader: Created
                        - columnheader: Owner
                        - columnheader: Status
                        - columnheader:
                          - generic: Actions
                    - rowgroup:
                      - row:
                        - cell:
                          - checkbox
                        - cell:
                          - button:
                            - generic: pdf
                            - text: Test report.pdf
                          - generic: manual
                        - cell: Reports
                        - cell: 10/1/2026
                        - cell: Test user
                        - cell:
                          - generic: scan_pending
                        - cell:
                          - button: ⋯
  - 'dialog "Access: Test report.pdf" [ref=e2]':
    - banner [ref=e3]:
      - 'heading "Access: Test report.pdf" [level=2] [ref=e4]'
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Choose who on your team can view these files. The uploader retains access.
    - generic [ref=e10]:
      - group "Who can view" [ref=e11]:
        - generic [ref=e12]: Who can view
        - generic [ref=e13]:
          - radio "All team members" [disabled] [ref=e14]
          - text: All team members
        - generic [ref=e15]:
          - radio "Specific people" [checked] [disabled] [ref=e16]
          - text: Specific people
      - generic [ref=e17]:
        - generic [ref=e18]:
          - checkbox "Alexandria Montgomery-Washingtonalexandria.long@example.test" [disabled] [ref=e19]
          - generic [ref=e20]: Alexandria Montgomery-Washingtonalexandria.long@example.test
        - generic [ref=e21]:
          - checkbox "Christopher Andersonchristopher@example.test" [disabled] [ref=e22]
          - generic [ref=e23]: Christopher Andersonchristopher@example.test
        - generic [ref=e24]: An empty selection grants access only to the uploader.
      - button "Save access" [disabled] [ref=e25]
```

# Test source

```ts
  1  | import {test,expect,type Page,type Locator,type TestInfo} from '/workspace/capiro-p1-successor/node_modules/@playwright/test';
  2  | import {installFixtures,json,file,clientId} from '/workspace/capiro-p1-successor/apps/web/tests/browser/fixtures';
  3  | import {writeFile} from 'node:fs/promises';
  4  | const meeting={id:'meeting-one',subject:'Synthetic meeting',description:null,location:'Old location',startsAt:'2026-10-10T14:00:00Z',endsAt:'2026-10-10T15:00:00Z',status:'scheduled',joinLink:null,visibility:'private',isVirtual:false,meri:null,client:{id:'client-one',name:'Synthetic'},attendees:[],preps:[]};
  5  | function held(){let release!:()=>void;const promise=new Promise<void>(r=>release=r);return{release,promise};}
  6  | async function inspect(page:Page,dialog:Locator,info:TestInfo,label:string){
  7  |  await expect(dialog).toBeVisible();await expect(dialog).toHaveAttribute('aria-modal','true');
  8  |  const metrics=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,viewport:{width:innerWidth,height:innerHeight},labelledBy:el.getAttribute('aria-labelledby'),describedBy:el.getAttribute('aria-describedby')};});
  9  |  expect(metrics.x).toBeGreaterThanOrEqual(0);expect(metrics.x+metrics.width).toBeLessThanOrEqual(metrics.viewport.width+1);expect(metrics.y).toBeGreaterThanOrEqual(0);expect(metrics.y+metrics.height).toBeLessThanOrEqual(metrics.viewport.height+1);expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);expect(metrics.labelledBy).toBeTruthy();expect(metrics.describedBy).toBeTruthy();
  10 |  const snapshot=await dialog.ariaSnapshot();await writeFile(info.outputPath(label+'.aria.txt'),snapshot);await writeFile(info.outputPath(label+'.geometry.json'),JSON.stringify(metrics,null,2));
  11 |  await dialog.evaluate(el=>el.scrollTop=0);await page.screenshot({path:info.outputPath(label+'-top.png')});
  12 |  if(metrics.scrollHeight>metrics.clientHeight+1){await dialog.evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:info.outputPath(label+'-bottom.png')});}
  13 |  const enabled=dialog.locator('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)');
> 14 |  for(let i=0;i<Math.min(await enabled.count()+2,14);i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);const focused=await page.locator(':focus').boundingBox();if(focused){expect(focused.x).toBeGreaterThanOrEqual(metrics.x-1);expect(focused.x+focused.width).toBeLessThanOrEqual(metrics.x+metrics.width+1);}}
     |                                                                                                                                                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  15 | }
  16 | for(const width of [1440,360]){
  17 |  test(`Files ACL pending unknown review at ${width}`,async({page},info)=>{
  18 |   await page.setViewportSize({width,height:width===360?800:1040});const unexpected=await installFixtures(page);const hold=held();let writes=0;let review=false;
  19 |   const members=[{id:'viewer-a',email:'alexandria.long@example.test',firstName:'Alexandria',lastName:'Montgomery-Washington'},{id:'viewer-b',email:'christopher@example.test',firstName:'Christopher',lastName:'Anderson'}];
  20 |   await page.route('**/core/client-account-owners/options',r=>json(r,members));await page.route('**/engagement/attachments?**',r=>json(r,[file]));
  21 |   await page.route(`**/files/${file.id}/access`,async r=>{if(r.request().method()==='GET')return json(r,review?{...file,viewerMode:'restricted',viewerUserIds:members.map(m=>m.id)}:file);writes++;await hold.promise;return json(r,file);});
  22 |   await page.goto(`/portfolio/${clientId}/files`);await page.getByRole('button',{name:`Actions for ${file.fileName}`}).click();await page.getByRole('menuitem',{name:'Manage access',exact:true}).click();const d=page.getByRole('dialog',{name:`Access: ${file.fileName}`});await d.getByRole('radio',{name:'Specific people'}).check();await d.getByRole('button',{name:'Save access'}).click();await expect.poll(()=>writes).toBe(1);
  23 |   await inspect(page,d,info,'files-access-pending');await page.keyboard.press('Escape');await expect(d).toBeVisible();hold.release();await expect(d.getByText(/save outcome is unknown/)).toBeVisible();await expect(d.getByRole('button',{name:'Save access'})).toBeDisabled();await inspect(page,d,info,'files-access-unknown');review=true;
  24 |   await d.getByRole('button',{name:'Review current file'}).focus();await page.keyboard.press('Enter');await expect(d.getByText(/Current selected viewers/)).toBeVisible();await expect(d.getByRole('button',{name:'Save access'})).toBeEnabled();await inspect(page,d,info,'files-access-reviewed');await page.keyboard.press('Escape');await expect(d).toHaveCount(0);expect(writes).toBe(1);expect(unexpected).toEqual([]);
  25 |  });
  26 |  test(`Files folder unknown review at ${width}`,async({page},info)=>{
  27 |   await page.setViewportSize({width,height:width===360?800:1040});const unexpected=await installFixtures(page);await page.route('**/engagement/attachments?**',r=>json(r,[file]));await page.route(`**/files/${file.id}/access`,r=>json(r,file));await page.route(`**/files/${file.id}/folder`,r=>json(r,file));await page.goto(`/portfolio/${clientId}/files`);await page.getByRole('checkbox',{name:`Select ${file.fileName}`}).check();await page.getByRole('button',{name:'New folder',exact:true}).click();const d=page.getByRole('dialog',{name:'New folder',exact:true});await d.getByLabel('Folder name').fill('Quarterly reports and supporting evidence');await d.getByRole('button',{name:'Create folder & move file'}).click();await expect(d.getByText(/save outcome is unknown/)).toBeVisible();await inspect(page,d,info,'files-folder-unknown');await d.getByRole('button',{name:'Review current file'}).focus();await page.keyboard.press('Enter');await expect(d.getByText('Current saved folder: Reports')).toBeVisible();await inspect(page,d,info,'files-folder-reviewed');await page.keyboard.press('Escape');await expect(d).toHaveCount(0);expect(unexpected).toEqual([]);
  28 |  });
  29 |  test(`Meeting pending unknown at ${width}`,async({page},info)=>{
  30 |   await page.setViewportSize({width,height:width===360?800:1040});const unexpected=await installFixtures(page);const hold=held();let writes=0;await page.route('**/core/engagement/meetings/meeting-one',async r=>{writes++;await hold.promise;return json(r,{...meeting,id:'foreign'});});await page.goto('/calendar-meeting-receipts.html');const d=page.getByRole('dialog',{name:'Edit meeting'});await d.getByRole('button',{name:'Save meeting'}).click();await expect.poll(()=>writes).toBe(1);await expect(d.getByLabel('Subject',{exact:true})).toHaveAttribute('readonly','');await inspect(page,d,info,'meeting-pending');await page.keyboard.press('Escape');await expect(d).toBeVisible();hold.release();await expect(d.getByText(/may have completed/)).toBeVisible();await inspect(page,d,info,'meeting-unknown');await expect(d.getByRole('button',{name:'Save meeting'})).toBeDisabled();expect(writes).toBe(1);expect(unexpected).toEqual([]);
  31 |  });
  32 |  for(const kind of ['notes','debriefs'])test(`Calendar ${kind} pending unknown at ${width}`,async({page},info)=>{
  33 |   await page.setViewportSize({width,height:width===360?800:1040});const unexpected=await installFixtures(page);const hold=held();let writes=0;const singular=kind==='notes'?'note':'debrief';await page.route('**/core/engagement/meetings/**',async r=>{if(r.request().method()==='GET')return json(r,r.request().url().endsWith('/'+kind)?[]:meeting);writes++;await hold.promise;return json(r,{});});await page.goto('/calendar-artifact-receipts.html?kind='+kind);await page.getByRole('button',{name:'Add '+singular,exact:true}).click();const d=page.getByRole('dialog',{name:'Add '+singular});await d.getByLabel('Content',{exact:true}).fill('Synthetic reviewed meeting draft. Preserve the full content while the response is pending or uncertain.');await d.getByRole('button',{name:'Save '+singular}).click();await expect.poll(()=>writes).toBe(1);await expect(d.getByLabel('Content',{exact:true})).toHaveAttribute('readonly','');await inspect(page,d,info,kind+'-pending');await page.keyboard.press('Escape');await expect(d).toBeVisible();hold.release();await expect(d.getByText(/may have completed/)).toBeVisible();await inspect(page,d,info,kind+'-unknown');await expect(d.getByRole('button',{name:'Save '+singular})).toBeDisabled();await page.keyboard.press('Escape');await expect(d).toHaveCount(0);expect(writes).toBe(1);expect(unexpected).toEqual([]);
  34 |  });
  35 | }
  36 | 
```