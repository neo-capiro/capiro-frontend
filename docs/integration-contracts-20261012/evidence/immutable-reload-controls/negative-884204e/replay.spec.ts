import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {installCommands,completedCommand} from "/workspace/capiro-control-884204e/apps/web/tests/browser/activity-command-fixtures";
import {commandAssignee} from "/workspace/capiro-control-884204e/apps/web/tests/activity-command-fixtures";
import {json} from "/workspace/capiro-control-884204e/apps/web/tests/browser/fixtures";

async function fill(page:Page){
 await page.getByLabel('Title',{exact:true}).fill('Independent restart duplicate activity');
 await page.getByLabel('Details',{exact:true}).fill('Same deliberate activity content after an uncertain commit');
 await page.getByRole('checkbox',{name:'Add generic follow-up'}).check();
 await page.getByRole('combobox',{name:'Follow-up assignee',exact:true}).selectOption(commandAssignee.id);
}
test('reload retains an uncertain original command instead of creating a duplicate activity and task',async({page},info)=>{
 const {state,unexpected}=await installCommands(page);
 const commands=new Map<string,ReturnType<typeof completedCommand>>();
 state.respond=async route=>{
  if(route.request().method()==='POST' && route.request().url().endsWith('/activity-commands')){
   const input=route.request().postDataJSON();
   if(!commands.has(input.requestId)){
    const receipt=completedCommand(input);
    const commandId=randomUUID();
    receipt.commandId=commandId;
    receipt.activity.id=randomUUID();
    receipt.followUp={...receipt.followUp!,requestId:commandId,taskId:`synthetic-task-${commands.size+1}`};
    commands.set(input.requestId,receipt);
   }
   if(commands.size===1) return json(route,{message:'Synthetic response lost AFTER activity/task commit'},503);
   return json(route,commands.get(input.requestId));
  }
  const requestId=new URL(route.request().url()).pathname.split('/').at(-1)!;
  const receipt=commands.get(requestId);
  return json(route,receipt??{message:'Unavailable'},receipt?200:404);
 };
 await page.goto('/activity-command.html');
 await fill(page);
 await page.getByRole('button',{name:'Save activity and follow-up',exact:true}).click();
 await expect(page.getByText(/original request is retained/i)).toBeVisible();
 await expect(page.getByRole('button',{name:'Save activity and follow-up',exact:true})).toBeDisabled();
 const original=structuredClone(state.input);
 expect(commands.size).toBe(1);
 await page.reload();
 await expect(page.getByLabel('Title',{exact:true})).toHaveValue('');
 await expect(page.getByRole('button',{name:'Read saved command'})).toHaveCount(0);
 await page.screenshot({path:info.outputPath('reload-lost-recovery.png')});
 await fill(page);
 await page.getByRole('button',{name:'Save activity and follow-up',exact:true}).click();
 await expect(page.getByText(/follow-up created.*synthetic-task-2/i)).toBeVisible();
 const posts=state.calls.filter(call=>call.method==='POST');
 writeFileSync("/tmp/reload-negative-884204e-1/reload-duplicate.json",JSON.stringify({source:'eabc8bf8b1d28ce3e3c65993624ea967614a45b2',original,posts,committedReceipts:[...commands.values()],unexpected},null,2));
 await page.screenshot({path:info.outputPath('reload-duplicate-created.png')});
 expect(unexpected).toEqual([]);
 expect(commands.size,'one logical activity and follow-up must survive a document restart without a replacement key').toBe(1);
});
