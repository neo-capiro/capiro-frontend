# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: independent-calendar.spec.ts >> a matching earlier meeting receipt cannot discard an editable newer draft
- Location: ../../tmp/capiro-p1-calendar-files-review/independent-calendar.spec.ts:5:5

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByLabel('Subject', { exact: true })
Expected: "Newer unsubmitted meeting draft"
Timeout: 1000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" with timeout 1000ms
  - waiting for getByLabel('Subject', { exact: true })

```

```yaml
- main:
  - heading "Synthetic meeting receipt review" [level=1]
```

# Test source

```ts
  1  | import { test, expect } from "/workspace/capiro-p1-calendar/node_modules/@playwright/test/index.mjs";
  2  | import { installFixtures, json } from "/workspace/capiro-p1-calendar/apps/web/tests/browser/fixtures";
  3  | import { writeFile } from "node:fs/promises";
  4  | const meeting = { id:"meeting-one",subject:"Synthetic meeting",description:null,location:"Old location",startsAt:"2026-10-10T14:00:00Z",endsAt:"2026-10-10T15:00:00Z",status:"scheduled",joinLink:null,visibility:"private",isVirtual:false,meri:null,client:{id:"client-one",name:"Synthetic"},attendees:[],preps:[] };
  5  | test("a matching earlier meeting receipt cannot discard an editable newer draft", async ({page},info) => {
  6  |  await installFixtures(page);
  7  |  let release!:()=>void, started!:()=>void;
  8  |  const held = new Promise<void>(r=>release=r); const received = new Promise<void>(r=>started=r);
  9  |  let body:any; let writes=0;
  10 |  await page.route("**/core/engagement/meetings/meeting-one",async route=>{
  11 |    body=route.request().postDataJSON();writes++;started();await held;await json(route,meeting).catch(()=>{});
  12 |  });
  13 |  await page.goto("/calendar-meeting-receipts.html");
  14 |  await page.getByRole("button",{name:"Save meeting"}).click(); await received;
  15 |  const subject=page.getByLabel("Subject",{exact:true});
  16 |  const editable=await subject.isEditable();
  17 |  if(editable) await subject.fill("Newer unsubmitted meeting draft");
  18 |  await page.screenshot({path:info.outputPath("pending-draft.png")});
  19 |  release();
  20 |  if(editable) {
  21 |    await expect(page.getByRole("button",{name:"Saving…"})).toHaveCount(0);
  22 |    await writeFile(info.outputPath("draft-observation.json"),JSON.stringify({editable,writes,body,dialogs:await page.getByRole("dialog").count(),currentSubject:await subject.count()?await subject.inputValue():null},null,2));
> 23 |    await expect(subject).toHaveValue("Newer unsubmitted meeting draft",{timeout:1000});
     |                          ^ Error: expect(locator).toHaveValue(expected) failed
  24 |  } else {
  25 |    await expect(page.getByRole("dialog")).toHaveCount(0);
  26 |    expect(body.subject).toBe("Synthetic meeting");expect(writes).toBe(1);
  27 |  }
  28 | });
  29 | 
```