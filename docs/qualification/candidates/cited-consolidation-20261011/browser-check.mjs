import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const origin = 'http://127.0.0.1:34874';
const out = path.dirname(new URL(import.meta.url).pathname);
const result = { origin, browser: 'borrowed /tmp/chromium preview only; no AWS sandbox qualification', groups: [], requests: [], errors: [], externalRequests: [], screenshots: [] };
const browser = await chromium.launch({ executablePath: '/tmp/chromium', headless: true, args: ['--no-sandbox', '--disable-background-networking', '--disable-dev-shm-usage'] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1040 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin + '/')) { result.requests.push({ method: route.request().method(), path: url.slice(origin.length) }); return route.continue(); }
    result.externalRequests.push(url); return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => result.errors.push(error.message));
  await page.goto(origin + '/meri/fixture/cited-answer');
  await page.getByRole('heading', { name: 'Anduril meeting brief', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.getByText('Anduril · Sample conversation · Not saved', { exact: true }).count(), 1);
  assert.equal(await page.getByRole('table', { name: 'Sample open commitments' }).count(), 1);
  for (const name of ['Portfolio — unavailable', 'Modules — unavailable', 'Send unavailable: disconnected fixture', 'Attach', 'Retry', 'Fork', 'Helpful', 'Routines']) assert.equal(await page.getByRole('button', { name, exact: true }).isDisabled(), true, name);
  assert.equal(await page.getByRole('button', { name: 'Meri', exact: true }).getAttribute('aria-current'), 'page');
  const geometry = await page.evaluate(() => {
    const bounds = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return { viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, heading: bounds(document.querySelector('h1')), composer: bounds(document.querySelector('section[aria-label="Local draft composer"]')), images: [...document.images].map(img => ({ path: new URL(img.src).pathname, loaded: img.complete && img.naturalWidth > 0, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, ...bounds(img) })), mark: { ...bounds(document.querySelector('[role="img"][aria-label="Meri"]')), mask: getComputedStyle(document.querySelector('[role="img"][aria-label="Meri"]')).maskImage } };
  });
  const manifest = JSON.parse(fs.readFileSync(path.resolve(out, '../../../../apps/web/design/cited-answer-assets.json')));
  for (const asset of manifest.assets.filter(asset => asset.file.endsWith('.svg'))) {
    const slots = geometry.images.filter(img => img.path === '/design/cited-answer/' + asset.file);
    assert.ok(slots.length > 0, asset.file);
    for (const slot of slots) { assert.equal(slot.loaded, true, asset.file); const size = asset.file === 'profile.svg' ? 32 : 16; assert.equal(slot.width, size, asset.file); assert.equal(slot.height, size, asset.file); }
  }
  assert.deepEqual({ width: geometry.mark.width, height: geometry.mark.height }, { width: 62, height: 20 });
  assert.ok(geometry.mark.mask.includes('/design/cited-answer/meri-ink.png'));
  assert.equal(geometry.heading.x, 260);
  assert.ok(Math.abs(geometry.composer.y - 832) < 3);
  assert.equal(geometry.documentWidth, 1440);
  const followupStyle = await page.getByRole('button', { name: 'Create meeting brief', exact: true }).evaluate(node => { const css = getComputedStyle(node); return { background: css.backgroundColor, borderWidth: css.borderTopWidth, borderStyle: css.borderTopStyle }; });
  assert.deepEqual(followupStyle, { background: 'rgb(255, 255, 255)', borderWidth: '1px', borderStyle: 'solid' });
  fs.writeFileSync(path.join(out, 'desktop-geometry.json'), JSON.stringify(geometry, null, 2) + '\n');
  await page.screenshot({ path: path.join(out, 'cited-desktop.png'), fullPage: true }); result.screenshots.push('cited-desktop.png');
  result.groups.push({ name: 'desktop design, all21 SVG slots plus62×20 mark, synthetic labels and disabled boundaries', pass: true });
  await page.getByRole('button', { name: 'Show sample source 1, Funding update' }).click();
  assert.ok((await page.getByRole('region', { name: 'Sample source references' }).innerText()).includes('No linked source record or current authorization is available.'));
  await page.getByRole('button', { name: 'Show sample source 2, Client task record' }).click();
  assert.equal(await page.locator('#sample-sources li[class*="selectedSource"]').innerText(), '[2] Client task record\nSample restoration request from the Figma design. No authorized task is connected.');
  await page.getByRole('button', { name: 'Sources', exact: true }).click(); assert.equal(await page.locator('#sample-sources').count(), 0);
  await page.getByRole('button', { name: 'Draft a task', exact: true }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Message draft' }).inputValue(), 'Draft a task to confirm the owner of the restoration request.');
  assert.equal(await page.getByRole('textbox', { name: 'Message draft' }).evaluate(node => document.activeElement === node), true);
  await page.getByRole('button', { name: 'Create meeting brief', exact: true }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Message draft' }).inputValue(), 'Create the brief and include a table of open commitments.');
  await page.getByRole('button', { name: 'Copy', exact: true }).click(); await page.getByRole('button', { name: 'Copied', exact: true }).waitFor();
  assert.ok((await page.evaluate(() => navigator.clipboard.readText())).includes('Restoration request | Open | Confirm owner'));
  await page.getByRole('button', { name: 'Copied', exact: true }).focus(); await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button', { name: 'Sources', exact: true }).evaluate(node => document.activeElement === node), true);
  result.groups.push({ name: 'source selection, source disclosure, follow-up draft focus, real clipboard and keyboard navigation', pass: true });
  await page.getByRole('button', { name: 'New conversation', exact: true }).click(); await page.waitForURL(origin + '/meri');
  assert.equal(await page.getByRole('textbox', { name: 'Message draft' }).inputValue(), '');
  assert.equal(await page.getByRole('button', { name: 'Routines', exact: true }).locator('img').getAttribute('src'), '/design/home/routines.svg');
  await page.getByRole('button', { name: 'Start research draft', exact: true }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Message draft' }).inputValue(), 'Help me research a question about ');
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Message draft' }).inputValue(), '');
  const home = await page.evaluate(() => ({ moreWidth: document.querySelector('[class*="moreSuggestions"]').getBoundingClientRect().width, mask: getComputedStyle(document.querySelector('[role="img"][aria-label="Meri"]')).maskImage }));
  assert.equal(home.moreWidth, 625); assert.ok(home.mask.includes('/design/home/meri-wordmark.png'));
  await page.screenshot({ path: path.join(out, 'home-preserved-desktop.png'), fullPage: true }); result.screenshots.push('home-preserved-desktop.png');
  result.groups.push({ name: 'cited→blank Home, Home Routines/icon,625px starters, wordmark, local suggestion and reset preserved', pass: true });
  await page.goto(origin + '/'); await page.getByRole('link', { name: 'Open cited answer', exact: true }).click(); await page.waitForURL(origin + '/meri/fixture/cited-answer');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('qualification clipboard denial'); } }, configurable: true }));
  await page.getByRole('button', { name: 'Copy', exact: true }).click(); await page.getByRole('status').filter({ hasText: 'Copy unavailable in this browser' }).waitFor();
  result.groups.push({ name: 'root route link and explicit clipboard-denial fallback', pass: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(origin + '/meri/fixture/cited-answer');
  await page.getByRole('heading', { name: 'Anduril meeting brief', exact: true }).waitFor(); await page.evaluate(() => document.fonts.ready);
  const mobile = await page.evaluate(() => { const table = document.querySelector('table').parentElement; return { viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, tableWidth: table.clientWidth, tableScrollWidth: table.scrollWidth }; });
  assert.equal(mobile.documentWidth, 390); assert.ok(mobile.tableScrollWidth > mobile.tableWidth);
  for (const name of ['Meri', 'Portfolio — unavailable', 'Modules — unavailable']) assert.equal(await page.getByRole('button', { name, exact: true }).isVisible(), true);
  await page.screenshot({ path: path.join(out, 'cited-mobile.png'), fullPage: true }); result.screenshots.push('cited-mobile.png');
  fs.writeFileSync(path.join(out, 'mobile-geometry.json'), JSON.stringify(mobile, null, 2) + '\n');
  result.groups.push({ name: '390px mobile, contained horizontal table scroll and all three labelled toggles', pass: true });
  assert.deepEqual(result.errors, []); assert.deepEqual(result.externalRequests, []); assert.ok(result.requests.every(r => r.method === 'GET'));
  result.groups.push({ name: 'zero page errors, zero external requests and GET-only disconnected fixture', pass: true });
  await context.close();
} catch (error) { result.failure = error.stack; process.exitCode = 1; }
finally { await browser.close(); fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ groups: result.groups, failure: result.failure, errors: result.errors, externalRequests: result.externalRequests })); }
