# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospects-independent.spec.ts >> existing Prospect detail gate closes its edit form after current 503 and retry cannot restore old draft
- Location: ../tmp/capiro-p1-independent-review/current-read/prospects-independent.spec.ts:5:35

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Independently current prospect', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Independently current prospect', exact: true })

```

```yaml
- dialog "Edit company details":
  - banner:
    - heading "Edit company details" [level=2]
    - button "Close"
  - paragraph: Edit company details
  - text: Company name
  - textbox "Company name": Independently current prospect
  - text: Website
  - textbox "Website": https://prospect.test
  - text: Domain
  - textbox "Domain":
    - /placeholder: example.com
    - text: prospect.test
  - text: Description
  - textbox "Description": Synthetic prospect for isolated validation.
  - text: Service hypothesis
  - textbox "Service hypothesis": Advocacy
  - text: Geography
  - textbox "Geography": Virginia
  - button "Save company details"
```

# Test source

```ts
  1  | import {test,expect} from '/workspace/capiro-prospect-current-read/node_modules/@playwright/test/index.mjs';
  2  | import {installFixtures,json,prospect,prospectId,clientId} from '/workspace/capiro-prospect-current-read/apps/web/tests/browser/fixtures';
  3  | async function setup(page:any){await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());const unexpected=await installFixtures(page);await page.addInitScript(()=>{const readNow=Date.now.bind(Date);(window as any).__currentReadOffset=0;Date.now=()=>readNow()+(window as any).__currentReadOffset;});const writes:string[]=[];page.on('request',r=>{if(r.url().includes('/api/backend/')&&r.method()!=='GET')writes.push(r.method());});return{unexpected,writes};}
  4  | async function reconnect(page:any){await page.evaluate(()=>(window as any).__currentReadOffset+=31_000);await page.evaluate(()=>{dispatchEvent(new Event('offline'));dispatchEvent(new Event('online'));});}
  5  | for(const status of [403,503])test(`existing Prospect detail gate closes its edit form after current ${status} and retry cannot restore old draft`,async({page},info)=>{
  6  |  const c=await setup(page);let code=200,record={...prospect},hold:Promise<void>|undefined,reads=0;let release!:()=>void;
  7  |  await page.route(`**/core/business-development/prospects/${prospectId}`,async route=>{reads++;if(hold)await hold;await json(route,code===200?record:{message:'Independent current detail unavailable'},code);});
  8  |  await page.goto(`/portfolio/prospects/${prospectId}`);await page.getByRole('button',{name:'Edit details',exact:true}).click();await page.getByLabel('Company name').fill('Old private prospect draft');code=status;await reconnect(page);
  9  |  await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Test Prospect',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Edit details',exact:true})).toHaveCount(0);
  10 |  code=200;record={...prospect,displayName:'Independently current prospect'};hold=new Promise<void>(r=>release=r);const before=reads;await page.getByRole('alert').getByRole('button',{name:'Retry',exact:true}).click();await expect.poll(()=>reads).toBeGreaterThan(before);await expect(page.getByRole('dialog')).toHaveCount(0);hold=undefined;release();
