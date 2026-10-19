# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control.spec.ts >> existing workspace Objective link mounts its bound read instead of the ordinary editor
- Location: ../../../../tmp/objective-work-baseline-d825528/control.spec.ts:12:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Objective saved Workspace revision', exact: true })
Expected: visible
Timeout: 3000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 3000ms
  - waiting for getByRole('heading', { name: 'Objective saved Workspace revision', exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Product modes":
    - link "Meri":
      - /url: /meri?clientId=30000000-0000-4000-8000-000000000001
    - link "Portfolio":
      - /url: /portfolio/30000000-0000-4000-8000-000000000001
    - link "Modules":
      - /url: /modules?clientId=30000000-0000-4000-8000-000000000001
  - navigation "Workspace actions":
    - link "Quick log":
      - /url: /?log=1
    - link "Master calendar":
      - /url: /calendar?clientId=30000000-0000-4000-8000-000000000001
    - link "Search intelligence":
      - /url: /modules/intelligence?clientId=30000000-0000-4000-8000-000000000001
    - button "Updates — unavailable" [disabled]
    - link "Account settings":
      - /url: /settings/personal
- complementary:
  - paragraph: Modules
  - navigation "Modules":
    - link "Module hub":
      - /url: /modules?clientId=30000000-0000-4000-8000-000000000001
    - link "Engagement":
      - /url: /modules/engagement?clientId=30000000-0000-4000-8000-000000000001
    - link "Planner":
      - /url: /modules/planner?clientId=30000000-0000-4000-8000-000000000001
    - link "Calendar":
      - /url: /modules/calendar?clientId=30000000-0000-4000-8000-000000000001
    - link "Workspace":
      - /url: /modules/workspace?clientId=30000000-0000-4000-8000-000000000001
    - link "Strategies":
      - /url: /modules/strategies?clientId=30000000-0000-4000-8000-000000000001
    - link "Directory":
      - /url: /modules/directory?clientId=30000000-0000-4000-8000-000000000001
    - link "Intelligence":
      - /url: /modules/intelligence?clientId=30000000-0000-4000-8000-000000000001
    - link "Research portfolios":
      - /url: /modules/research-portfolios?clientId=30000000-0000-4000-8000-000000000001
  - link "Settings":
    - /url: /settings/personal
- main:
  - navigation "Breadcrumb":
    - link "← Modules":
      - /url: /modules?clientId=30000000-0000-4000-8000-000000000001
    - combobox "Switch module": Workspace
  - alert:
    - heading "Unable to load this view" [level=2]
    - paragraph: "Unconfigured test operation: workspace.draft"
    - button "Try again"
- paragraph: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1  | import { test, expect } from '/workspace/capiro-contracts/node_modules/@playwright/test/index.mjs';
  2  | import { onlyLocalRequests, operationFixtures, testIdentity } from '/workspace/capiro-contracts/apps/web/test/browser/fixtures';
  3  | const clientId = '30000000-0000-4000-8000-000000000001';
  4  | const objectiveId = '40000000-0000-4000-8000-000000000001';
  5  | const resourceId = '60000000-0000-4000-8000-000000000001';
  6  | const cases = [
  7  |   ['strategies', `strategyId=${resourceId}`, 'strategies.objectiveDestination', 'Objective Strategy destination'],
  8  |   ['planner', `taskId=${resourceId}`, 'planner.objectiveDestination', 'Objective Planner task destination'],
  9  |   ['workspace', `draftId=${resourceId}&versionId=70000000-0000-4000-8000-000000000001`, 'workspace.objectiveDestination', 'Objective saved Workspace revision'],
  10 | ] as const;
  11 | for (const [module, ids, operation, title] of cases) {
  12 |   test(`existing ${module} Objective link mounts its bound read instead of the ordinary editor`, async ({page}, info) => {
  13 |     await onlyLocalRequests(page);
  14 |     await operationFixtures(page, {'me.read': testIdentity});
  15 |     await page.route(`**/api/backend/core/clients/${clientId}`, r => r.fulfill({json:{id:clientId,name:'Synthetic client',status:'ACTIVE',profileStatus:'ACTIVE'}}));
  16 |     const keys: string[] = [];
  17 |     page.on('request', r => {if(r.url().includes('/api/capiro/'))keys.push(new URL(r.url()).pathname.split('/').pop()!);});
  18 |     await page.goto(`/modules/${module}?${ids}&clientId=${clientId}&objectiveId=${objectiveId}&objectiveVersion=7`);
  19 |     try {
> 20 |       await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible({timeout:3000});
     |                                                                       ^ Error: expect(locator).toBeVisible() failed
  21 |       expect(keys).toContain(operation);
  22 |     } finally {
  23 |       await info.attach('observed-operation-keys',{body:JSON.stringify(keys),contentType:'application/json'});
  24 |     }
  25 |   });
  26 | }
  27 | 
```