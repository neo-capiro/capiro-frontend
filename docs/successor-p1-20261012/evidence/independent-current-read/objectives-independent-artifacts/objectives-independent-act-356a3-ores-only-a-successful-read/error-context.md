# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: objectives-independent.spec.ts >> actual client Overview summary conceals cached records after403 and restores only a successful read
- Location: ../../tmp/capiro-p1-independent-review/current-read/objectives-independent.spec.ts:20:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('alert')
Expected: visible
Error: strict mode violation: getByRole('alert') resolved to 2 elements:
    1) <div role="alert" class="status error">…</div> aka locator('section').filter({ hasText: 'ObjectivesYou do not have' }).getByRole('alert')
    2) <div role="alert" class="status error">…</div> aka getByLabel('District nexus').getByText('You do not have permission for this operation.Retry')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('alert')

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
        - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
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
      - separator [ref=e28]
      - paragraph [ref=e29]: Test Aerospace
      - navigation "Client" [ref=e30]:
        - link "Overview" [ref=e31] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001
          - generic [ref=e32]: Overview
        - link "Objectives" [ref=e33] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
          - generic [ref=e34]: Objectives
        - link "Calendar" [ref=e35] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
          - generic [ref=e36]: Calendar
        - link "Relationships" [ref=e37] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
          - generic [ref=e38]: Relationships
        - link "Work" [ref=e39] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
          - generic [ref=e40]: Work
        - link "Capabilities" [ref=e41] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
          - generic [ref=e42]: Capabilities
        - link "Bill Tracker" [ref=e43] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
          - generic [ref=e44]: Bill Tracker
        - link "Opportunities" [ref=e45] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
          - generic [ref=e46]: Opportunities
        - link "Files" [ref=e47] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
          - generic [ref=e48]: Files
      - link "Settings" [ref=e50] [cursor=pointer]:
        - /url: /settings
    - main [ref=e51]:
      - generic [ref=e53]:
        - navigation "Breadcrumb" [ref=e54]:
          - link "Back to Portfolio" [ref=e55] [cursor=pointer]:
            - /url: /portfolio
          - link "Portfolio" [ref=e56] [cursor=pointer]:
            - /url: /portfolio
          - generic [ref=e57]: /
          - link "Test Aerospace" [ref=e58] [cursor=pointer]:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001
          - generic [ref=e59]: /
          - 'button "Switch client view: Overview" [ref=e60] [cursor=pointer]': Overview
        - generic [ref=e61]:
          - button "Quick add" [ref=e62] [cursor=pointer]:
            - generic [ref=e63]: Quick add
          - button "Meri actions" [ref=e64] [cursor=pointer]:
            - generic [ref=e65]: Meri actions
          - button "More actions for Test Aerospace" [ref=e66] [cursor=pointer]:
            - img [ref=e67]
      - generic [ref=e72]:
        - generic [ref=e73]:
          - generic [ref=e74]:
            - paragraph [ref=e75]: Client profile
            - heading "Overview" [level=1] [ref=e76]
          - generic [ref=e77]:
            - button "Notes" [ref=e78] [cursor=pointer]:
              - img [ref=e79]
              - text: Notes
            - link "New objective" [ref=e82] [cursor=pointer]:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?new=1
        - generic [ref=e83]:
          - generic [ref=e84]:
            - generic [ref=e85]:
              - generic [ref=e86]:
                - generic [ref=e87]: TA
                - generic [ref=e88]:
                  - generic [ref=e89]:
                    - heading "Test Aerospace" [level=1] [ref=e90]
                    - generic [ref=e91]: ACTIVE
                  - generic [ref=e92]:
                    - text: Aerospace ·
                    - link "https://example.test" [ref=e93] [cursor=pointer]:
                      - /url: https://example.test/
              - paragraph [ref=e94]: Synthetic organization for isolated UI validation.
              - generic "Client focus tags" [ref=e95]:
                - generic [ref=e96]: Focus
                - button "+ Add focus tag" [ref=e97] [cursor=pointer]:
                  - text: + Add
                  - generic [ref=e98]: focus tag
              - generic [ref=e99]:
                - generic [ref=e100]: Owner Unassigned
                - button "Account team · 0" [ref=e101] [cursor=pointer]:
                  - img [ref=e102]
                  - text: Account team · 0
            - region "Engagement pulse" [ref=e107]:
              - generic [ref=e108]:
                - heading "Engagement pulse" [level=2] [ref=e109]
                - link "Open timeline →" [ref=e110] [cursor=pointer]:
                  - /url: "#activity-timeline"
              - generic [ref=e111]:
                - generic [ref=e112]:
                  - strong [ref=e113]: "0"
                  - paragraph [ref=e114]: Recent activity items
                - generic [ref=e115]:
                  - strong [ref=e116]: "0"
                  - paragraph [ref=e117]: Account team
                - generic [ref=e118]:
                  - strong [ref=e119]: —
                  - paragraph [ref=e120]: Objective coverage unavailable
            - generic [ref=e121]:
              - heading "Objectives" [level=2] [ref=e123]
              - alert [ref=e124]:
                - paragraph [ref=e125]: You do not have permission for this operation.
                - button "Retry" [ref=e126] [cursor=pointer]
              - link "View objectives" [ref=e127] [cursor=pointer]:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
                - text: View objectives
                - img [ref=e128]
          - generic [ref=e131]:
            - region "District nexus" [ref=e132]:
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - heading "District nexus" [level=2] [ref=e135]
                  - paragraph [ref=e136]: 0 locations · 0 states · 0 districts
                - generic [ref=e137]:
                  - button "Add facility" [ref=e138] [cursor=pointer]
                  - button "Open district map" [ref=e139] [cursor=pointer]
              - generic [ref=e140]:
                - list
                - img "United States map illustration. No coordinate pins are available." [ref=e142]
              - paragraph [ref=e143]: No facilities yet. Add a location with the plus action.
            - generic [ref=e144]:
              - generic [ref=e145]:
                - heading "Client calendar" [level=2] [ref=e146]
                - link "Open client calendar" [ref=e147] [cursor=pointer]:
                  - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
                  - img [ref=e148]
              - paragraph [ref=e151]: Meetings, preparation, notes and debriefs for this client.
              - link "Open calendar" [ref=e152] [cursor=pointer]:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
        - region "Activity timeline" [ref=e153]:
          - generic [ref=e155]:
            - paragraph [ref=e156]: Relationship history
            - heading "Activity timeline" [level=2] [ref=e157]
          - generic "Activity filters" [ref=e158]:
            - generic [ref=e159]:
              - generic [ref=e160]: Search activity
              - searchbox "Search activity" [ref=e161]
            - button "Activity type" [ref=e162] [cursor=pointer]: All activity
            - 'button "Activity dates: All dates" [ref=e163] [cursor=pointer]': All dates
          - paragraph [ref=e164]: No activity to show.
