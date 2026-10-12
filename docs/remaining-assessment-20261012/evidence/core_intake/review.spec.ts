import { test, expect } from '/workspace/capiro-acceptance-assessment/node_modules/@playwright/test';
import { client, clientId, installFixtures, json } from '/workspace/capiro-acceptance-assessment/apps/web/tests/browser/fixtures';

test('observe view switcher search and G shortcuts against Figma 411:47736', async ({page}, info) => {
  const unexpected = await installFixtures(page);
  await page.goto(`/portfolio/${clientId}`);
  await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
  await page.keyboard.press('Control+j');
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem')).toHaveCount(9);
  await expect(menu.getByRole('textbox')).toHaveCount(0);
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:info.outputPath('view-switcher.png'),fullPage:true});
  await page.keyboard.press('Escape');
  await page.keyboard.press('g');
  await page.keyboard.press('c');
  await page.waitForTimeout(200);
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}$`));
  await page.getByRole('button',{name:'Switch client view: Overview',exact:true}).click();
  await page.getByRole('menuitem',{name:'Calendar',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}/calendar$`));
  expect(unexpected).toEqual([]);
});

test('observe saved profile fields unavailable to standard-user read path', async ({page}, info) => {
  const unexpected = await installFixtures(page);
  const saved = {...client, sectorTag:'HOMELAND_SECURITY', primaryContactName:'Casey Contact',primaryContactEmail:'casey@example.test',primaryContactPhone:'202-555-0117',cageCode:'7K4P2',uei:'ABC123DEF456',intakeData:{city:'Costa Mesa',state:'CA',samStatus:'Active',samExpirationDate:'2027-06-14',ein:'12-3456789',engagementStartDate:'2026-09-01'}};
  await page.route(`**/api/backend/core/clients/${clientId}`,route=>json(route,saved));
  await page.route('**/api/backend/core/me',route=>json(route,{user:{id:'user-test',email:'test@example.test',firstName:'Test',lastName:'User'},tenant:{id:'tenant-test',name:'Test tenant'},role:'standard_user'}));
  await page.goto(`/portfolio/${clientId}`);
  await expect(page.getByRole('heading',{name:'Test Aerospace',exact:true})).toBeVisible();
  await expect(page.getByText('HOMELAND_SECURITY',{exact:false})).toBeVisible();
  for(const value of ['Costa Mesa','Casey Contact','casey@example.test','202-555-0117','7K4P2','ABC123DEF456']) await expect(page.getByText(value,{exact:false})).toHaveCount(0);
  await expect(page.getByText('Government info',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'More actions for Test Aerospace'}).click();
  await expect(page.getByRole('menuitem',{name:'Edit client profile',exact:true})).toHaveAttribute('data-disabled','');
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:info.outputPath('profile-standard-user.png'),fullPage:true});
  expect(unexpected).toEqual([]);
});
