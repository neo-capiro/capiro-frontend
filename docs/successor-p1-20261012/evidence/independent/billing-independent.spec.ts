import {test,expect} from '/workspace/capiro-p1-billing/node_modules/@playwright/test/index.mjs';
import {onlyLocalRequests,operationFixtures} from '/workspace/capiro-p1-billing/apps/web/test/browser/fixtures';
import {settingsFixtures} from '/workspace/capiro-p1-billing/apps/web/test/browser/settings-fixtures';
const portal='https://billing.stripe.com/p/session/independent-synthetic';
async function setup(page:any) {
  await onlyLocalRequests(page);
  const writes:string[]=[];
  await operationFixtures(page,{...settingsFixtures,'settings.billing.portal':()=>{writes.push('portal');return {url:portal};},'settings.billing.checkout':()=>{writes.push('checkout');return {url:'https://checkout.stripe.com/c/pay/independent-synthetic'};}});
  await page.route(portal,route=>route.fulfill({contentType:'text/html',body:'Synthetic portal receipt only'}));
  await page.goto('/settings/billing');
  await expect(page.getByRole('heading',{name:'Your plan'})).toBeVisible();
  return writes;
}

test('fresh current billing denial prevents existing-subscriber portal dispatch',async({page},info)=>{
  const writes=await setup(page);
  await page.route('**/api/capiro/settings.billing.state?*',route=>route.fulfill({status:403,json:{message:'Current billing authority denied'}}));
  await page.getByRole('button',{name:'Add profiles',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Current billing authority denied');
  expect(writes).toEqual([]);
  await expect(page).toHaveURL(/\/settings\/billing$/);
  await page.screenshot({path:info.outputPath('billing-current-denial.png')});
});

test('organization replacement during held preflight cannot dispatch former portal action',async({page},info)=>{
  const writes=await setup(page);
  let release!:()=>void;
  const gate=new Promise<void>(r=>release=r);
  let entered=0;
  await page.route('**/api/capiro/settings.billing.summary?*',async route=>{entered++;await gate;await route.fulfill({json:settingsFixtures['settings.billing.summary']});});
  await page.getByRole('button',{name:'Add profiles',exact:true}).click();
  await expect.poll(()=>entered).toBe(1);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('test:session',{detail:{orgId:'independent-replacement-org',sessionId:'independent-replacement-session'}})));
  await expect.poll(()=>entered).toBeGreaterThan(1);
  release();
  await expect(page.getByRole('heading',{name:'Your plan'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Add profiles',exact:true})).toBeEnabled();
  expect(writes).toEqual([]);
  await expect(page).toHaveURL(/\/settings\/billing$/);
  await page.screenshot({path:info.outputPath('billing-replaced-preflight.png')});
});

test('existing canceled subscription uses portal and never manufactures a replacement subscription',async({page},info)=>{
  await onlyLocalRequests(page);
  const writes:string[]=[];
  await operationFixtures(page,{...settingsFixtures,'settings.billing.state':{...settingsFixtures['settings.billing.state'],status:'canceled'},'settings.billing.summary':{...settingsFixtures['settings.billing.summary'],status:'canceled',hasSubscription:true},'settings.billing.portal':()=>{writes.push('portal');return {url:portal};},'settings.billing.checkout':()=>{writes.push('checkout');return {url:'https://checkout.stripe.com/c/pay/independent-synthetic'};}});
  await page.route(portal,route=>route.fulfill({contentType:'text/html',body:'Synthetic portal receipt only'}));
  await page.goto('/settings/billing');
  await expect(page.getByText('Review profile capacity and available plan changes in the billing portal.')).toBeVisible();
  await page.getByRole('button',{name:'Add profiles',exact:true}).click();
  await expect(page).toHaveURL(portal);
  expect(writes).toEqual(['portal']);
  await page.screenshot({path:info.outputPath('billing-canceled-hosted.png')});
});
