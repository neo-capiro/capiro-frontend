# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control.spec.ts >> VD02 unavailable ordering never promises drag or saved layout
- Location: ../../../../tmp/capiro-visual-closeout/portfolio/control.spec.ts:12:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByText('Drag any card to rearrange · your layout is saved to your profile', { exact: true })
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByText('Drag any card to rearrange · your layout is saved to your profile', { exact: true })
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to content" [ref=e3] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=e4]:
    - link "Capiro Home" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "Capiro" [ref=e6]
    - navigation "Workspace" [ref=e7]:
      - link "Meri" [ref=e8] [cursor=pointer]:
        - /url: /meri
      - link "Portfolio" [ref=e9] [cursor=pointer]:
        - /url: /
      - link "Modules" [ref=e10] [cursor=pointer]:
        - /url: /modules
    - navigation "Global actions" [ref=e11]:
      - link "Quick log" [ref=e12] [cursor=pointer]:
        - /url: /portfolio?log=1
      - link "Master calendar" [ref=e13] [cursor=pointer]:
        - /url: /calendar
      - link "Search Portfolio" [ref=e14] [cursor=pointer]:
        - /url: /portfolio?search=1
      - button "Updates unavailable" [disabled] [ref=e15]
      - button "Test account" [ref=e17] [cursor=pointer]: T
  - generic [ref=e18]:
    - complementary "Portfolio navigation" [ref=e19]:
      - paragraph [ref=e20]: Portfolio
      - navigation "Portfolio" [ref=e21]:
        - link "Portfolio Overview" [ref=e22] [cursor=pointer]:
          - /url: /portfolio
          - generic [ref=e23]: Overview
        - link "Portfolio Clients" [ref=e24] [cursor=pointer]:
          - /url: /portfolio?type=CLIENT
          - generic [ref=e25]: Clients
        - link "Portfolio Prospects" [ref=e26] [cursor=pointer]:
          - /url: /portfolio/prospects
          - generic [ref=e27]: Prospects
      - link "Settings" [ref=e29] [cursor=pointer]:
        - /url: /settings
    - main [ref=e30]:
      - generic [ref=e31]:
        - generic [ref=e32]:
          - generic [ref=e33]:
            - paragraph [ref=e34]: Your client portfolio
            - heading "Portfolio 1" [level=1] [ref=e35]
          - generic [ref=e36]:
            - generic [ref=e37]:
              - img [ref=e38]
              - textbox "Search profiles" [ref=e41]:
                - /placeholder: Search profiles…
            - button "New objective" [ref=e42] [cursor=pointer]
            - button "Add profile" [ref=e43] [cursor=pointer]:
              - img [ref=e44]
              - text: Add profile
        - region "Portfolio pulse" [ref=e45]:
          - generic [ref=e46]:
            - paragraph [ref=e47]: Portfolio pulse
            - generic [ref=e48]:
              - strong [ref=e49]: —
              - generic [ref=e50]:
                - text: of work linked
                - text: to an objective
          - generic [ref=e51]:
            - strong [ref=e52]: "1"
            - generic [ref=e53]: Clients
          - generic [ref=e54]:
            - strong [ref=e55]: —
            - generic [ref=e56]: Need attention
          - generic [ref=e57]:
            - strong [ref=e58]: —
            - generic [ref=e59]: Objectives
          - generic [ref=e60]:
            - strong [ref=e61]: —
            - generic [ref=e62]: Off track
          - generic [ref=e63]:
            - strong [ref=e64]: —
            - generic [ref=e65]: Strategies
        - generic "Portfolio filters" [ref=e66]:
          - combobox "Profile status" [ref=e67]:
            - option "All statuses" [selected]
            - option "ACTIVE"
          - combobox "Sector" [ref=e68]:
            - option "All sectors" [selected]
            - option "Aerospace"
          - combobox "Account owner" [ref=e69]:
            - option "All owners" [selected]
            - option "Unassigned"
          - combobox "Sort profiles" [ref=e70]:
            - option "Saved order" [selected]
            - option "Recently added"
            - option "Name A–Z"
          - generic "Profile layout" [ref=e71]:
            - button "List view" [ref=e72] [cursor=pointer]:
              - img [ref=e73]
            - button "Card view" [pressed] [ref=e74] [cursor=pointer]:
              - img [ref=e75]
        - generic [ref=e80]:
          - region "Portfolio profiles" [ref=e81]:
            - navigation "Profile type" [ref=e82]:
              - button "All 1" [pressed] [ref=e83] [cursor=pointer]:
                - text: All
                - generic [ref=e84]: "1"
              - button "Clients 1" [ref=e85] [cursor=pointer]:
                - text: Clients
                - generic [ref=e86]: "1"
              - link "Prospects" [ref=e87] [cursor=pointer]:
                - /url: /portfolio/prospects
              - link "Pipeline" [ref=e88] [cursor=pointer]:
                - /url: /portfolio/prospects?pipeline=1
            - status [ref=e89]: 1 profile
            - button "Refresh profiles" [ref=e90] [cursor=pointer]
            - region "Organization profile order" [ref=e91]:
              - status [ref=e92]:
                - text: Saved profile ordering is unavailable in this environment. Profiles use their default order.
                - button "Retry saved order" [ref=e93] [cursor=pointer]
              - generic [ref=e95]:
                - article [ref=e96]:
                  - link "Open Test Aerospace" [ref=e97] [cursor=pointer]:
                    - /url: /portfolio/10000000-0000-4000-8000-000000000001
                    - generic [ref=e98]: TA
                    - generic [ref=e99]:
                      - heading "Test Aerospace" [level=3] [ref=e100]
                      - generic [ref=e101]: Aerospace
                  - generic [ref=e102]:
                    - 'generic "Profile status: ACTIVE" [ref=e103]': ACTIVE
                    - 'generic "Account owner: unavailable" [ref=e104]': —
                - generic [ref=e105]:
                  - button "Drag Test Aerospace to rearrange" [disabled] [ref=e106]:
                    - img [ref=e107]
                  - generic [ref=e114]: 1 of 1
                  - button "Move Test Aerospace earlier" [disabled] [ref=e115]:
                    - img [ref=e116]
                  - button "Move Test Aerospace later" [disabled] [ref=e118]:
                    - img [ref=e119]
              - paragraph [ref=e121]: Drag any card to rearrange · your layout is saved to your profile
              - status [ref=e122]
            - button "+ Add profile" [ref=e123] [cursor=pointer]
          - complementary "Needs attention" [ref=e124]:
            - generic [ref=e125]:
              - heading "Needs attention" [level=3] [ref=e126]
              - generic "0 shown alerts" [ref=e127]: 0 shown
              - generic "Ordered by the source service" [ref=e128]: ↑↓ Most urgent
            - paragraph [ref=e129]: Updates automatically. Open an item in its client profile.
            - status [ref=e130]: No alerts were returned for your accessible clients. Coverage is incomplete; this does not confirm there is nothing to review.
            - generic [ref=e131]:
              - paragraph [ref=e132]: "Limited feed: up to 50 alerts from the first 40 active clients, with up to 20 per client. Some sources may be unavailable."
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - text: Snapshot
                  - time [ref=e135]: Oct 11, 6:00 AM UTC
                - button "Refresh alerts" [ref=e136] [cursor=pointer]
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
> 16 |  await expect(page.getByText('Drag any card to rearrange · your layout is saved to your profile',{exact:true})).toHaveCount(0);
     |                                                                                                                 ^ Error: expect(locator).toHaveCount(expected) failed
  17 | });
  18 | test("VD03 Portfolio title toolbar contains Owner and Customize",async({page},info)=>{
  19 |  await installFixtures(page);await page.goto('/portfolio');await page.screenshot({path:info.outputPath('index-before.png')});
  20 |  const header=page.locator('header').filter({has:page.getByRole('heading',{name:/Portfolio/})});
  21 |  await expect(header.getByRole('button',{name:'Customize',exact:true})).toBeVisible();
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