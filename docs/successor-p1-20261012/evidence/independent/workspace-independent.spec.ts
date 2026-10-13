import {test, expect} from '/workspace/capiro-p1-workspace/node_modules/@playwright/test/index.mjs';
import {onlyLocalRequests, operationFixtures} from '/workspace/capiro-p1-workspace/apps/web/test/browser/fixtures';
import {moduleRouteFixtures} from '/workspace/capiro-p1-workspace/apps/web/test/browser/module-route-fixtures';
import {draft, prospectId, otherId} from '/workspace/capiro-p1-workspace/apps/web/tests/prospect-resources-fixtures';

const path = `/modules/workspace?prospectId=${prospectId}&draftId=${draft.id}`;
const submitted = 'Independently reviewed retained input';
async function open(page: any) {
  await onlyLocalRequests(page);
  await operationFixtures(page, {...moduleRouteFixtures, 'workspace.prospect.drafts':{drafts:[]}, 'workspace.draft':draft, 'workspace.draft.versions':[]});
  await page.goto(path);
  await page.getByLabel('Document title', {exact:true}).fill('Independent document title');
  await page.getByLabel('Body content').fill(submitted);
}

test('preflight authority read freezes input before any content write; denial cannot become success', async({page},info) => {
  await open(page);
  let release!:()=>void;
  const gate=new Promise<void>(r=>release=r);
  let entered=false;
  const writes:string[]=[];
  await page.route('**/api/capiro/me.read?*', async route=>{
    entered=true; await gate;
    await route.fulfill({status:403,json:{message:'Current writer authority denied'}});
  });
  await page.route('**/api/capiro/workspace.draft.update', route=>{writes.push('update');return route.abort();});
  await page.route('**/api/capiro/workspace.draft.snapshot', route=>{writes.push('snapshot');return route.abort();});
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect.poll(()=>entered).toBe(true);
  await expect(page.getByLabel('Document title',{exact:true})).toBeDisabled();
  await expect(page.getByLabel('Body content')).toBeDisabled();
  expect(writes).toEqual([]);
  release();
  await expect(page.getByRole('main')).toContainText('Current writer authority denied');
  await expect(page.getByLabel('Body content')).toHaveCount(0);
  expect(writes).toEqual([]);
  await page.screenshot({path:info.outputPath('denied-preflight.png')});
});

test('foreign snapshot receipt preserves submitted intent and read-current never automatically resends', async({page},info)=>{
  await open(page);
  let current=structuredClone(draft);
  const writes:string[]=[];
  await page.route('**/api/capiro/workspace.draft?*',route=>route.fulfill({json:current}));
  await page.route('**/api/capiro/workspace.draft.update',route=>{
    writes.push('update');
    const {body}=route.request().postDataJSON();
    current={...current,docTitle:body.docTitle,config:body.config,updatedAt:'2026-10-12T12:01:00Z'};
    return route.fulfill({json:current});
  });
  await page.route('**/api/capiro/workspace.draft.snapshot',route=>{
    writes.push('snapshot');
    return route.fulfill({json:{id:otherId,draftId:otherId,label:'Manual save',authorId:'test-user',authorKind:'human',createdAt:'2026-10-12T12:01:00Z'}});
  });
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('version receipt belongs to another document');
  await expect(page.getByLabel('Body content')).toHaveValue(submitted);
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  expect(writes).toEqual(['update','snapshot']);
  await page.reload();
  await expect(page.getByLabel('Body content')).toHaveValue(submitted);
  await expect(page.getByText(/previous save is not confirmed/)).toBeVisible();
  await page.getByRole('button',{name:'Read current document',exact:true}).click();
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeEnabled();
  await expect(page.getByLabel('Body content')).toHaveValue(submitted);
  expect(writes).toEqual(['update','snapshot']);
  await page.screenshot({path:info.outputPath('foreign-snapshot-reviewed.png')});
});

test('changed source version blocks dispatch while retaining editable original intent for deliberate review', async({page},info)=>{
  await open(page);
  const writes:string[]=[];
  await page.route('**/api/capiro/workspace.draft?*',route=>route.fulfill({json:{...draft,updatedAt:'2026-10-12T12:02:00Z'}}));
  await page.route('**/api/capiro/workspace.draft.update',route=>{writes.push('update');return route.abort();});
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('document changed since this editor opened');
  await expect(page.getByLabel('Body content')).toHaveValue(submitted);
  await expect(page.getByLabel('Body content')).toBeEditable();
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  expect(writes).toEqual([]);
  await page.screenshot({path:info.outputPath('changed-source-retained.png')});
});