> 11 |  await expect(page.getByRole('heading',{name:'Independently current prospect',exact:true})).toBeVisible();if(await page.getByRole('dialog').count()===0)await page.getByRole('button',{name:'Edit details',exact:true}).click();await expect(page.getByLabel('Company name')).toHaveValue('Independently current prospect');expect(c.writes).toEqual([]);expect(c.unexpected).toEqual([]);await page.screenshot({path:info.outputPath(`prospect-detail-recovered-${status}.png`)});
     |                                                                                             ^ Error: expect(locator).toBeVisible() failed
  12 | });
  13 | test('cached global list plus explicit pipeline URL cannot reappear after service error through client navigation',async({page},info)=>{
  14 |  const c=await setup(page);let code=200,reads=0;await page.route('**/core/business-development/prospects?*',route=>{reads++;return json(route,code===200?{prospects:[prospect],counts:{visible:1,total:1,active:1,dismissed:0,byStage:{proposal:1}}}:{message:'Independent list service unavailable'},code);});
  15 |  await page.goto('/portfolio/prospects?pipeline=1');await expect(page.getByRole('dialog')).toBeVisible();await page.evaluate(path=>{history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));},`/portfolio/${clientId}`);await expect(page.getByRole('heading',{name:'Test Aerospace',exact:true})).toBeVisible();code=503;await page.evaluate(()=>(window as any).__currentReadOffset+=31_000);await page.evaluate(()=>{history.pushState({},'','/portfolio/prospects?pipeline=1');dispatchEvent(new PopStateEvent('popstate'));});
  16 |  await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('link',{name:/Test Prospect/})).toHaveCount(0);await expect(page.getByLabel('Stage totals')).toHaveCount(0);await expect(page.getByRole('button',{name:'Pipeline',exact:true})).toBeDisabled();await expect(page).not.toHaveURL(/[?&]pipeline=/);expect(reads).toBeGreaterThan(1);expect(c.writes).toEqual([]);expect(c.unexpected).toEqual([]);await page.screenshot({path:info.outputPath('prospect-service-error-no-pipeline.png')});
  17 | });
  18 | test('ordinary successful background list refresh keeps an in-progress new Prospect draft',async({page})=>{
  19 |  const c=await setup(page);await page.goto('/portfolio/prospects?new=1');await page.getByLabel('Company name').fill('Preserve ordinary current draft');let release!:()=>void;let entered=false;const gate=new Promise<void>(r=>release=r);await page.route('**/core/business-development/prospects?*',async route=>{entered=true;await gate;await json(route,{prospects:[prospect],counts:{visible:2,total:2,active:2,dismissed:0,byStage:{proposal:2}}});});await reconnect(page);await expect.poll(()=>entered).toBe(true);await expect(page.getByLabel('Company name')).toHaveValue('Preserve ordinary current draft');release();await expect(page.getByText('Showing the latest 1 of 2 matching prospects. Narrow the filters to find older records.')).toBeVisible();await expect(page.getByLabel('Company name')).toHaveValue('Preserve ordinary current draft');expect(c.writes).toEqual([]);expect(c.unexpected).toEqual([]);
  20 | });
  21 | for(const failure of [403,503])test(`fresh earlier filter cache stays inaccessible through held reread after ${failure}`,async({page},info)=>{
  22 |  const c=await setup(page);let phase:'initial'|'denied'|'recovery'='initial',reads=0,entered=false;let release!:()=>void;const gate=new Promise<void>(r=>release=r);
  23 |  await page.route('**/core/business-development/prospects?*',async route=>{reads++;if(phase==='denied')return json(route,{message:'Independent filter unavailable'},failure);if(phase==='recovery'){entered=true;await gate;}await json(route,{prospects:[{...prospect,displayName:phase==='recovery'?'New authorized filtered result':prospect.displayName}],counts:{visible:1,total:1,active:1,dismissed:0,byStage:{proposal:1}}});});
  24 |  await page.goto('/portfolio/prospects');await expect(page.getByRole('link',{name:/Test Prospect/})).toBeVisible();phase='denied';await page.getByLabel('Search prospects').fill('Rejected scope');await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('link',{name:/Test Prospect/})).toHaveCount(0);
  25 |  phase='recovery';const before=reads;await page.getByLabel('Search prospects').fill('');await expect.poll(()=>entered).toBe(true);expect(reads).toBeGreaterThan(before);await expect(page.getByRole('link',{name:/Test Prospect|New authorized filtered result/})).toHaveCount(0);await expect(page.getByLabel('Stage totals')).toHaveCount(0);await expect(page.getByRole('button',{name:'Pipeline',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'+ Add prospect',exact:true})).toBeDisabled();await expect(page.getByRole('dialog')).toHaveCount(0);release();await expect(page.getByRole('link',{name:/New authorized filtered result/})).toBeVisible();expect(c.writes).toEqual([]);expect(c.unexpected).toEqual([]);await page.screenshot({path:info.outputPath(`prospect-fresh-filter-recovered-${failure}.png`)});
  26 | });
  27 | 
```