```

# Test source

```ts
  1  | import {test,expect} from '/workspace/capiro-objective-current-read/node_modules/@playwright/test/index.mjs';
  2  | import {installFixtures,json,clientId,client,objective,objectiveId} from '/workspace/capiro-objective-current-read/apps/web/tests/browser/fixtures';
  3  | const nextId='10000000-0000-4000-8000-000000000002';
  4  | async function setup(page:any){
  5  |  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  6  |  const unexpected=await installFixtures(page);await page.addInitScript(()=>{const readNow=Date.now.bind(Date);(window as any).__currentReadOffset=0;Date.now=()=>readNow()+(window as any).__currentReadOffset;});
  7  |  let status=200,record={...objective},reads=0,hold:Promise<void>|undefined;let release!:()=>void;const writes:string[]=[];
  8  |  page.on('request',r=>{if(r.url().includes('/api/backend/')&&r.method()!=='GET')writes.push(r.method());});
  9  |  await page.route(`**/core/clients/${clientId}/objectives`,async route=>{reads++;if(hold)await hold;await json(route,status===200?[record]:{message:'Independent current Objectives read failed'},status);});
  10 |  return{unexpected,writes,reads:()=>reads,fail:(s:number)=>status=s,recover:()=>{status=200;record={...objective,outcome:'Independently current outcome',minimumWin:'Current minimum only'};hold=new Promise<void>(r=>release=r);return()=>{hold=undefined;release();}}};
  11 | }
  12 | async function reconnect(page:any){await page.evaluate(()=>(window as any).__currentReadOffset+=31_000);await page.evaluate(()=>{dispatchEvent(new Event('offline'));dispatchEvent(new Event('online'));});}
  13 | for(const status of [403,503])test(`actual Objectives route conceals an open editor after ${status}; held retry cannot revive its draft`,async({page},info)=>{
  14 |  const c=await setup(page);await page.goto(`/portfolio/${clientId}/objectives?objective=${objectiveId}`);
  15 |  const dialog=page.getByRole('dialog',{name:'Edit objective'});await expect(dialog).toBeVisible();await dialog.getByLabel('Outcome',{exact:true}).fill('Old private unsaved input');
  16 |  c.fail(status);await reconnect(page);await expect(page.getByRole('alert')).toBeVisible();await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Test outcome',exact:true})).toHaveCount(0);await expect(page.getByText('No current objectives',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'New objective',exact:true})).toBeDisabled();await expect(page).not.toHaveURL(/[?&]objective=/);
  17 |  const before=c.reads(),release=c.recover();await page.getByRole('alert').getByRole('button',{name:'Retry',exact:true}).click();await expect.poll(c.reads).toBeGreaterThan(before);await expect(dialog).toHaveCount(0);await expect(page.getByText('Test minimum win',{exact:true})).toHaveCount(0);release();
  18 |  await expect(page.getByRole('button',{name:'Independently current outcome',exact:true})).toBeVisible();await expect(dialog).toHaveCount(0);await page.getByRole('button',{name:'Independently current outcome',exact:true}).click();await expect(dialog.getByLabel('Outcome',{exact:true})).toHaveValue('Independently current outcome');expect(c.writes).toEqual([]);expect(c.unexpected).toEqual([]);await page.screenshot({path:info.outputPath(`objective-recovered-${status}.png`)});
  19 | });
  20 | test('actual client Overview summary conceals cached records after403 and restores only a successful read',async({page},info)=>{
> 21 |  const c=await setup(page);await page.goto(`/portfolio/${clientId}`);const old=page.getByRole('link',{name:/Test outcome/});await expect(old).toBeVisible();c.fail(403);await reconnect(page);await expect(page.getByRole('alert')).toBeVisible();await expect(old).toHaveCount(0);await expect(page.getByRole('link',{name:'New objective',exact:true})).toHaveCount(0);await expect(page.getByText('No objectives yet. Define the first outcome for this client.')).toHaveCount(0);
     |                                                                                                                                                                                                                                     ^ Error: expect(locator).toBeVisible() failed
  22 |  const release=c.recover();await page.getByRole('alert').getByRole('button',{name:'Retry',exact:true}).click();await expect(old).toHaveCount(0);release();await expect(page.getByRole('link',{name:/Independently current outcome/})).toBeVisible();expect(c.writes).toEqual([]);expect(c.unexpected).toEqual([]);await page.screenshot({path:info.outputPath('objective-summary-current.png')});
  23 | });
  24 | test('actual client route replacement never renders another-client Objective receipt',async({page},info)=>{
  25 |  const c=await setup(page);await page.goto(`/portfolio/${clientId}/objectives?objective=${objectiveId}`);await expect(page.getByRole('dialog',{name:'Edit objective'})).toBeVisible();
  26 |  await page.route(`**/core/clients/${nextId}`,route=>json(route,{...client,id:nextId,name:'Independent second client'}));await page.route(`**/core/clients/${nextId}/advocacy-matters**`,route=>json(route,[]));await page.route(`**/core/clients/${nextId}/objectives`,route=>json(route,[objective]));
  27 |  await page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},`/portfolio/${nextId}/objectives?objective=${objectiveId}`);
  28 |  await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('dialog',{name:'Edit objective'})).toHaveCount(0);await expect(page.getByText('Test outcome',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'New objective',exact:true})).toBeDisabled();expect(c.writes).toEqual([]);expect(c.unexpected).toEqual([]);await page.screenshot({path:info.outputPath('objective-wrong-client-rejected.png')});
  29 | });
  30 | test('ordinary successful background read keeps the current Objective editor draft',async({page})=>{
  31 |  const c=await setup(page);await page.goto(`/portfolio/${clientId}/objectives?objective=${objectiveId}`);const dialog=page.getByRole('dialog',{name:'Edit objective'});await dialog.getByLabel('Outcome',{exact:true}).fill('Preserve draft on successful refresh');let release!:()=>void;let entered=false;const gate=new Promise<void>(r=>release=r);await page.route(`**/core/clients/${clientId}/objectives`,async route=>{entered=true;await gate;await json(route,[objective]);});await reconnect(page);await expect.poll(()=>entered).toBe(true);await expect(dialog.getByLabel('Outcome',{exact:true})).toHaveValue('Preserve draft on successful refresh');release();await expect(page.getByRole('button',{name:'New objective',exact:true,includeHidden:true})).toBeEnabled();await expect(dialog.getByLabel('Outcome',{exact:true})).toHaveValue('Preserve draft on successful refresh');expect(c.writes).toEqual([]);expect(c.unexpected).toEqual([]);
  32 | });
  33 | 
```