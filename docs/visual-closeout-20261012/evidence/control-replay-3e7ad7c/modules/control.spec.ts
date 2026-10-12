import {test,expect} from '@playwright/test';
import {onlyLocalRequests,operationFixtures} from '/workspace/capiro-visual-closeout/apps/web/test/browser/fixtures';
import {moduleRouteFixtures} from '/workspace/capiro-visual-closeout/apps/web/test/browser/module-route-fixtures';
test('VD06 Modules Calendar uses its compact authored shell',async({page},info)=>{
 await onlyLocalRequests(page);await operationFixtures(page,moduleRouteFixtures);await page.goto('/modules/calendar');await page.getByRole('button',{name:'Agenda',exact:true}).click();
 await page.screenshot({path:info.outputPath('calendar-before.png')});
 const card=page.getByRole('table').locator('..');const bounds=await page.getByRole('heading',{name:'Master calendar',exact:true}).boundingBox();
 expect(bounds!.x).toBe(264);expect(bounds!.y).toBeLessThan(150);
 const toolbar=await page.getByRole('button',{name:'Today',exact:true}).boundingBox();expect(toolbar!.y).toBeLessThan(220);
});
