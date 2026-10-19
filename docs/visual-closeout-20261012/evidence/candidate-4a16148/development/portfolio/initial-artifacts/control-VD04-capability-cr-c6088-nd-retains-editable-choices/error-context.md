# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control.spec.ts >> VD04 capability create marks required name and retains editable choices
- Location: ../../../../tmp/capiro-visual-closeout/portfolio/control.spec.ts:24:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('dialog', { name: 'New capability' }).locator('label').filter({ has: getByRole('dialog', { name: 'New capability' }).locator('input[name=name]') })
Expected substring: "*"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'New capability' }).locator('label').filter({ has: getByRole('dialog', { name: 'New capability' }).locator('input[name=name]') })

```

```yaml
- dialog "New capability":
  - banner:
    - heading "New capability" [level=2]
    - button "Close"
  - paragraph: New capability
  - group:
    - paragraph: Name it and save. PE numbers, match keywords, and documents open next, on the saved record.
    - text: Name
    - textbox "Name":
      - /placeholder: Specific capability name
    - text: Type
    - textbox "Type": product
    - text: Sector
    - textbox "Sector"
    - paragraph: Drives downstream agency and policy matching.
    - text: Tags
    - textbox "Tags":
      - /placeholder: Pick or add tags
    - group "Technology Readiness Level":
      - text: Technology Readiness Level Not set, optional
      - button "TRL 1": "1"
      - button "TRL 2": "2"
      - button "TRL 3": "3"
      - button "TRL 4": "4"
      - button "TRL 5": "5"
      - button "TRL 6": "6"
      - button "TRL 7": "7"
      - button "TRL 8": "8"
      - button "TRL 9": "9"
    - text: Description
    - textbox "Description":
      - /placeholder: Describe this capability…
    - group: Additional details
  - contentinfo:
    - button "Cancel"
    - button "Add capability"
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
> 27 |  await expect(dialog.locator('label').filter({has:dialog.locator('input[name=name]')})).toContainText('*');
     |                                                                                         ^ Error: expect(locator).toContainText(expected) failed
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