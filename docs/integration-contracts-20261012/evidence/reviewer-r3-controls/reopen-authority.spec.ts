import {test,expect} from '@playwright/test';
import {retainedCommand,expectRetained} from '/workspace/review-pr9/r3/source/apps/web/tests/browser/activity-command-recovery-fixtures';
import {commandClientId} from '/workspace/review-pr9/r3/source/apps/web/tests/activity-command-fixtures';
import {json} from '/workspace/review-pr9/r3/source/apps/web/tests/browser/fixtures';
test('a continuously mounted Quick log hides its retained body until reopened fresh authority completes',async({page},info)=>{
 const saved=await retainedCommand(page);
 await page.goto(`/portfolio/${commandClientId}?log=1`);
 await expectRetained(page,saved.original.requestId);
 await page.getByRole('dialog',{name:'Quick log',exact:true}).getByRole('button',{name:'Close',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Quick log',exact:true})).toHaveCount(0);
 let reads=0,release!:()=>void;
 const held=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/backend/core/me',async route=>{reads++;await held;return json(route,saved.state.identity).catch(()=>{});});
 try{
  await page.getByRole('link',{name:'Quick log',exact:true}).click();
  await expect.poll(()=>reads).toBeGreaterThan(0);
  expect(saved.posts()).toHaveLength(1);
  await page.screenshot({path:info.outputPath('reopened-before-current-authority.png')});
  await expect(page.getByLabel('Title',{exact:true})).toHaveCount(0);
  await expect(page.getByText(saved.original.requestId,{exact:true})).toHaveCount(0);
 }finally{release();}
});
