# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: replay.spec.ts >> reload retains an uncertain original command instead of creating a duplicate activity and task
- Location: ../../../../tmp/reload-negative-884204e-1/replay.spec.ts:14:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('Title', { exact: true })
Expected: ""
Received: "Independent restart duplicate activity"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" with timeout 5000ms
  - waiting for getByLabel('Title', { exact: true })
    13 × locator resolved to <input disabled required="" name="title" maxlength="300" value="Independent restart duplicate activity"/>
       - unexpected value "Independent restart duplicate activity"

```

```yaml
- textbox "Title" [disabled]: Independent restart duplicate activity
```

# Test source

```ts
  1  | import {test,expect,type Page} from '@playwright/test';
  2  | import {randomUUID} from 'node:crypto';
  3  | import {writeFileSync} from 'node:fs';
  4  | import {installCommands,completedCommand} from "/workspace/capiro-control-884204e/apps/web/tests/browser/activity-command-fixtures";
  5  | import {commandAssignee} from "/workspace/capiro-control-884204e/apps/web/tests/activity-command-fixtures";
  6  | import {json} from "/workspace/capiro-control-884204e/apps/web/tests/browser/fixtures";
  7  | 
  8  | async function fill(page:Page){
  9  |  await page.getByLabel('Title',{exact:true}).fill('Independent restart duplicate activity');
  10 |  await page.getByLabel('Details',{exact:true}).fill('Same deliberate activity content after an uncertain commit');
  11 |  await page.getByRole('checkbox',{name:'Add generic follow-up'}).check();
  12 |  await page.getByRole('combobox',{name:'Follow-up assignee',exact:true}).selectOption(commandAssignee.id);
  13 | }
  14 | test('reload retains an uncertain original command instead of creating a duplicate activity and task',async({page},info)=>{
  15 |  const {state,unexpected}=await installCommands(page);
  16 |  const commands=new Map<string,ReturnType<typeof completedCommand>>();
  17 |  state.respond=async route=>{
  18 |   if(route.request().method()==='POST' && route.request().url().endsWith('/activity-commands')){
  19 |    const input=route.request().postDataJSON();
  20 |    if(!commands.has(input.requestId)){
  21 |     const receipt=completedCommand(input);
  22 |     const commandId=randomUUID();
  23 |     receipt.commandId=commandId;
  24 |     receipt.activity.id=randomUUID();
  25 |     receipt.followUp={...receipt.followUp!,requestId:commandId,taskId:`synthetic-task-${commands.size+1}`};
  26 |     commands.set(input.requestId,receipt);
  27 |    }
  28 |    if(commands.size===1) return json(route,{message:'Synthetic response lost AFTER activity/task commit'},503);
  29 |    return json(route,commands.get(input.requestId));
  30 |   }
  31 |   const requestId=new URL(route.request().url()).pathname.split('/').at(-1)!;
  32 |   const receipt=commands.get(requestId);
  33 |   return json(route,receipt??{message:'Unavailable'},receipt?200:404);
  34 |  };
  35 |  await page.goto('/activity-command.html');
  36 |  await fill(page);
  37 |  await page.getByRole('button',{name:'Save activity and follow-up',exact:true}).click();
  38 |  await expect(page.getByText(/original request is retained/i)).toBeVisible();
  39 |  await expect(page.getByRole('button',{name:'Save activity and follow-up',exact:true})).toBeDisabled();
  40 |  const original=structuredClone(state.input);
  41 |  expect(commands.size).toBe(1);
  42 |  await page.reload();
> 43 |  await expect(page.getByLabel('Title',{exact:true})).toHaveValue('');
     |                                                      ^ Error: expect(locator).toHaveValue(expected) failed
  44 |  await expect(page.getByRole('button',{name:'Read saved command'})).toHaveCount(0);
  45 |  await page.screenshot({path:info.outputPath('reload-lost-recovery.png')});
  46 |  await fill(page);
  47 |  await page.getByRole('button',{name:'Save activity and follow-up',exact:true}).click();
  48 |  await expect(page.getByText(/follow-up created.*synthetic-task-2/i)).toBeVisible();
  49 |  const posts=state.calls.filter(call=>call.method==='POST');
  50 |  writeFileSync("/tmp/reload-negative-884204e-1/reload-duplicate.json",JSON.stringify({source:'eabc8bf8b1d28ce3e3c65993624ea967614a45b2',original,posts,committedReceipts:[...commands.values()],unexpected},null,2));
  51 |  await page.screenshot({path:info.outputPath('reload-duplicate-created.png')});
  52 |  expect(unexpected).toEqual([]);
  53 |  expect(commands.size,'one logical activity and follow-up must survive a document restart without a replacement key').toBe(1);
  54 | });
  55 | 
```