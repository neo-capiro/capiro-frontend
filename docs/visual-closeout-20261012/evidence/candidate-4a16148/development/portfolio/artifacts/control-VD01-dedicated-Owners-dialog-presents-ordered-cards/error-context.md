# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control.spec.ts >> VD01 dedicated Owners dialog presents ordered cards
- Location: ../../../../tmp/capiro-visual-closeout/portfolio/control.spec.ts:5:1

# Error details

```
TimeoutError: locator.click: Timeout 2000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Manage owners', exact: true })

```

# Page snapshot

```yaml
- generic:
  - generic:
    - main:
      - paragraph: Synthetic profile checks. All service requests are intercepted.
      - paragraph: "Closures: 0"
  - dialog "Account team" [ref=e2]:
    - banner [ref=e3]:
      - heading "Account team" [level=2] [ref=e4]
      - button "Close" [active] [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: The firm's members assigned to this client. Ranked account owners remain on the team until their ownership is explicitly changed.
    - list [ref=e10]:
      - listitem [ref=e11]:
        - generic [ref=e12]:
          - strong [ref=e13]: Olivia Owner
          - generic [ref=e14]: · Account owner
      - listitem [ref=e15]:
        - generic [ref=e16]:
          - strong [ref=e17]: Terry Team
          - generic [ref=e18]: · Analyst
        - button "Remove" [ref=e19] [cursor=pointer]
    - generic [ref=e20]:
      - generic [ref=e21]:
        - text: Add team member
        - combobox "Add team member" [ref=e22]:
          - option "Choose a member" [selected]
          - option "Olivia Owner"
          - option "Terry Team"
          - option "Nora New"
      - generic [ref=e23]:
        - text: Role
        - textbox "Role" [ref=e24]
      - button "Add member" [disabled] [ref=e25]
    - group "Ordered account owners" [ref=e26]:
      - generic [ref=e27]: Account owners
      - paragraph [ref=e28]: Up to four owners, in order. Ownership does not grant access to this client.
      - generic [ref=e29]:
        - text: Primary owner
        - combobox "Primary owner" [ref=e30]:
          - option "Unassigned"
          - option "Olivia Owner" [selected]
          - option "Terry Team"
          - option "Nora New"
      - generic [ref=e31]:
        - text: Secondary owner
        - combobox "Secondary owner" [ref=e32]:
          - option "Unassigned" [selected]
          - option "Olivia Owner"
          - option "Terry Team"
          - option "Nora New"
      - generic [ref=e33]:
        - text: Tertiary owner
        - combobox "Tertiary owner" [ref=e34]:
          - option "Unassigned" [selected]
          - option "Olivia Owner"
          - option "Terry Team"
          - option "Nora New"
      - generic [ref=e35]:
        - text: Quaternary owner
        - combobox "Quaternary owner" [ref=e36]:
          - option "Unassigned" [selected]
          - option "Olivia Owner"
          - option "Terry Team"
          - option "Nora New"
      - generic [ref=e37]:
        - button "Read current owners" [ref=e38] [cursor=pointer]
        - button "Save owner order" [disabled] [ref=e39]
    - button "Done" [ref=e41] [cursor=pointer]
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
> 8  |  await page.getByRole('button',{name:'Manage owners',exact:true}).click({timeout:2000});
     |                                                                   ^ TimeoutError: locator.click: Timeout 2000ms exceeded.
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
  39 |  await expect(page.locator('[data-slot=dialog-overlay]')).toHaveCSS('backdrop-filter','none');
  40 | });
  41 | 
```