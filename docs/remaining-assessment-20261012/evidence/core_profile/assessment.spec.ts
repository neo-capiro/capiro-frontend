import { test, expect } from "/workspace/capiro-acceptance-assessment/node_modules/@playwright/test";
import { installFixtures, json, clientId, file } from "/workspace/capiro-acceptance-assessment/apps/web/tests/browser/fixtures";
import { installEnrichment } from "/workspace/capiro-acceptance-assessment/apps/web/tests/browser/client-enrichment-fixtures";
import { facility } from "/workspace/capiro-acceptance-assessment/apps/web/tests/facility-map-fixtures";
const base = "/tmp/capiro-remaining-assessment-20261012/core_profile/";
test("capture overview and independent facility form", async ({page})=>{
 await installFixtures(page);
 await page.route(`**/clients/${clientId}/facilities`, r=>json(r,[facility]));
 await page.route(`**/clients/${clientId}/activity*`,r=>json(r,[{id:"80000000-0000-4000-8000-000000000001",title:"Synthetic recorded note",body:"A saved note for visual review.",kind:"note",origin:"recorded",sourceType:null,sourceId:null,occurredAt:"2026-10-11T12:00:00Z",dueAt:null,settledAt:null,pinned:false}]));
 await page.goto(`/portfolio/${clientId}`);
 await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
 await expect(page.getByText("Synthetic recorded note")).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:base+"rendered-overview.png",fullPage:true});
 await page.getByRole("region",{name:"Activity timeline",exact:true}).screenshot({path:base+"rendered-timeline.png"});
 await page.getByRole("button",{name:"Add facility",exact:true}).click();
 await expect(page.getByRole("dialog",{name:"Add facility",exact:true})).toBeVisible();
 await page.screenshot({path:base+"rendered-facility-add.png"});
});
test("capture Files and upload dialog",async({page})=>{
 await installFixtures(page);await page.goto(`/portfolio/${clientId}/files`);
 await expect(page.getByRole("table")).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:base+"rendered-files.png"});
 await page.getByRole("button",{name:"Upload",exact:true}).click();
 await expect(page.getByRole("dialog",{name:"Upload files",exact:true})).toBeVisible();
 await page.screenshot({path:base+"rendered-upload.png"});
});
test("capture enrichment saved review",async({page})=>{
 await installEnrichment(page);await page.goto(`/portfolio/${clientId}`);
 await page.getByRole("button",{name:"Meri actions",exact:true}).click();await page.getByRole("menuitem",{name:"Fill with Meri"}).click();
 await expect(page.getByRole("dialog",{name:"Fill with Meri",exact:true})).toContainText("Saved company description");
 await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:base+"rendered-enrichment.png"});
});
test("DEFECT same-id wrong-folder receipt dismisses requested move",async({page})=>{
 const unexpected=await installFixtures(page);let calls=0;
 await page.route("**/engagement/attachments?**",r=>json(r,[file]));
 await page.route(`**/files/${file.id}/folder`,r=>{calls++;expect(r.request().postDataJSON()).toEqual({folder:"Reviewed destination"});return json(r,file);});
 await page.goto(`/portfolio/${clientId}/files`);await page.getByRole("checkbox",{name:`Select ${file.fileName}`}).check();await page.getByRole("button",{name:"New folder",exact:true}).click();
 const dialog=page.getByRole("dialog",{name:"New folder",exact:true});await dialog.getByLabel("Folder name").fill("Reviewed destination");await dialog.getByRole("button",{name:"Create folder & move file"}).click();
 await expect(dialog).toHaveCount(0);expect(calls).toBe(1);await expect(page.getByRole("cell",{name:"Reports",exact:true})).toBeVisible();await expect(page.getByRole("alert")).toHaveCount(0);expect(unexpected).toEqual([]);
 await page.screenshot({path:base+"defect-wrong-folder-receipt.png"});
});
test("DEFECT same-id wrong-access receipt dismisses requested restriction",async({page})=>{
 const unexpected=await installFixtures(page);let calls=0;
 await page.route("**/engagement/attachments?**",r=>json(r,[file]));
 await page.route(`**/files/${file.id}/access`,r=>{if(r.request().method()==="GET")return json(r,file);calls++;expect(r.request().postDataJSON()).toEqual({viewerMode:"restricted",viewerUserIds:[]});return json(r,file);});
 await page.goto(`/portfolio/${clientId}/files`);await page.getByRole("button",{name:`Actions for ${file.fileName}`}).click();await page.getByRole("menuitem",{name:/access/i}).click();
 const dialog=page.getByRole("dialog");await dialog.getByRole("radio",{name:"Specific people"}).check();await dialog.getByRole("button",{name:"Save access"}).click();
 await expect(dialog).toHaveCount(0);expect(calls).toBe(1);await expect(page.getByRole("alert")).toHaveCount(0);expect(unexpected).toEqual([]);await page.screenshot({path:base+"defect-wrong-access-receipt.png"});
});
test("DEFECT ambiguous delete response permits immediate repeat delete",async({page})=>{
 const unexpected=await installFixtures(page);let calls=0;
 await page.route("**/engagement/attachments?**",r=>json(r,[file]));
 await page.route(`**/engagement/attachments/${file.id}`,r=>{calls++;return json(r,{message:"Synthetic lost completion response"},503);});
 await page.goto(`/portfolio/${clientId}/files`);await page.getByRole("button",{name:`Actions for ${file.fileName}`}).click();await page.getByRole("menuitem",{name:/delete/i}).click();
 const dialog=page.getByRole("dialog",{name:"Delete file",exact:true});await dialog.getByRole("button",{name:"Confirm delete"}).click();await expect(dialog.getByRole("alert")).toContainText("Synthetic lost completion response");
 await expect(dialog.getByRole("button",{name:"Confirm delete"})).toBeEnabled();await dialog.getByRole("button",{name:"Confirm delete"}).click();await expect.poll(()=>calls).toBe(2);expect(unexpected).toEqual([]);await page.screenshot({path:base+"defect-repeat-delete.png"});
});
