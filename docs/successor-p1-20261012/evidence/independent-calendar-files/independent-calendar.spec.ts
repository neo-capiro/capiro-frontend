import { test, expect } from "/workspace/capiro-p1-calendar/node_modules/@playwright/test/index.mjs";
import { installFixtures, json } from "/workspace/capiro-p1-calendar/apps/web/tests/browser/fixtures";
import { writeFile } from "node:fs/promises";
const meeting = { id:"meeting-one",subject:"Synthetic meeting",description:null,location:"Old location",startsAt:"2026-10-10T14:00:00Z",endsAt:"2026-10-10T15:00:00Z",status:"scheduled",joinLink:null,visibility:"private",isVirtual:false,meri:null,client:{id:"client-one",name:"Synthetic"},attendees:[],preps:[] };
test("a matching earlier meeting receipt cannot discard an editable newer draft", async ({page},info) => {
 await installFixtures(page);
 let release!:()=>void, started!:()=>void;
 const held = new Promise<void>(r=>release=r); const received = new Promise<void>(r=>started=r);
 let body:any; let writes=0;
 await page.route("**/core/engagement/meetings/meeting-one",async route=>{
   body=route.request().postDataJSON();writes++;started();await held;await json(route,meeting).catch(()=>{});
 });
 await page.goto("/calendar-meeting-receipts.html");
 await page.getByRole("button",{name:"Save meeting"}).click(); await received;
 const subject=page.getByLabel("Subject",{exact:true});
 const editable=await subject.isEditable();
 if(editable) await subject.fill("Newer unsubmitted meeting draft");
 await page.screenshot({path:info.outputPath("pending-draft.png")});
 release();
 if(editable) {
   await expect(page.getByRole("button",{name:"Saving…"})).toHaveCount(0);
   await writeFile(info.outputPath("draft-observation.json"),JSON.stringify({editable,writes,body,dialogs:await page.getByRole("dialog").count(),currentSubject:await subject.count()?await subject.inputValue():null},null,2));
   await expect(subject).toHaveValue("Newer unsubmitted meeting draft",{timeout:1000});
 } else {
   await expect(page.getByRole("dialog")).toHaveCount(0);
   expect(body.subject).toBe("Synthetic meeting");expect(writes).toBe(1);
 }
});
