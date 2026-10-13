import {test,expect} from "/workspace/capiro-newsletter-port/node_modules/@playwright/test/index.mjs";
import {documentFixture,button,heldResponse} from "/workspace/capiro-newsletter-port/apps/web/test/browser/newsletter-document-fixtures.ts";
import fs from 'node:fs';
test('inspect actual browser history after rich document adoption', async ({page},info)=>{
 const fixture=await documentFixture(page), cdp=await page.context().newCDPSession(page), records=[], navigations=[];
 page.on('framenavigated',frame=>navigations.push({url:frame.url(),main:frame===page.mainFrame()}));
 const capture=async(label)=>{const history=await cdp.send('Page.getNavigationHistory');records.push({label,url:page.url(),history});return history};
 await page.goto('/modules/workspace');await capture('workspace');
 await button(page,'Rich newsletter preview').click();await capture('editor');
 await button(page,'Load saved newsletters').click();await button(page,'Review Synthetic saved newsletter').click();
 await expect(page.getByRole('region',{name:'Review current saved newsletter'})).toBeVisible();await capture('review');
 await button(page,'Adopt saved document and replace local draft').click();await expect(page.getByLabel('Newsletter name')).toHaveValue('Synthetic saved newsletter');await capture('adopt');
 const held=heldResponse();fixture.queue('stage',async route=>{await held.wait;await route.fulfill({status:503,json:{message:'Synthetic refused'}});held.finished()});
 await button(page,'Stage newsletter').click();await expect(page.getByText('stage in progress…',{exact:true})).toBeVisible();
 await expect.poll(()=>fixture.calls('stage').length).toBe(1); const before=await capture('pending stage');
 try { await page.evaluate(()=>history.back()); await expect.poll(async()=>(await cdp.send('Page.getNavigationHistory')).currentIndex).toBe(before.currentIndex-1); await capture('after native Back'); }
 finally {const proof={records,navigations};fs.writeFileSync("/tmp/capiro-newsletter-lifecycle-browser-20261013/history-inspection.json",JSON.stringify(proof,null,2));await info.attach('history-inspection',{body:JSON.stringify(proof,null,2),contentType:'application/json'});held.release();await held.settled;}
});
