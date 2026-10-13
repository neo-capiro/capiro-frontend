from pathlib import Path
root=Path('/workspace/capiro-visual-closeout');out=Path('/tmp/capiro-visual-closeout')
portfolio='''import { expect, test } from "@playwright/test";
import { installFixtures, clientId } from "ROOT/apps/web/tests/browser/fixtures";
import { installProfileCurrentState } from "ROOT/apps/web/tests/browser/profile-current-state-fixtures";
import { installCapabilityPresentation } from "ROOT/apps/web/tests/browser/capability-presentation-fixtures";
test("VD01 dedicated Owners dialog presents ordered cards",async({page},info)=>{
 await installProfileCurrentState(page);await page.goto('/profile-current-state.html?mode=team');
 await page.screenshot({path:info.outputPath('owners-before.png')});
 await page.getByRole('button',{name:'Manage owners',exact:true}).click({timeout:2000});
 await expect(page.getByRole('dialog',{name:'Owners',exact:true})).toBeVisible();
 await expect(page.getByRole('list',{name:'Ordered account owners'})).toBeVisible();
});
test("VD02 unavailable ordering never promises drag or saved layout",async({page},info)=>{
 await installFixtures(page);await page.goto('/portfolio');
 await expect(page.getByText('Saved profile ordering is unavailable',{exact:false})).toBeVisible();
 await page.screenshot({path:info.outputPath('index-unavailable-before.png')});
 await expect(page.getByText('Drag any card to rearrange · your layout is saved to your profile',{exact:true})).toHaveCount(0);
});
test("VD03 Portfolio title toolbar contains Owner and Customize",async({page},info)=>{
 await installFixtures(page);await page.goto('/portfolio');await page.screenshot({path:info.outputPath('index-before.png')});
 const header=page.locator('header').filter({has:page.getByRole('heading',{name:/Portfolio/})});
 await expect(header.getByRole('button',{name:'Customize',exact:true})).toBeVisible();
 await expect(header.getByLabel('Account owner',{exact:true})).toBeVisible();
});
test("VD04 capability create marks required name and retains editable choices",async({page},info)=>{
 await installCapabilityPresentation(page);await page.goto(`/portfolio/${clientId}/capabilities`);await page.getByRole('button',{name:'Add capability',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'New capability'});await page.screenshot({path:info.outputPath('capability-before.png')});
 await expect(dialog.locator('label').filter({has:dialog.locator('input[name=name]')})).toContainText('*');
 await expect(dialog.getByLabel('Type',{exact:true})).toHaveAttribute('list',/.+/);
 await expect(dialog.getByLabel('Sector',{exact:true})).toHaveAttribute('list',/.+/);
});
test("VD05 Bill Tracker has compact heading and an inner results frame",async({page},info)=>{
 await installFixtures(page);await page.goto(`/portfolio/${clientId}/bills`);await page.screenshot({path:info.outputPath('bills-before.png')});
 await expect(page.getByRole('heading',{name:'Bill Tracker',exact:true})).toHaveCSS('font-size','20px');
 await expect(page.getByRole('region',{name:'Tracked bill results',exact:true})).toBeVisible();
});
test("VD07 Portfolio modal scrim does not blur the underlying page",async({page},info)=>{
 await installCapabilityPresentation(page);await page.goto(`/portfolio/${clientId}/capabilities`);await page.getByRole('button',{name:'Add capability',exact:true}).click();
 await page.screenshot({path:info.outputPath('scrim-before.png')});
 await expect(page.locator('[data-slot=dialog-overlay]')).toHaveCSS('backdrop-filter','none');
});
'''.replace('ROOT',str(root))
modules='''import {test,expect} from '@playwright/test';
import {onlyLocalRequests,operationFixtures} from 'ROOT/apps/web/test/browser/fixtures';
import {moduleRouteFixtures} from 'ROOT/apps/web/test/browser/module-route-fixtures';
test('VD06 Modules Calendar uses its compact authored shell',async({page},info)=>{
 await onlyLocalRequests(page);await operationFixtures(page,moduleRouteFixtures);await page.goto('/modules/calendar');await page.getByRole('button',{name:'Agenda',exact:true}).click();
 await page.screenshot({path:info.outputPath('calendar-before.png')});
 const card=page.getByRole('table').locator('..');const bounds=await page.getByRole('heading',{name:'Master calendar',exact:true}).boundingBox();
 expect(bounds!.x).toBe(264);expect(bounds!.y).toBeLessThan(150);
 const toolbar=await page.getByRole('button',{name:'Today',exact:true}).boundingBox();expect(toolbar!.y).toBeLessThan(220);
});
'''.replace('ROOT',str(root))
for name,text in [('portfolio',portfolio),('modules',modules)]:
 p=out/name;p.mkdir();(p/'control.spec.ts').write_text(text)
 base=root/('apps/web/playwright.config.ts' if name=='portfolio' else 'apps/web/test/browser/playwright.config.ts')
 command=f'"{__import__("sys").executable}"' # shell command is set below using Node explicitly
 server=root/('apps/web/tests/browser/server.mjs' if name=='portfolio' else 'apps/web/test/browser/server.mjs')
 config=f'''import base from "{base}";\nimport {{defineConfig}} from "@playwright/test";\nexport default defineConfig({{...base,testDir:"{p}",outputDir:"{p}/artifacts",reporter:[["list"],["json",{{outputFile:"{p}/results.json"}}]],webServer:{{...base.webServer,command:`"${{process.execPath}}" "{server}"`}}}});\n'''
 (p/'playwright.config.ts').write_text(config)
