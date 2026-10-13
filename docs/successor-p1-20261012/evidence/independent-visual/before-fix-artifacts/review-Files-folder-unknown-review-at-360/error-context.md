# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: review.spec.ts >> Files folder unknown review at 360
- Location: ../tmp/capiro-successor-visual-review/review.spec.ts:28:6

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5191/portfolio/10000000-0000-4000-8000-000000000001/files
Call log:
  - navigating to "http://127.0.0.1:5191/portfolio/10000000-0000-4000-8000-000000000001/files", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This site can’t be reached" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: 127.0.0.1
      - text: refused to connect.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Try:"
      - list [ref=e12]:
        - listitem [ref=e13]: Checking the connection
        - listitem [ref=e14]:
          - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "Reload" [ref=e19] [cursor=pointer]
    - button "Details" [ref=e20] [cursor=pointer]
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
  13 |  const focusLog:any[]=[];const captureFocus=async()=>await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.slice(0,100),name:document.activeElement?.getAttribute('name'),documentHasFocus:document.hasFocus(),inDialog:Boolean(document.activeElement?.closest('[role=dialog]'))}));focusLog.push(await captureFocus());const enabled=dialog.locator('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)');
  14 |  for(let i=0;i<Math.min(await enabled.count()+2,14);i++){await page.keyboard.press('Tab');await page.waitForTimeout(150);focusLog.push(await captureFocus());const focused=await page.evaluate(()=>{const el=document.activeElement;if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x,width:r.width};});if(focused && focusLog.at(-1)?.inDialog){expect(focused.x).toBeGreaterThanOrEqual(metrics.x-1);expect(focused.x+focused.width).toBeLessThanOrEqual(metrics.x+metrics.width+1);}}
  15 |  for(let i=0;i<3;i++){await page.keyboard.press('Shift+Tab');await page.waitForTimeout(150);focusLog.push({...await captureFocus(),key:'Shift+Tab'});}
  16 |  await writeFile(info.outputPath(label+'.focus.json'),JSON.stringify(focusLog,null,2));
  17 | }
  18 | for(const width of [1440,360]){
  19 |  test(`Files ACL pending unknown review at ${width}`,async({page},info)=>{
  20 |   await page.setViewportSize({width,height:width===360?800:1040});const unexpected=await installFixtures(page);const hold=held();let writes=0;let review=false;
  21 |   const members=[{id:'viewer-a',email:'alexandria.long@example.test',firstName:'Alexandria',lastName:'Montgomery-Washington'},{id:'viewer-b',email:'christopher@example.test',firstName:'Christopher',lastName:'Anderson'}];
  22 |   await page.route('**/core/client-account-owners/options',r=>json(r,members));await page.route('**/engagement/attachments?**',r=>json(r,[file]));
  23 |   await page.route(`**/files/${file.id}/access`,async r=>{if(r.request().method()==='GET')return json(r,review?{...file,viewerMode:'restricted',viewerUserIds:members.map(m=>m.id)}:file);writes++;await hold.promise;return json(r,file);});
  24 |   await page.goto(`/portfolio/${clientId}/files`);await page.getByRole('button',{name:`Actions for ${file.fileName}`}).click();await page.getByRole('menuitem',{name:'Manage access',exact:true}).click();const d=page.getByRole('dialog',{name:`Access: ${file.fileName}`});await d.getByRole('radio',{name:'Specific people'}).check();await d.getByRole('button',{name:'Save access'}).click();await expect.poll(()=>writes).toBe(1);
  25 |   await inspect(page,d,info,'files-access-pending');await page.keyboard.press('Escape');await expect(d).toBeVisible();hold.release();await expect(d.getByText(/save outcome is unknown/)).toBeVisible();await expect(d.getByRole('button',{name:'Save access'})).toBeDisabled();await inspect(page,d,info,'files-access-unknown');review=true;
  26 |   await d.getByRole('button',{name:'Review current file'}).focus();await page.keyboard.press('Enter');await expect(d.getByText(/Current selected viewers/)).toBeVisible();await expect(d.getByRole('button',{name:'Save access'})).toBeEnabled();await inspect(page,d,info,'files-access-reviewed');await page.keyboard.press('Escape');await expect(d).toHaveCount(0);expect(writes).toBe(1);expect(unexpected).toEqual([]);
  27 |  });
  28 |  test(`Files folder unknown review at ${width}`,async({page},info)=>{
> 29 |   await page.setViewportSize({width,height:width===360?800:1040});const unexpected=await installFixtures(page);await page.route('**/engagement/attachments?**',r=>json(r,[file]));await page.route(`**/files/${file.id}/access`,r=>json(r,file));await page.route(`**/files/${file.id}/folder`,r=>json(r,file));await page.goto(`/portfolio/${clientId}/files`);await page.getByRole('checkbox',{name:`Select ${file.fileName}`}).check();await page.getByRole('button',{name:'New folder',exact:true}).click();const d=page.getByRole('dialog',{name:'New folder',exact:true});await d.getByLabel('Folder name').fill('Quarterly reports and supporting evidence');await d.getByRole('button',{name:'Create folder & move file'}).click();await expect(d.getByText(/save outcome is unknown/)).toBeVisible();await inspect(page,d,info,'files-folder-unknown');await d.getByRole('button',{name:'Review current file'}).focus();await page.keyboard.press('Enter');await expect(d.getByText('Current saved folder: Reports')).toBeVisible();await inspect(page,d,info,'files-folder-reviewed');await page.keyboard.press('Escape');await expect(d).toHaveCount(0);expect(unexpected).toEqual([]);
     |                                                                                                                                                                                                                                                                                                                            ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5191/portfolio/10000000-0000-4000-8000-000000000001/files
  30 |  });
  31 |  test(`Meeting pending unknown at ${width}`,async({page},info)=>{
  32 |   await page.setViewportSize({width,height:width===360?800:1040});const unexpected=await installFixtures(page);const hold=held();let writes=0;await page.route('**/core/engagement/meetings/meeting-one',async r=>{writes++;await hold.promise;return json(r,{...meeting,id:'foreign'});});await page.goto('/calendar-meeting-receipts.html');const d=page.getByRole('dialog',{name:'Edit meeting'});await d.getByRole('button',{name:'Save meeting'}).click();await expect.poll(()=>writes).toBe(1);await expect(d.getByLabel('Subject',{exact:true})).toHaveAttribute('readonly','');await inspect(page,d,info,'meeting-pending');await page.keyboard.press('Escape');await expect(d).toBeVisible();hold.release();await expect(d.getByText(/may have completed/)).toBeVisible();await inspect(page,d,info,'meeting-unknown');await expect(d.getByRole('button',{name:'Save meeting'})).toBeDisabled();expect(writes).toBe(1);expect(unexpected).toEqual([]);
  33 |  });
  34 |  for(const kind of ['notes','debriefs'])test(`Calendar ${kind} pending unknown at ${width}`,async({page},info)=>{
  35 |   await page.setViewportSize({width,height:width===360?800:1040});const unexpected=await installFixtures(page);const hold=held();let writes=0;const singular=kind==='notes'?'note':'debrief';await page.route('**/core/engagement/meetings/**',async r=>{if(r.request().method()==='GET')return json(r,r.request().url().endsWith('/'+kind)?[]:meeting);writes++;await hold.promise;return json(r,{});});await page.goto('/calendar-artifact-receipts.html?kind='+kind);await page.getByRole('button',{name:'Add '+singular,exact:true}).click();const d=page.getByRole('dialog',{name:'Add '+singular});await d.getByLabel('Content',{exact:true}).fill('Synthetic reviewed meeting draft. Preserve the full content while the response is pending or uncertain.');await d.getByRole('button',{name:'Save '+singular}).click();await expect.poll(()=>writes).toBe(1);await expect(d.getByLabel('Content',{exact:true})).toHaveAttribute('readonly','');await inspect(page,d,info,kind+'-pending');await page.keyboard.press('Escape');await expect(d).toBeVisible();hold.release();await expect(d.getByText(/may have completed/)).toBeVisible();await inspect(page,d,info,kind+'-unknown');await expect(d.getByRole('button',{name:'Save '+singular})).toBeDisabled();await page.keyboard.press('Escape');await expect(d).toHaveCount(0);expect(writes).toBe(1);expect(unexpected).toEqual([]);
  36 |  });
  37 | }
  38 | 
```