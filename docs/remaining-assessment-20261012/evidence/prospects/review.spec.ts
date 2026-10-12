import { test, expect } from '@playwright/test';
import { installFixtures, json, prospectId, prospect } from '/workspace/capiro-acceptance-assessment/apps/web/tests/browser/fixtures';
import { actor, attachment } from '/workspace/capiro-acceptance-assessment/apps/web/tests/prospect-resources-fixtures';
const catalog={version:'portfolio-3.1',createStage:'identified',legacyMapping:'pending',allowLegacyTransitions:false,stages:['identified','initiated','engaged','proposal','negotiation','closed_won','closed_lost'].map(value=>({value,label:value}))};

test('capture previously unreviewed prospect editor and pipeline frames',async({page},info)=>{
 await installFixtures(page);
 await page.route('**/business-development/prospect-stages',route=>json(route,catalog));
 await page.goto('/portfolio/prospects');
 await expect(page.getByRole('heading',{name:'Prospects 1'})).toBeVisible();
 await page.getByRole('button',{name:'Pipeline',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Prospects pipeline'})).toBeVisible();
 await page.screenshot({path:info.outputPath('pipeline-1440.png')});
 await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'+ Add prospect',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Add prospect'})).toBeVisible();
 await page.screenshot({path:info.outputPath('prospect-create-1440.png')});
 await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('link',{name:/Test Prospect/}).click();
 await page.getByRole('button',{name:'Edit details',exact:true}).click();
 await page.screenshot({path:info.outputPath('prospect-editor-1440.png')});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:info.outputPath('prospect-editor-390.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Figma files search is absent although current file records are available',async({page},info)=>{
 await installFixtures(page);
 await page.route('**/api/backend/core/me',route=>json(route,{user:{id:actor.userId,email:'synthetic@example.test'},tenant:{id:actor.tenantId,name:'Synthetic firm'},role:'user_admin'}));
 await page.route('**/api/backend/core/engagement/attachments?prospectId=*',route=>json(route,[{...attachment,prospectId,usable:true,lifecycleStatus:'available',scanStatus:'clean',uploadedByName:'Synthetic user',previewUrl:'https://storage.example.test/preview',downloadUrl:'https://storage.example.test/download'}]));
 await page.goto(`/portfolio/prospects/${prospectId}`);
 const files=page.getByRole('region',{name:'Prospect files',exact:true});
 await expect(files.getByRole('link',{name:'Preview test.txt',exact:true})).toBeVisible();
 await expect(files.getByRole('textbox',{name:/search/i})).toHaveCount(0);
 await expect(files.getByRole('searchbox')).toHaveCount(0);
 await files.screenshot({path:info.outputPath('prospect-files-current.png')});
 await page.screenshot({path:info.outputPath('prospect-detail-files-1440.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await files.screenshot({path:info.outputPath('prospect-files-390.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('prospect list retains cached cards and pipeline after a current access denial',async({page},info)=>{
 await installFixtures(page);
 await page.clock.install();
 let denied=false;let reads=0;
 await page.route('**/api/backend/core/business-development/prospects?*',route=>{reads++;return denied?json(route,{message:'Synthetic prospect access revoked'},403):json(route,{prospects:[prospect],counts:{visible:1,total:1,active:1,dismissed:0,byStage:{proposal:1}}});});
 await page.goto('/portfolio/prospects');
 await expect(page.getByRole('link',{name:/Test Prospect/})).toBeVisible();
 await page.getByRole('link',{name:/Test Prospect/}).click();
 await expect(page.getByRole('heading',{name:'Test Prospect',exact:true})).toBeVisible();
 denied=true;
 await page.clock.fastForward(31000);
 await page.getByRole('link',{name:'← Prospects',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'You do not have permission for this operation.'})).toBeVisible();
 await expect(page.getByRole('link',{name:/Test Prospect/})).toBeVisible();
 await expect(page.getByRole('button',{name:'Pipeline',exact:true})).toBeEnabled();
 await page.screenshot({path:info.outputPath('denied-prospect-list.png')});
 await page.getByRole('button',{name:'Pipeline',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Prospects pipeline'}).getByRole('link',{name:'Test Prospect',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('denied-prospect-pipeline.png')});
 expect(reads).toBeGreaterThanOrEqual(2);
});
