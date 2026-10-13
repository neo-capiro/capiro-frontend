# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control.spec.ts >> VD06 Modules Calendar uses its compact authored shell
- Location: ../../../../tmp/capiro-visual-closeout/modules/control.spec.ts:4:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 264
Received: 296
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "Skip to content" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - banner [ref=e5]:
      - link "Capiro Home" [ref=e6] [cursor=pointer]:
        - /url: /
        - img "Capiro" [ref=e7]
      - navigation "Product modes" [ref=e8]:
        - link "Meri" [ref=e9] [cursor=pointer]:
          - /url: /meri
          - img [ref=e11]
        - link "Portfolio" [ref=e12] [cursor=pointer]:
          - /url: /
          - img [ref=e14]
        - link "Modules" [ref=e15] [cursor=pointer]:
          - /url: /modules
          - img [ref=e17]
      - navigation "Workspace actions" [ref=e18]:
        - link "Quick log" [ref=e19] [cursor=pointer]:
          - /url: /?log=1
          - img [ref=e21]
        - link "Master calendar" [ref=e22] [cursor=pointer]:
          - /url: /calendar
          - img [ref=e24]
        - link "Search intelligence" [ref=e25] [cursor=pointer]:
          - /url: /modules/intelligence
          - img [ref=e27]
        - button "Updates — unavailable" [disabled] [ref=e28]:
          - img [ref=e30]
        - link "Account settings" [ref=e31] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e33]
    - generic [ref=e34]:
      - complementary [ref=e35]:
        - paragraph [ref=e36]: Modules
        - navigation "Modules" [ref=e37]:
          - link "Module hub" [ref=e38] [cursor=pointer]:
            - /url: /modules
            - img [ref=e40]
            - generic [ref=e41]: Module hub
          - link "Engagement" [ref=e42] [cursor=pointer]:
            - /url: /modules/engagement
            - img [ref=e44]
            - generic [ref=e45]: Engagement
          - link "Planner" [ref=e46] [cursor=pointer]:
            - /url: /modules/planner
            - img [ref=e48]
            - generic [ref=e49]: Planner
          - link "Calendar" [ref=e50] [cursor=pointer]:
            - /url: /modules/calendar
            - img [ref=e52]
            - generic [ref=e53]: Calendar
          - link "Workspace" [ref=e54] [cursor=pointer]:
            - /url: /modules/workspace
            - img [ref=e56]
            - generic [ref=e57]: Workspace
          - link "Strategies" [ref=e58] [cursor=pointer]:
            - /url: /modules/strategies
            - img [ref=e60]
            - generic [ref=e61]: Strategies
          - link "Directory" [ref=e62] [cursor=pointer]:
            - /url: /modules/directory
            - img [ref=e64]
            - generic [ref=e65]: Directory
          - link "Intelligence" [ref=e66] [cursor=pointer]:
            - /url: /modules/intelligence
            - img [ref=e68]
            - generic [ref=e69]: Intelligence
          - link "Research portfolios" [ref=e70] [cursor=pointer]:
            - /url: /modules/research-portfolios
            - img [ref=e72]
            - generic [ref=e73]: Research portfolios
        - link "Settings" [ref=e74] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e76]
          - generic [ref=e77]: Settings
      - main [ref=e78]:
        - navigation "Breadcrumb" [ref=e79]:
          - link "← Modules" [ref=e80] [cursor=pointer]:
            - /url: /modules
          - generic [ref=e81]: /
          - combobox "Switch module" [ref=e82] [cursor=pointer]:
            - generic: Calendar
            - img [ref=e83]
        - generic [ref=e85]:
          - generic [ref=e86]:
            - generic [ref=e87]:
              - heading "Master calendar" [level=1] [ref=e88]
              - paragraph [ref=e89]: Your meetings across client profiles, with preparation, notes and debriefs.
            - generic [ref=e90]:
              - generic [ref=e91]:
                - img [ref=e92]
                - combobox "Calendar client scope" [ref=e93] [cursor=pointer]:
                  - option "Master view" [selected]
                - img
              - button "New meeting" [ref=e94] [cursor=pointer]
          - region "Master calendar" [ref=e95]:
            - generic [ref=e96]:
              - generic [ref=e97]:
                - button "Previous calendar period" [ref=e98] [cursor=pointer]
                - button "Today" [ref=e99] [cursor=pointer]
                - button "Next calendar period" [ref=e100] [cursor=pointer]
              - button "Choose calendar date" [ref=e101] [cursor=pointer]: October 2026
              - paragraph [ref=e102]: 0 items in view · Eastern time
              - generic "Calendar view" [ref=e103]:
                - button "Month" [ref=e104] [cursor=pointer]
                - button "Week" [ref=e105] [cursor=pointer]
                - button "Agenda" [active] [pressed] [ref=e106] [cursor=pointer]
            - generic [ref=e107]:
              - button "Meetings 0" [pressed] [ref=e108] [cursor=pointer]:
                - text: Meetings
                - generic [ref=e110]: "0"
              - button "Hearings Unavailable" [pressed] [ref=e111] [cursor=pointer]:
                - text: Hearings
                - generic [ref=e113]: Unavailable
              - button "Planner 0" [pressed] [ref=e114] [cursor=pointer]:
                - text: Planner
                - generic [ref=e116]: "0"
              - button "Government Unavailable" [pressed] [ref=e117] [cursor=pointer]:
                - text: Government
                - generic [ref=e119]: Unavailable
              - button "Deadlines 0" [pressed] [ref=e120] [cursor=pointer]:
                - text: Deadlines
                - generic [ref=e122]: "0"
              - paragraph [ref=e123]: Master view · All client profiles · Your accessible meetings
            - generic [ref=e124]:
              - textbox "Search calendar events" [ref=e125]:
                - /placeholder: Search displayed events
              - button "Clear filters" [ref=e126] [cursor=pointer]
            - table [ref=e127]:
              - rowgroup [ref=e128]:
                - row "When Event Source" [ref=e129]:
                  - columnheader "When" [ref=e130]
                  - columnheader "Event" [ref=e131]
                  - columnheader "Source" [ref=e132]
              - rowgroup
            - generic [ref=e133]:
              - heading "No events match this view" [level=2] [ref=e134]
              - paragraph [ref=e135]: Adjust your filters or add a record to get started.
            - note [ref=e136]:
              - paragraph [ref=e137]: "Government unavailable: Unconfigured test operation: calendar.effectiveDates"
              - paragraph [ref=e138]: "Hearings unavailable: Unconfigured test operation: legiwatch.calendar"
              - paragraph [ref=e139]: "Federal Register deadlines unavailable: Unconfigured test operation: calendar.commentDeadlines"
              - paragraph [ref=e140]: "Funding deadlines unavailable: Unconfigured test operation: intelligence.funding.search"
  - paragraph [ref=e141]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {onlyLocalRequests,operationFixtures} from '/workspace/capiro-visual-closeout/apps/web/test/browser/fixtures';
  3  | import {moduleRouteFixtures} from '/workspace/capiro-visual-closeout/apps/web/test/browser/module-route-fixtures';
  4  | test('VD06 Modules Calendar uses its compact authored shell',async({page},info)=>{
  5  |  await onlyLocalRequests(page);await operationFixtures(page,moduleRouteFixtures);await page.goto('/modules/calendar');await page.getByRole('button',{name:'Agenda',exact:true}).click();
  6  |  await page.screenshot({path:info.outputPath('calendar-before.png')});
  7  |  const card=page.getByRole('table').locator('..');const bounds=await page.getByRole('heading',{name:'Master calendar',exact:true}).boundingBox();
> 8  |  expect(bounds!.x).toBe(264);expect(bounds!.y).toBeLessThan(150);
     |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  9  |  const toolbar=await page.getByRole('button',{name:'Today',exact:true}).boundingBox();expect(toolbar!.y).toBeLessThan(220);
  10 | });
  11 | 
```