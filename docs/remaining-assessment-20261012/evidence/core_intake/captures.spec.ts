import {test,expect} from '/workspace/capiro-acceptance-assessment/node_modules/@playwright/test';
import {clientId,installFixtures} from '/workspace/capiro-acceptance-assessment/apps/web/tests/browser/fixtures';
import {installEnrichment} from '/workspace/capiro-acceptance-assessment/apps/web/tests/browser/client-enrichment-fixtures';
test('capture Add profile and three current intake steps without saving',async({page},info)=>{
 const unexpected=await installFixtures(page);
 await page.goto('/portfolio');
 await page.getByRole('button',{name:'Add profile',exact:true}).first().click();
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:info.outputPath('add-profile.png'),fullPage:true});
 await page.getByRole('button',{name:/Manual entry/}).click();
 const dialog=page.getByRole('dialog',{name:'Add profile',exact:true});
 for (const [step,name] of [[1,'Company Info'],[2,'Government Registration'],[3,'Sector & Tracks']] as const){
  await dialog.getByRole('button',{name:`${step}. ${name}`,exact:true}).click();
  await page.screenshot({path:info.outputPath(`intake-step-${step}.png`),fullPage:true});
 }
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 expect(unexpected).toEqual([]);
});
test('capture saved Meri findings review without apply or generation',async({page},info)=>{
 const {state,unexpected}=await installEnrichment(page);
 await page.goto(`/portfolio/${clientId}`);
 await page.getByRole('button',{name:'Meri actions',exact:true}).click();
 await page.getByRole('menuitem',{name:'Fill with Meri'}).click();
 const drawer=page.getByRole('dialog',{name:'Fill with Meri',exact:true});
 await expect(drawer).toContainText('Synthetic reviewed company description');
 await drawer.getByRole('button',{name:'Select all new',exact:true}).click();
 await expect(drawer.getByRole('button',{name:'Apply 2 selected',exact:true})).toBeEnabled();
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:info.outputPath('meri-findings.png'),fullPage:true});
 expect(state.posts).toHaveLength(0);
 expect(unexpected).toEqual([]);
});
