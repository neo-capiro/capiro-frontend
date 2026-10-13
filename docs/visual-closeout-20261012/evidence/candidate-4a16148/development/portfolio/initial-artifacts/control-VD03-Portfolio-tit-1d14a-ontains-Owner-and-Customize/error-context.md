# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control.spec.ts >> VD03 Portfolio title toolbar contains Owner and Customize
- Location: ../../../../tmp/capiro-visual-closeout/portfolio/control.spec.ts:18:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('header').filter({ has: getByRole('heading', { name: /Portfolio/ }) }).getByRole('button', { name: 'Customize', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('header').filter({ has: getByRole('heading', { name: /Portfolio/ }) }).getByRole('button', { name: 'Customize', exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Workspace":
    - link "Meri":
      - /url: /meri
    - link "Portfolio":
      - /url: /
    - link "Modules":
      - /url: /modules
  - navigation "Global actions":
    - link "Quick log":
      - /url: /portfolio?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search Portfolio":
      - /url: /portfolio?search=1
    - button "Updates unavailable" [disabled]
    - button "Test account": T
- complementary "Portfolio navigation":
  - paragraph: Portfolio
  - navigation "Portfolio":
    - link "Portfolio Overview":
      - /url: /portfolio
      - text: Overview
    - link "Portfolio Clients":
      - /url: /portfolio?type=CLIENT
      - text: Clients
    - link "Portfolio Prospects":
      - /url: /portfolio/prospects
      - text: Prospects
  - link "Settings":
    - /url: /settings
- main:
  - paragraph: Your client portfolio
  - heading "Portfolio 1" [level=1]
  - textbox "Search profiles":
    - /placeholder: Search profiles…
  - button "New objective"
  - button "Add profile"
  - region "Portfolio pulse":
    - paragraph: Portfolio pulse
    - strong: —
    - text: of work linked to an objective
    - strong: "1"
    - text: Clients
    - strong: —
    - text: Need attention
    - strong: —
    - text: Objectives
    - strong: —
    - text: Off track
    - strong: —
    - text: Strategies
  - combobox "Profile status":
    - option "All statuses" [selected]
    - option "ACTIVE"
  - combobox "Sector":
    - option "All sectors" [selected]
    - option "Aerospace"
  - combobox "Account owner":
    - option "All owners" [selected]
    - option "Unassigned"
  - combobox "Sort profiles":
    - option "Saved order" [selected]
    - option "Recently added"
    - option "Name A–Z"
  - button "List view"
  - button "Card view" [pressed]
  - region "Portfolio profiles":
    - navigation "Profile type":
      - button "All 1" [pressed]
      - button "Clients 1"
      - link "Prospects":
        - /url: /portfolio/prospects
      - link "Pipeline":
        - /url: /portfolio/prospects?pipeline=1
    - status: 1 profile
    - button "Refresh profiles"
    - region "Organization profile order":
      - status:
        - text: Saved profile ordering is unavailable in this environment. Profiles use their default order.
        - button "Retry saved order"
      - article:
        - link "Open Test Aerospace":
          - /url: /portfolio/10000000-0000-4000-8000-000000000001
          - text: TA
          - heading "Test Aerospace" [level=3]
          - text: Aerospace
        - text: ACTIVE —
      - button "Drag Test Aerospace to rearrange" [disabled]
      - text: 1 of 1
      - button "Move Test Aerospace earlier" [disabled]
      - button "Move Test Aerospace later" [disabled]
      - paragraph: Drag any card to rearrange · your layout is saved to your profile
      - status
    - button "+ Add profile"
  - complementary "Needs attention":
    - heading "Needs attention" [level=3]
    - text: 0 shown ↑↓ Most urgent
    - paragraph: Updates automatically. Open an item in its client profile.
    - status: No alerts were returned for your accessible clients. Coverage is incomplete; this does not confirm there is nothing to review.
    - paragraph: "Limited feed: up to 50 alerts from the first 40 active clients, with up to 20 per client. Some sources may be unavailable."
    - text: Snapshot
    - time: Oct 11, 6:00 AM UTC
    - button "Refresh alerts"
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { installFixtures, clientId } from "/workspace/capiro-visual-closeout/apps/web/tests/browser/fixtures";
  3  | import { installProfileCurrentState } from "/workspace/capiro-visual-closeout/apps/web/tests/browser/profile-current-state-fixtures";
  4  | import { installCapabilityPresentation } from "/workspace/capiro-visual-closeout/apps/web/tests/browser/capability-presentation-fixtures";
  5  | test("VD01 dedicated Owners dialog presents ordered cards",async({page},info)=>{
  6  |  await installProfileCurrentState(page);await page.goto('/profile-current-state.html?mode=team');
  7  |  await page.screenshot({path:info.outputPath('owners-before.png')});
  8  |  await page.getByRole('button',{name:'Manage owners',exact:true}).click({timeout:2000});
  9  |  await expect(page.getByRole('dialog',{name:'Owners',exact:true})).toBeVisible();
  10 |  await expect(page.getByRole('list',{name:'Ordered account owners'})).toBeVisible();
  11 | });
  12 | test("VD02 unavailable ordering never promises drag or saved layout",async({page},info)=>{
  13 |  await installFixtures(page);await page.goto('/portfolio');
  14 |  await expect(page.getByText('Saved profile ordering is unavailable',{exact:false})).toBeVisible();
  15 |  await page.screenshot({path:info.outputPath('index-unavailable-before.png')});
  16 |  await expect(page.getByText('Drag any card to rearrange · your layout is saved to your profile',{exact:true})).toHaveCount(0);
  17 | });
  18 | test("VD03 Portfolio title toolbar contains Owner and Customize",async({page},info)=>{
  19 |  await installFixtures(page);await page.goto('/portfolio');await page.screenshot({path:info.outputPath('index-before.png')});
  20 |  const header=page.locator('header').filter({has:page.getByRole('heading',{name:/Portfolio/})});
> 21 |  await expect(header.getByRole('button',{name:'Customize',exact:true})).toBeVisible();
     |                                                                         ^ Error: expect(locator).toBeVisible() failed
  22 |  await expect(header.getByLabel('Account owner',{exact:true})).toBeVisible();
  23 | });
  24 | test("VD04 capability create marks required name and retains editable choices",async({page},info)=>{
  25 |  await installCapabilityPresentation(page);await page.goto(`/portfolio/${clientId}/capabilities`);await page.getByRole('button',{name:'Add capability',exact:true}).click();
  26 |  const dialog=page.getByRole('dialog',{name:'New capability'});await page.screenshot({path:info.outputPath('capability-before.png')});
  27 |  await expect(dialog.locator('label').filter({has:dialog.locator('input[name=name]')})).toContainText('*');
  28 |  await expect(dialog.getByLabel('Type',{exact:true})).toHaveAttribute('list',/.+/);
  29 |  await expect(dialog.getByLabel('Sector',{exact:true})).toHaveAttribute('list',/.+/);
  30 | });
  31 | test("VD05 Bill Tracker has compact heading and an inner results frame",async({page},info)=>{
  32 |  await installFixtures(page);await page.goto(`/portfolio/${clientId}/bills`);await page.screenshot({path:info.outputPath('bills-before.png')});
  33 |  await expect(page.getByRole('heading',{name:'Bill Tracker',exact:true})).toHaveCSS('font-size','20px');
  34 |  await expect(page.getByRole('region',{name:'Tracked bill results',exact:true})).toBeVisible();
  35 | });
  36 | test("VD07 Portfolio modal scrim does not blur the underlying page",async({page},info)=>{
  37 |  await installCapabilityPresentation(page);await page.goto(`/portfolio/${clientId}/capabilities`);await page.getByRole('button',{name:'Add capability',exact:true}).click();
  38 |  await page.screenshot({path:info.outputPath('scrim-before.png')});
  39 |  await expect(page.locator('[data-slot=dialog-overlay]')).toHaveCSS('backdrop-filter','none');
  40 | });
  41 | 
```