# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control.spec.ts >> No client in an existing meeting submits and verifies an explicit association clear
- Location: ../../../../tmp/capiro-parent-client-clear-red-09aa0ab/control.spec.ts:4:1

# Error details

```
Error: expect(received).toHaveProperty(path, value)

Expected path: "clientId"
Received path: []

Expected value: null
Received value: {"description": "", "endsAt": "2026-10-01T15:00:00Z", "location": "Meeting room", "startsAt": "2026-10-01T14:00:00Z", "subject": "Synthetic association clear"}
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
          - /url: /portfolio?log=1
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
        - generic:
          - link:
            - /url: /settings
            - text: Settings
      - main:
        - generic:
          - generic:
            - generic:
              - paragraph: Your accessible calendar
              - heading [level=1]: Master Calendar
            - generic:
              - button: Meeting library
              - button: Sync calendar
              - button:
                - img
                - text: New meeting
          - generic:
            - combobox
            - button:
              - img
            - button: Today
            - button:
              - img
            - textbox: 2026-10-01
            - combobox
            - combobox
          - generic:
            - textbox:
              - /placeholder: Search events…
            - button [pressed]: Meeting
            - button [pressed]: Hearing
            - button [pressed]: Planner
            - button [pressed]: Deadline
            - button [pressed]: Government
            - generic: Government forecasts unavailable
            - button: Clear filters
          - generic:
            - generic:
              - status: Deadline source currently returns at most 50 upcoming records within the next 30 days. It cannot establish a complete historical or extended calendar.
            - generic:
              - status: "Government effective dates: local publisher metadata only; coverage is incomplete. 0 records loaded from 0 candidates; 0 excluded on loaded pages. Catalog 0 RULE records; 0 without evidence and 0 unsupported. As of 2026-10-08T12:00:00.000Z; observations must be within 48 hours. Continued refresh required. Full Dates text, separate corrections and forecasts remain unavailable. An empty result does not mean no rule takes effect."
              - status: "Latest ingestion: unavailable. Historical refresh: unavailable."
          - paragraph: Master view includes meetings allowed by your calendar ownership and explicit client sharing. It does not grant access to teammates' private calendars.
          - generic:
            - generic:
              - heading [level=2]:
                - time: 2026-10-01
              - article:
                - generic: Meeting
                - generic:
                  - heading [level=3]:
                    - button: Synthetic association clear
                  - generic: Oct 1, 2:00 PM UTC · scheduled
                  - generic: Your accessible meetings
  - dialog "Synthetic association clear" [ref=e2]:
    - banner [ref=e3]:
      - heading "Synthetic association clear" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Synthetic association clear
    - generic [ref=e10]:
      - generic [ref=e11]: private
      - generic [ref=e12]: Test Aerospace
    - navigation "Meeting sections" [ref=e13]:
      - button "Information" [pressed] [ref=e14] [cursor=pointer]
      - button "Preparation" [ref=e15] [cursor=pointer]
      - button "Notes" [ref=e16] [cursor=pointer]
      - button "Debriefs" [ref=e17] [cursor=pointer]
    - generic [ref=e18]:
      - paragraph [ref=e19]: Oct 1, 2:00 PM UTC – Oct 1, 3:00 PM UTC
      - paragraph [ref=e20]:
        - img [ref=e21]
        - text: Meeting room
      - region "Meri meeting attendance" [ref=e24]:
        - heading "Meri attendance" [level=3] [ref=e25]
        - status [ref=e26]: No Meri attendance requested
        - generic [ref=e27]:
          - button "Send Meri to take notes" [disabled] [ref=e28]
          - button "Refresh Meri status" [ref=e29] [cursor=pointer]
        - paragraph [ref=e30]: Attendance actions are disabled in this environment. Existing status remains visible.
      - paragraph [ref=e31]: No description.
      - heading "Attendees" [level=3] [ref=e32]:
        - img [ref=e33]
        - text: Attendees
      - list
      - button "Edit meeting" [active] [ref=e38] [cursor=pointer]
      - button "Client assignment" [ref=e39] [cursor=pointer]
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {writeFileSync} from 'node:fs';
  3  | import {installFixtures,json,clientId,client} from "/workspace/capiro-p1-successor/apps/web/tests/browser/fixtures";
  4  | test('No client in an existing meeting submits and verifies an explicit association clear',async({page},info)=>{
  5  |  const unexpected=await installFixtures(page);
  6  |  const id='90000000-0000-4000-8000-000000000009';
  7  |  const original={id,subject:'Synthetic association clear',description:null,location:'Meeting room',startsAt:'2026-10-01T14:00:00Z',endsAt:'2026-10-01T15:00:00Z',status:'scheduled',joinLink:null,visibility:'private',isVirtual:false,meri:null,client:{id:clientId,name:client.name},attendees:[],preps:[]};
  8  |  let body:Record<string,unknown>|undefined;let returned=original;let writes=0;
  9  |  await page.route('**/core/engagement/meetings**',route=>{
  10 |   const path=new URL(route.request().url()).pathname;
  11 |   if(path.endsWith('/notetaker'))return json(route,null);
  12 |   if(path.endsWith('/meetings'))return json(route,[original]);
  13 |   if(path.endsWith(id)){
  14 |    if(route.request().method()==='GET')return json(route,returned);
  15 |    writes++;body=route.request().postDataJSON();
  16 |    // Match native update semantics: only an explicit clientId key changes association.
  17 |    returned={...original,...body,description:String(body!.description??'').trim()||null,location:String(body!.location??'').trim()||null,client:body!.clientId===null?null:original.client} as typeof original;
  18 |    return json(route,returned);
  19 |   }
  20 |   return route.fallback();
  21 |  });
  22 |  await page.goto(`/calendar?view=agenda&date=2026-10-01&zone=UTC&meeting=${id}`);
  23 |  await page.getByRole('button',{name:'Edit meeting',exact:true}).click();
  24 |  const editor=page.getByRole('dialog',{name:'Edit meeting',exact:true});
  25 |  const selection=editor.getByRole('combobox',{name:'Client',exact:true});
  26 |  await expect(selection).toHaveValue(clientId);await selection.selectOption('');
  27 |  await expect(selection).toHaveValue('');await editor.getByRole('button',{name:'Save meeting',exact:true}).click();
  28 |  await expect.poll(()=>writes).toBe(1);
  29 |  await expect(editor).toHaveCount(0);
  30 |  writeFileSync(info.outputPath('client-clear-observation.json'),JSON.stringify({requestedUiClient:null,body,returnedClient:returned.client,editorClosed:true,writes,unexpected},null,2));
  31 |  await page.screenshot({path:info.outputPath('client-clear-after.png'),fullPage:true});
> 32 |  expect(unexpected).toEqual([]);expect(body).toHaveProperty('clientId',null);
     |                                              ^ Error: expect(received).toHaveProperty(path, value)
  33 |  expect(returned.client).toBeNull();
  34 | });
  35 | 
```