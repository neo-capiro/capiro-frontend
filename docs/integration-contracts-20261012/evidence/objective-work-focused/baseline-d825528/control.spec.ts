import { test, expect } from '/workspace/capiro-contracts/node_modules/@playwright/test/index.mjs';
import { onlyLocalRequests, operationFixtures, testIdentity } from '/workspace/capiro-contracts/apps/web/test/browser/fixtures';
const clientId = '30000000-0000-4000-8000-000000000001';
const objectiveId = '40000000-0000-4000-8000-000000000001';
const resourceId = '60000000-0000-4000-8000-000000000001';
const cases = [
  ['strategies', `strategyId=${resourceId}`, 'strategies.objectiveDestination', 'Objective Strategy destination'],
  ['planner', `taskId=${resourceId}`, 'planner.objectiveDestination', 'Objective Planner task destination'],
  ['workspace', `draftId=${resourceId}&versionId=70000000-0000-4000-8000-000000000001`, 'workspace.objectiveDestination', 'Objective saved Workspace revision'],
] as const;
for (const [module, ids, operation, title] of cases) {
  test(`existing ${module} Objective link mounts its bound read instead of the ordinary editor`, async ({page}, info) => {
    await onlyLocalRequests(page);
    await operationFixtures(page, {'me.read': testIdentity});
    await page.route(`**/api/backend/core/clients/${clientId}`, r => r.fulfill({json:{id:clientId,name:'Synthetic client',status:'ACTIVE',profileStatus:'ACTIVE'}}));
    const keys: string[] = [];
    page.on('request', r => {if(r.url().includes('/api/capiro/'))keys.push(new URL(r.url()).pathname.split('/').pop()!);});
    await page.goto(`/modules/${module}?${ids}&clientId=${clientId}&objectiveId=${objectiveId}&objectiveVersion=7`);
    try {
      await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible({timeout:3000});
      expect(keys).toContain(operation);
    } finally {
      await info.attach('observed-operation-keys',{body:JSON.stringify(keys),contentType:'application/json'});
    }
  });
}
