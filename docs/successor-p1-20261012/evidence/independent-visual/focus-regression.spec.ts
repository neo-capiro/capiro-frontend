import { test, expect } from '/workspace/capiro-p1-successor/node_modules/@playwright/test';
import { installFixtures, json, file, clientId } from '/workspace/capiro-p1-successor/apps/web/tests/browser/fixtures';
test('unknown folder save keeps settled Tab focus inside its modal', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  const unexpected = await installFixtures(page);
  await page.route('**/engagement/attachments?**', route => json(route, [file]));
  await page.route(`**/files/${file.id}/folder`, route => json(route, file));
  await page.goto(`/portfolio/${clientId}/files`);
  await page.getByRole('checkbox', { name: `Select ${file.fileName}` }).check();
  await page.getByRole('button', { name: 'New folder', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New folder', exact: true });
  await dialog.getByLabel('Folder name').fill('Reviewed destination');
  await dialog.getByRole('button', { name: 'Create folder & move file' }).click();
  await expect(dialog.getByText(/save outcome is unknown/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Create folder & move file' })).toBeDisabled();
  await page.keyboard.press('Tab');
  try {
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement)), { timeout: 1500 }).toBe(true);
    await page.keyboard.press('Shift+Tab');
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement)), { timeout: 1500 }).toBe(true);
  } finally {
    await info.attach('settled-focus', { body: JSON.stringify(await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      text: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.slice(0, 120),
      documentHasFocus: document.hasFocus(),
      inDialog: Boolean(document.activeElement?.closest('[role=dialog]')),
    })), null, 2), contentType: 'application/json' });
  }
  expect(unexpected).toEqual([]);
});
