# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-artifact-receipts.spec.ts >> debriefs: synchronous submit guard sends one creation
- Location: apps/web/tests/browser/calendar-artifact-receipts.spec.ts:45:2

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 1
Received: 2
```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "Synthetic artifact receipt review" [level=1] [ref=e4]
  - button "Replace client" [ref=e5] [cursor=pointer]
  - button "Toggle artifacts" [ref=e6] [cursor=pointer]
  - paragraph [ref=e7]: "Current client: client-one"
  - generic [ref=e8]:
    - generic [ref=e9]:
      - heading "Debriefs" [level=3] [ref=e10]
      - button "Add debrief" [active] [ref=e11] [cursor=pointer]
    - button "Use saved meeting notes" [disabled] [ref=e12]
    - button "Transcript and attachments" [disabled] [ref=e13]
    - button "Type Notes Manually" [disabled] [ref=e14]
    - button "Record Voice Memo" [disabled] [ref=e15]
    - generic [ref=e16]: Source extraction and debrief generation are unavailable in this environment.
    - paragraph [ref=e17]: No debriefs yet.
```

# Test source

```ts
  1  | import { test, expect, type Page } from "@playwright/test";
  2  | import { installFixtures, json } from "./fixtures";
  3  | 
  4  | const meeting = { id: "meeting-one", subject: "Synthetic receipt review", description: null, location: null, startsAt: "2026-10-10T14:00:00Z", endsAt: "2026-10-10T15:00:00Z", status: "scheduled", joinLink: null, visibility: "private", isVirtual: false, meri: null, client: { id: "client-one", name: "client-one" }, attendees: [], preps: [] };
  5  | const metadata = { id: "artifact-one", meetingId: meeting.id, clientId: "client-one", authorUserId: "user-test", confidential: false, status: "draft", sharedAt: null, sharedByUserId: null, createdAt: "2026-10-10T15:00:00Z", updatedAt: "2026-10-10T15:00:00Z" };
  6  | function held() { let release!: () => void; const promise = new Promise<void>(resolve => {release = resolve;}); return {promise,release}; }
  7  | async function setup(page: Page, kind: string) {
  8  |   await installFixtures(page);
  9  |   const state = { writes: 0, receipt: metadata as unknown, status: 200, hold: undefined as Promise<void> | undefined, readHold: undefined as Promise<void> | undefined, reads: 0, clientId: "client-one", items: [] as unknown[] };
  10 |   await page.route("**/core/engagement/meetings/**", async route => {
  11 |     if (route.request().method() !== "GET") { state.writes++; if(state.hold) await state.hold; return json(route, state.receipt, state.status).catch(()=>{}); }
  12 |     if(new URL(route.request().url()).pathname.endsWith(`/${kind}`)) return json(route, state.items);
  13 |     state.reads++; if(state.readHold) await state.readHold;
  14 |     return json(route, { ...meeting, client: {id:state.clientId,name:state.clientId} }).catch(()=>{});
  15 |   });
  16 |   await page.goto(`/calendar-artifact-receipts.html?kind=${kind}`);
  17 |   await expect(page.getByText(`No ${kind} yet.`)).toBeVisible();
  18 |   return state;
  19 | }
  20 | async function draft(page: Page, singular: string) {
  21 |   await page.getByRole("button", {name:`Add ${singular}`,exact:true}).click();
  22 |   await page.getByLabel("Content", {exact:true}).fill("Retain this synthetic draft");
  23 | }
  24 | for(const kind of ["notes", "debriefs"]) {
  25 |  const singular = kind === "notes" ? "note" : "debrief";
  26 |  test(`${kind}: malformed receipt preserves draft and fences repeat creation`, async ({page}) => {
  27 |   const state = await setup(page, kind); state.receipt = {};
  28 |   await draft(page,singular); await page.getByRole("button",{name:`Save ${singular}`}).click();
  29 |   await expect(page.getByLabel("Content",{exact:true})).toHaveValue("Retain this synthetic draft");
  30 |   await expect(page.getByRole("button",{name:`Save ${singular}`})).toBeDisabled();
  31 |   await expect(page.getByText(/may have completed/).first()).toBeVisible();
  32 |   expect(state.writes).toBe(1);
  33 |  });
  34 |  test(`${kind}: uncertain creation cannot be repeated after remount`, async ({page}) => {
  35 |   const state = await setup(page, kind); state.status = 503;
  36 |   await draft(page,singular); await page.getByRole("button",{name:`Save ${singular}`}).click();
  37 |   await expect(page.getByRole("button",{name:`Save ${singular}`})).toBeDisabled();
  38 |   await page.keyboard.press("Escape");
  39 |   await page.getByRole("button",{name:"Toggle artifacts"}).click();
  40 |   await page.getByRole("button",{name:"Toggle artifacts"}).click();
  41 |   await expect(page.getByLabel("Content",{exact:true})).toHaveValue("Retain this synthetic draft");
  42 |   await expect(page.getByRole("button",{name:`Save ${singular}`})).toBeDisabled();
  43 |   expect(state.writes).toBe(1);
  44 |  });
  45 |  test(`${kind}: synchronous submit guard sends one creation`, async ({page}) => {
  46 |   const state = await setup(page, kind); const pending = held(); state.hold = pending.promise;
  47 |   await draft(page,singular);
  48 |   await page.locator("[role=dialog] form").evaluate(form => {form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});
  49 |   await expect.poll(()=>state.writes).toBeGreaterThan(0);
  50 |   pending.release(); await expect(page.getByRole("dialog")).toHaveCount(0);
> 51 |   expect(state.writes).toBe(1);
     |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  52 |  });
  53 | }
  54 | 
```