import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {installCommands,completedCommand} from './activity-command-fixtures';
import {commandAssignee} from '../activity-command-fixtures';
import {json} from './fixtures';

async function fill(page:Page){
 await page.getByLabel('Title',{exact:true}).fill('Independent restart recovery activity');
 await page.getByLabel('Details',{exact:true}).fill('Exact protected activity body retained for deliberate recovery');
 await page.getByRole('checkbox',{name:'Add generic follow-up'}).check();
 await page.getByRole('combobox',{name:'Follow-up assignee',exact:true}).selectOption(commandAssignee.id);
}
test('restart revalidates current identity, retains the original key/body and explicitly recovers after nondisclosing 404',async({page})=>{
 const {state,unexpected}=await installCommands(page);
 let identityReads=0,loseNextResponse=true;
 await page.route('**/api/backend/core/me',route=>{identityReads++;return json(route,state.identity);});
 const commands=new Map<string,ReturnType<typeof completedCommand>>();
 state.respond=async route=>{
  if(route.request().method()==='POST'&&route.request().url().endsWith('/activity-commands')){
   const input=route.request().postDataJSON();
   if(!commands.has(input.requestId)){
    const receipt=completedCommand(input),commandId=randomUUID();
    receipt.commandId=commandId;
    receipt.activity.id=randomUUID();
    receipt.followUp={...receipt.followUp!,requestId:commandId,taskId:`synthetic-task-${commands.size+1}`};
    commands.set(input.requestId,receipt);
   }
   if(loseNextResponse){loseNextResponse=false;return json(route,{message:'Synthetic response lost AFTER activity/task commit'},503);}
   return json(route,commands.get(input.requestId));
  }
  return json(route,{message:'Synthetic nondisclosing receipt miss'},404);
 };
 await page.goto('/activity-command.html');
 await fill(page);
 await page.getByRole('button',{name:'Save activity and follow-up',exact:true}).click();
 await expect(page.getByText(/original request is retained/i)).toBeVisible();
 const original=structuredClone(state.input)!;
 expect(commands.size).toBe(1);
 const readsBeforeReload=identityReads;
 await page.reload();
 await expect.poll(()=>identityReads).toBeGreaterThan(readsBeforeReload);
 await expect(page.getByLabel('Title',{exact:true})).toHaveValue(original.activity.title);
 await expect(page.getByLabel('Details',{exact:true})).toHaveValue(original.activity.body??'');
 await expect(page.getByText(original.requestId,{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Save activity and follow-up',exact:true})).toBeDisabled();
 expect(state.calls.filter(call=>call.method==='POST')).toHaveLength(1);
 await page.getByRole('button',{name:'Read saved command',exact:true}).click();
 await expect(page.getByRole('button',{name:'Recover original save',exact:true})).toBeEnabled();
 expect(state.calls.filter(call=>call.method==='POST')).toHaveLength(1);
 expect(state.calls.filter(call=>call.method==='GET').every(call=>call.path.endsWith(`/${original.requestId}`))).toBe(true);
 await page.getByRole('button',{name:'Recover original save',exact:true}).click();
 await expect(page.getByText(/follow-up created.*synthetic-task-1/i)).toBeVisible();
 expect(state.calls.filter(call=>call.method==='POST').map(call=>call.body)).toEqual([original,original]);
 expect(commands.size).toBe(1);
 expect(unexpected).toEqual([]);
});
test('restart under a replacement Core actor cannot expose or recover the former actor command',async({page})=>{
 const {state,unexpected}=await installCommands(page);
 state.respond=route=>json(route,{message:'Synthetic response lost after dispatch'},503);
 await page.goto('/activity-command.html');
 await fill(page);
 await page.getByRole('button',{name:'Save activity and follow-up',exact:true}).click();
 await expect(page.getByText(/original request is retained/i)).toBeVisible();
 const original=structuredClone(state.input)!;
 state.identity={...state.identity,user:{...state.identity.user,id:commandAssignee.id}};
 await page.reload();
 await expect(page.getByRole('button',{name:'Save activity',exact:true})).toBeEnabled();
 await expect(page.getByLabel('Title',{exact:true})).toHaveValue('');
 await expect(page.getByText(original.requestId,{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Recover original save',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Read saved command',exact:true})).toHaveCount(0);
 expect(state.calls).toHaveLength(1);
 expect(unexpected).toEqual([]);
});
