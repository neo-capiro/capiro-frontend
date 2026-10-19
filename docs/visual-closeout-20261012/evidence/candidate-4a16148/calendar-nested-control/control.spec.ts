import {test,expect} from '/workspace/capiro-visual-closeout/node_modules/@playwright/test/index.mjs';
import {onlyLocalRequests,operationFixtures} from '/workspace/capiro-visual-closeout/apps/web/test/browser/fixtures';
import {moduleRouteFixtures} from '/workspace/capiro-visual-closeout/apps/web/test/browser/module-route-fixtures';
test('Calendar popup Escape closes only the highest layer and keeps its trigger reachable',async({page})=>{
 await onlyLocalRequests(page);await operationFixtures(page,moduleRouteFixtures);await page.goto('/modules/calendar');
 const disclosure=page.locator('summary').filter({hasText:'Master calendar'});await disclosure.click();
 const switcher=page.getByRole('combobox',{name:'Switch module'});await switcher.click();await expect(page.getByRole('listbox')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('listbox')).toHaveCount(0);await expect(switcher).toBeVisible();await expect(switcher).toBeFocused();await page.keyboard.press('Escape');await expect(switcher).not.toBeVisible();await expect(disclosure).toBeFocused();
});
