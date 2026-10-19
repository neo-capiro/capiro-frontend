# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: replay.spec.ts >> reload retains an uncertain original command instead of creating a duplicate activity and task
- Location: ../../../../tmp/reload-negative-eabc-1/replay.spec.ts:14:1

# Error details

```
Error: one logical activity and follow-up must survive a document restart without a replacement key

expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 2
```

# Page snapshot

```yaml
- generic:
  - generic:
    - main:
      - paragraph: Synthetic command checks. All service requests are intercepted.
  - dialog "Quick log" [active] [ref=e2]:
    - banner [ref=e3]:
      - heading "Quick log" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Record activity for Synthetic client.
    - generic [ref=e10]:
      - generic [ref=e11]:
        - text: Activity type
        - combobox "Activity type" [disabled] [ref=e12]:
          - option "Note" [selected]
          - option "Call"
          - option "Logged email"
          - option "Decision"
          - option "Request"
      - generic [ref=e13]:
        - button "Record a meeting" [disabled] [ref=e14]
        - generic [ref=e15]: Enter the required start and end times in Calendar.
      - generic [ref=e16]:
        - text: Title
        - textbox "Title" [disabled] [ref=e17]: Independent restart duplicate activity
      - generic [ref=e18]:
        - generic [ref=e19]: Details
        - textbox "Details" [disabled] [ref=e20]: Same deliberate activity content after an uncertain commit
      - generic [ref=e21]: Logged email records history; it does not send a message.
      - generic [ref=e22]:
        - checkbox "Add generic follow-up" [checked] [disabled] [ref=e23]
        - text: Add generic follow-up
      - group "Generic follow-up" [ref=e24]:
        - generic [ref=e25]: Generic follow-up
        - paragraph [ref=e26]: Creates “Follow up on logged activity” in Planner. The task includes an assignee and optional schedule; activity text and client or person details are not copied.
        - generic [ref=e27]:
          - text: Follow-up assignee
          - combobox "Follow-up assignee" [disabled] [ref=e28]:
            - option "Choose a current member" [disabled]
            - option "Synthetic Assignee" [disabled] [selected]
        - generic [ref=e29]:
          - text: Follow-up date (optional)
          - textbox "Follow-up date (optional)" [disabled] [ref=e30]
        - generic [ref=e31]:
          - text: Follow-up time (optional)
          - textbox "Follow-up time (optional)" [disabled] [ref=e32]
        - generic [ref=e33]:
          - text: Follow-up IANA time zone
          - textbox "Follow-up IANA time zone" [disabled] [ref=e34]:
            - /placeholder: America/New_York
        - generic [ref=e35]: A date requires an explicit time zone. Leave all schedule fields empty for an unscheduled follow-up.
      - region "Activity and follow-up result" [ref=e36]:
        - paragraph [ref=e37]:
          - text: "Retained activity:"
          - strong [ref=e38]: Independent restart duplicate activity
        - paragraph [ref=e39]:
          - text: "Request:"
          - code [ref=e40]: 167b3ade-4dae-4797-bcfe-de463c22cf0c
        - status [ref=e41]: Activity saved.
        - paragraph [ref=e42]: "Follow-up created. Task: synthetic-task-2"
        - generic [ref=e43]:
          - button "Read saved command" [ref=e44] [cursor=pointer]
          - button "Done" [ref=e45] [cursor=pointer]
      - button "Save activity and follow-up" [disabled] [ref=e47]
```

# Test source

```ts
  1  | import {test,expect,type Page} from '@playwright/test';
  2  | import {randomUUID} from 'node:crypto';
  3  | import {writeFileSync} from 'node:fs';
  4  | import {installCommands,completedCommand} from "/workspace/capiro-control-eabc/apps/web/tests/browser/activity-command-fixtures";
  5  | import {commandAssignee} from "/workspace/capiro-control-eabc/apps/web/tests/activity-command-fixtures";
  6  | import {json} from "/workspace/capiro-control-eabc/apps/web/tests/browser/fixtures";
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
  43 |  await expect(page.getByLabel('Title',{exact:true})).toHaveValue('');
  44 |  await expect(page.getByRole('button',{name:'Read saved command'})).toHaveCount(0);
  45 |  await page.screenshot({path:info.outputPath('reload-lost-recovery.png')});
  46 |  await fill(page);
  47 |  await page.getByRole('button',{name:'Save activity and follow-up',exact:true}).click();
  48 |  await expect(page.getByText(/follow-up created.*synthetic-task-2/i)).toBeVisible();
  49 |  const posts=state.calls.filter(call=>call.method==='POST');
  50 |  writeFileSync("/tmp/reload-negative-eabc-1/reload-duplicate.json",JSON.stringify({source:'eabc8bf8b1d28ce3e3c65993624ea967614a45b2',original,posts,committedReceipts:[...commands.values()],unexpected},null,2));
  51 |  await page.screenshot({path:info.outputPath('reload-duplicate-created.png')});
  52 |  expect(unexpected).toEqual([]);
> 53 |  expect(commands.size,'one logical activity and follow-up must survive a document restart without a replacement key').toBe(1);
     |                                                                                                                       ^ Error: one logical activity and follow-up must survive a document restart without a replacement key
  54 | });
  55 | 
```