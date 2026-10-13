import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const origin = 'http://127.0.0.1:34876', out = path.dirname(new URL(import.meta.url).pathname);
const result = { origin, previewOnly: true, groups: [], pageErrors: [], externalRequests: [], requests: [], screenshots: [] };
const browser = await chromium.launch({ executablePath: '/tmp/chromium', headless: true, args: ['--no-sandbox', '--disable-background-networking', '--disable-dev-shm-usage'] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1040 } });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin + '/')) { result.requests.push({ path: url.slice(origin.length), method: route.request().method() }); return route.continue(); }
    result.externalRequests.push(url); return route.abort();
  });
  const page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', error => result.pageErrors.push(error.message));
  await page.goto(origin + '/meri/fixture/run-activity'); await page.getByRole('heading', { name: 'Sample research workspace' }).waitFor(); await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.getByRole('log', { name: 'Sample Meri conversation' }).getAttribute('aria-live'), 'polite');
  assert.equal(await page.getByRole('log', { name: 'Sample Meri conversation' }).getAttribute('aria-relevant'), 'additions text');
  assert.ok((await page.locator('main').innerText()).includes('No signed-in session, source access, saved files or executable run controls.'));
  for (const name of ['Stop', 'Steer', 'Resume', 'Fork', 'Approve', 'Download', 'Send unavailable: disconnected fixture', 'Attach', 'Portfolio — unavailable', 'Modules — unavailable']) assert.equal(await page.getByRole('button', { name, exact: true }).isDisabled(), true, name);
  for (const [value, label] of [['queued', 'Queued'], ['starting', 'Starting'], ['running', 'Running'], ['waiting-for-approval', 'Waiting for approval'], ['paused', 'Paused'], ['completed', 'Completed'], ['failed', 'Failed'], ['cancelled', 'Cancelled']]) {
    await page.getByLabel('Sample scenario', { exact: true }).selectOption(value);
    await page.getByRole('status').filter({ hasText: new RegExp('^' + label + '$') }).waitFor();
    if (value === 'failed') { assert.equal(await page.locator('main').getByRole('alert').innerText(), 'The assistant service is temporarily unavailable.'); assert.ok(!(await page.locator('main').innerText()).includes('PRIVATE_RAW_EXCEPTION')); }
  }
  result.groups.push({ name: 'all8 run states, safe error, accessible log/status and disabled boundaries', pass: true });
  await page.getByLabel('Sample scenario', { exact: true }).selectOption('activity');
  await page.getByRole('button', { name: 'Apply next sample event', exact: true }).click(); await page.getByRole('heading', { name: 'sample.source_read' }).waitFor();
  await page.getByRole('button', { name: 'Show all sample events', exact: true }).click(); await page.getByRole('heading', { name: 'Tool name unavailable' }).waitFor();
  assert.ok((await page.getByRole('log').innerText()).includes('Preparing the sample response. References have no connected source contents.'));
  assert.equal(await page.evaluate(() => window.FIXTURE_SCRIPT_EXECUTED), undefined);
  assert.ok((await page.getByRole('log').innerText()).includes('Literal <script>window.FIXTURE_SCRIPT_EXECUTED=true</script>'));
  const before = await page.getByRole('log').innerText(); await page.getByRole('button', { name: 'Replay last sample event' }).click();
  await page.getByRole('status').filter({ hasText: 'Sample replay: duplicate' }).waitFor(); assert.equal(await page.getByRole('log').innerText(), before);
  await page.locator('summary').focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('details').getAttribute('open'), '');
  const references = await page.locator('details').innerText();
  for (const phrase of ['Source version', 'source-version-2', 'Content hash', 'Version 10000000-0000-4000-8000-000000000071', 'The exact action and its outcome are not supplied.', 'Replacement-worker recovery is not demonstrated here.', 'Amounts are not supplied.']) assert.ok(references.includes(phrase), phrase);
  await page.locator('summary').click();
  result.groups.push({ name: 'incremental fixture, canonical replay, escaped text, unmatched tool, keyboard reference disclosure and exact IDs', pass: true });
  const history = page.getByLabel('Sample message history', { exact: true });
  const scroll = history.locator('..');
  const scrollSize = await scroll.evaluate(node => ({ clientHeight: node.clientHeight, scrollHeight: node.scrollHeight }));
  assert.ok(scrollSize.scrollHeight > scrollSize.clientHeight);
  await scroll.evaluate(node => { node.scrollTop = 0; node.dispatchEvent(new Event('scroll')); });
  await page.getByRole('button', { name: 'Scroll to latest sample message' }).waitFor();
  await page.getByRole('button', { name: 'Scroll to latest sample message' }).click();
  await page.waitForFunction(() => { const node = document.querySelector('[aria-label="Sample message history"]').parentElement; return node.scrollTop + node.clientHeight >= node.scrollHeight - 3; });
  await page.getByRole('textbox', { name: 'Message draft' }).fill('This draft remains local.'); await page.getByRole('textbox', { name: 'Message draft' }).press('Enter');
  assert.ok((await page.getByRole('textbox', { name: 'Message draft' }).inputValue()).includes('This draft remains local.'));
  await page.getByLabel('Sample scenario').focus(); await page.keyboard.press('Tab'); assert.equal(await page.getByLabel('Sample run and attempt').evaluate(node => document.activeElement === node), true);
  result.groups.push({ name: 'actual adopted scroll-to-latest, local PromptInput draft and keyboard focus', pass: true });
  const primary = '10000000-0000-4000-8000-000000000010', other = '10000000-0000-4000-8000-000000000011', firstAttempt = '10000000-0000-4000-8000-000000000020', secondAttempt = '10000000-0000-4000-8000-000000000021';
  await page.getByLabel('Sample scenario').selectOption('isolation');
  assert.ok((await page.getByRole('log').innerText()).includes('Primary sample response.')); assert.ok(!(await page.getByRole('log').innerText()).includes('Other run response.'));
  await page.getByLabel('Sample run and attempt').selectOption(JSON.stringify([other, firstAttempt]));
  assert.ok((await page.getByRole('log').innerText()).includes('Other run response.')); assert.ok(!(await page.getByRole('log').innerText()).includes('Primary sample response.'));
  await page.getByLabel('Sample run and attempt').selectOption(JSON.stringify([primary, secondAttempt]));
  assert.ok((await page.getByRole('log').innerText()).includes('Second attempt response.')); await page.getByRole('status').filter({ hasText: /^Paused$/ }).waitFor();
  result.groups.push({ name: 'two runs and two attempts isolate colliding tool/message IDs', pass: true });
  await page.getByLabel('Sample scenario').selectOption('activity'); await page.getByRole('button', { name: 'Show all sample events' }).click();
  const desktop = await page.evaluate(() => { const h = document.querySelector('h1').getBoundingClientRect(), mark = document.querySelector('[role="img"][aria-label="Meri"]').getBoundingClientRect(); return { viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, heading: { x: h.x, width: h.width }, mark: { width: mark.width, height: mark.height } }; });
  assert.equal(desktop.documentWidth, 1440); assert.equal(desktop.heading.x, 260); assert.deepEqual(desktop.mark, { width: 62, height: 20 });
  await page.screenshot({ path: path.join(out, 'workspace-desktop.png'), fullPage: true }); result.screenshots.push('workspace-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => ({ viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth })); assert.equal(mobile.documentWidth, 390);
  for (const name of ['Meri', 'Portfolio — unavailable', 'Modules — unavailable']) assert.equal(await page.getByRole('button', { name, exact: true }).isVisible(), true);
  await page.locator('summary').click(); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390); await page.locator('summary').click();
  await page.screenshot({ path: path.join(out, 'workspace-mobile.png'), fullPage: true }); result.screenshots.push('workspace-mobile.png'); fs.writeFileSync(path.join(out, 'geometry.json'), JSON.stringify({ desktop, mobile, scrollSize }, null, 2) + '\n');
  result.groups.push({ name: 'desktop geometry,390px mobile overflow including disclosures and three labelled toggles', pass: true });
  await page.setViewportSize({ width: 1440, height: 1040 }); await page.getByRole('button', { name: 'New conversation', exact: true }).click(); await page.waitForURL(origin + '/meri');
  assert.equal(await page.getByRole('textbox', { name: 'Message draft' }).inputValue(), ''); assert.equal(await page.getByRole('button', { name: 'Routines', exact: true }).locator('img').getAttribute('src'), '/design/home/routines.svg');
  await page.getByRole('button', { name: 'Start research draft' }).click(); assert.equal(await page.getByRole('textbox', { name: 'Message draft' }).inputValue(), 'Help me research a question about ');
  await page.goto(origin + '/meri/fixture/cited-answer'); await page.getByRole('heading', { name: 'Anduril meeting brief' }).waitFor(); await page.getByRole('button', { name: 'Draft a task', exact: true }).click(); assert.ok((await page.getByRole('textbox', { name: 'Message draft' }).inputValue()).startsWith('Draft a task'));
  await page.getByRole('button', { name: 'Show sample source 1, Funding update' }).click(); assert.equal(await page.getByRole('region', { name: 'Sample source references' }).isVisible(), true);
  result.groups.push({ name: 'original Home/reset/Routines/suggestion and cited-answer interactions preserved', pass: true });
  assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.externalRequests, []); assert.ok(result.requests.every(request => request.method === 'GET'));
  result.groups.push({ name: 'zero page errors, zero external requests, no command writes', pass: true });
  await context.close();
} catch (error) { result.failure = error.stack; process.exitCode = 1; }
finally { await browser.close(); fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ groups: result.groups, failure: result.failure, pageErrors: result.pageErrors, externalRequests: result.externalRequests })); }
