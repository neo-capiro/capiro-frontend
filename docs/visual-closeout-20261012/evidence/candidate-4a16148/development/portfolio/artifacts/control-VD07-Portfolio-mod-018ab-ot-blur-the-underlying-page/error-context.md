# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control.spec.ts >> VD07 Portfolio modal scrim does not blur the underlying page
- Location: ../../../../tmp/capiro-visual-closeout/portfolio/control.spec.ts:36:1

# Error details

```
Error: expect(locator).toHaveCSS(expected) failed

Locator:  locator('[data-slot=dialog-overlay]')
Expected: "none"
Received: "blur(2px)"
Timeout:  5000ms

Call log:
  - Expect "toHaveCSS" with timeout 5000ms
  - waiting for locator('[data-slot=dialog-overlay]')
    14 × locator resolved to <div data-state="open" aria-hidden="true" data-aria-hidden="true" data-slot="dialog-overlay" class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"></div>
       - unexpected value "blur(2px)"

```

# Page snapshot

```yaml
- generic:
  - generic:
    - link:
      - /url: "#main"
      - text: Skip to content
    - banner:
      - link:
        - /url: /
        - img
      - navigation:
        - link:
          - /url: /meri
        - link:
          - /url: /
        - link:
          - /url: /modules
      - navigation:
        - link:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
        - link:
          - /url: /calendar
        - link:
          - /url: /portfolio?search=1
        - button [disabled]
        - generic:
          - button: T
    - generic:
      - complementary:
        - paragraph: Portfolio
        - navigation:
          - link:
            - /url: /portfolio
            - generic: Overview
          - link:
            - /url: /portfolio?type=CLIENT
            - generic: Clients
          - link:
            - /url: /portfolio/prospects
            - generic: Prospects
        - separator
        - paragraph: Test Aerospace
        - navigation:
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001
            - generic: Overview
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
            - generic: Objectives
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
            - generic: Calendar
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
            - generic: Relationships
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
            - generic: Work
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
            - generic: Capabilities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
            - generic: Bill Tracker
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
            - generic: Opportunities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
            - generic: Files
        - generic:
          - link:
            - /url: /settings
            - text: Settings
      - main:
        - generic:
          - generic:
            - navigation:
              - link:
                - /url: /portfolio
              - link:
                - /url: /portfolio
                - text: Portfolio
              - generic: /
              - link:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001
                - text: Test Aerospace
              - generic: /
              - button: Capabilities
            - generic:
              - button:
                - generic: Quick add
              - button:
                - generic: Meri actions
              - button:
                - img
          - region:
            - generic: TA
            - generic:
              - strong: Test Aerospace
              - paragraph: Aerospace
            - generic: active client
        - generic:
          - generic:
            - generic:
              - heading [level=1]: Capabilities
              - generic:
                - button: Add capability
                - button: Registrations & codes
            - generic:
              - generic:
                - paragraph: Capability areas
                - generic: 1 areas · 0 fielded
              - generic:
                - button:
                  - generic: ▦
                  - strong: Counter-UAS interceptors
                  - paragraph: Synthetic interceptor profile for visual and keyboard checks.
                  - generic:
                    - generic: Prototype
                    - generic: 0604201A, 0605603A
            - generic:
              - generic:
                - generic:
                  - paragraph: Where capabilities create fit
                  - heading [level=3]: 1 fit matches
                - button: Refresh
              - generic: Computed 10/11/2026, 12:00:00 PM
              - article:
                - generic:
                  - strong: Synthetic fit program
                  - generic: Fit 90/100
                - paragraph: Explicit synthetic capability reference
                - link:
                  - /url: http://127.0.0.1:5191/existing/program-elements/0604134A
                  - text: Open target ↗
            - region:
              - generic:
                - generic:
                  - paragraph: Past performance
                  - heading [level=2]: Saved submissions
                  - paragraph: Saved capability submissions and their recorded outcomes.
                - button: Refresh history
              - generic:
                - paragraph: 0 saved submissions shown.
                - paragraph: No saved submissions in this history feed.
              - paragraph: Removing a saved submission keeps its capability and documents.
            - paragraph:
              - text: "Past advocacy:"
              - link:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
                - text: Advocacy history ↗
  - dialog "New capability" [ref=e2]:
    - banner [ref=e3]:
      - heading "New capability" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: New capability
    - generic [ref=e10]:
      - group [ref=e11]:
        - paragraph [ref=e12]: Name it and save. PE numbers, match keywords, and documents open next, on the saved record.
        - generic [ref=e13]:
          - text: Name
          - textbox "Name" [active] [ref=e14]:
            - /placeholder: Specific capability name
        - generic [ref=e15]:
          - generic [ref=e16]:
            - text: Type
            - textbox "Type" [ref=e17]: product
          - generic [ref=e18]:
            - text: Sector
            - textbox "Sector" [ref=e19]
        - paragraph [ref=e20]: Drives downstream agency and policy matching.
        - generic [ref=e21]:
          - generic [ref=e22]: Tags
          - textbox "Tags" [ref=e24]:
            - /placeholder: Pick or add tags
        - group "Technology Readiness Level" [ref=e25]:
          - generic [ref=e26]:
            - generic [ref=e27]: Technology Readiness Level
            - generic [ref=e29]: Not set, optional
          - generic [ref=e30]:
            - button "TRL 1" [ref=e31] [cursor=pointer]: "1"
            - button "TRL 2" [ref=e32] [cursor=pointer]: "2"
            - button "TRL 3" [ref=e33] [cursor=pointer]: "3"
            - button "TRL 4" [ref=e34] [cursor=pointer]: "4"
            - button "TRL 5" [ref=e35] [cursor=pointer]: "5"
            - button "TRL 6" [ref=e36] [cursor=pointer]: "6"
            - button "TRL 7" [ref=e37] [cursor=pointer]: "7"
            - button "TRL 8" [ref=e38] [cursor=pointer]: "8"
            - button "TRL 9" [ref=e39] [cursor=pointer]: "9"
        - generic [ref=e40]:
          - generic [ref=e41]: Description
          - textbox "Description" [ref=e42]:
            - /placeholder: Describe this capability…
        - group [ref=e43]:
          - generic "Additional details" [ref=e44] [cursor=pointer]
          - option "Not set" [selected]
          - option "1"
          - option "2"
          - option "3"
          - option "4"
          - option "5"
          - option "6"
          - option "7"
          - option "8"
          - option "9"
          - option "10"
      - contentinfo [ref=e45]:
        - button "Cancel" [ref=e46] [cursor=pointer]
        - button "Add capability" [ref=e47] [cursor=pointer]
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
  21 |  await expect(header.getByRole('button',{name:'Customize',exact:true})).toBeVisible();
  22 |  await expect(header.getByLabel('Account owner',{exact:true})).toBeVisible();
  23 | });
  24 | test("VD04 capability create marks required name and retains editable choices",async({page},info)=>{
  25 |  await installCapabilityPresentation(page);await page.goto(`/portfolio/${clientId}/capabilities`);await page.getByRole('button',{name:'Add capability',exact:true}).click();
  26 |  const dialog=page.getByRole('dialog',{name:'New capability'});await page.screenshot({path:info.outputPath('capability-before.png')});
  27 |  await expect(dialog.locator('input[name=name]').locator('..')).toContainText('*');
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
> 39 |  await expect(page.locator('[data-slot=dialog-overlay]')).toHaveCSS('backdrop-filter','none');
     |                                                           ^ Error: expect(locator).toHaveCSS(expected) failed
  40 | });
  41 | 
```