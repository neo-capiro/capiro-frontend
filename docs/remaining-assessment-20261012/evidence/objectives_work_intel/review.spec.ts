import { test,expect } from '/workspace/capiro-acceptance-assessment/node_modules/@playwright/test/index.mjs';
import { installFixtures,json,clientId,objective,objectiveId } from '/workspace/capiro-acceptance-assessment/apps/web/tests/browser/fixtures';
import { installCapabilityPresentation,openPresentedCapability } from '/workspace/capiro-acceptance-assessment/apps/web/tests/browser/capability-presentation-fixtures';
import { installRegistrationBoundary,openRegistrations } from '/workspace/capiro-acceptance-assessment/apps/web/tests/browser/capability-registration-fixtures';
import { installDocumentFixtures,openDocuments } from '/workspace/capiro-acceptance-assessment/apps/web/tests/browser/capability-documents-fixtures';
import { installWorkFixtures } from '/workspace/capiro-acceptance-assessment/apps/web/tests/browser/work-boundary-fixtures';

test('remaining capability and opportunity visual facets',async({page},info)=>{
 await installCapabilityPresentation(page);
 const editor=await openPresentedCapability(page);
 await page.screenshot({path:info.outputPath('capability-profile.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:info.outputPath('capability-profile-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1040});
 await page.goto(`/portfolio/${clientId}/opportunities`);
 await expect(page.getByRole('link',{name:'Test opportunity',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('opportunities.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:info.outputPath('opportunities-mobile.png'),fullPage:true});
});
test('remaining capability documents and registrations visual facets',async({page},info)=>{
 await installDocumentFixtures(page);await openDocuments(page);
 await page.screenshot({path:info.outputPath('documents.png'),fullPage:true});
 await installRegistrationBoundary(page);await openRegistrations(page);
 await page.screenshot({path:info.outputPath('registrations.png'),fullPage:true});
});
test('work owner and upcoming status source facts',async({page},info)=>{
 const {state}=await installWorkFixtures(page);
 state.details[Object.keys(state.details)[0]].nodes[0].ownerUserId='user-test';
 await page.goto(`/portfolio/${clientId}/work`);
 await expect(page.getByText('Synthetic first upcoming step').first()).toBeVisible();
 await page.screenshot({path:info.outputPath('work-owners.png'),fullPage:true});
 await info.attach('rendered-work',{body:await page.locator('body').innerText(),contentType:'text/plain'});
});
test('objective current list after denied stale remount',async({page},info)=>{
 await installFixtures(page);let reads=0;
 await page.route(`**/core/clients/${clientId}/objectives`,route=>{reads++;return reads===1?json(route,[objective]):json(route,{message:'Synthetic Objective access revoked'},403);});
 await page.clock.install();
 await page.goto(`/portfolio/${clientId}/objectives`);
 await expect(page.getByRole('button',{name:'Test outcome',exact:true})).toBeVisible();
 await page.clock.fastForward(31000);
 await page.getByRole('link',{name:'Capabilities',exact:true}).click();
 await page.getByRole('link',{name:'Objectives',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('permission');
 await expect(page.getByRole('button',{name:'Test outcome',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('objective-denied-stale-list.png'),fullPage:true});
 await page.getByRole('button',{name:'Test outcome',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Edit objective'})).toBeVisible();
 await info.attach('objective-denied-state',{body:JSON.stringify({reads,body:await page.locator('body').innerText()}),contentType:'application/json'});
 await page.screenshot({path:info.outputPath('objective-denied-stale-editor.png'),fullPage:true});
});
