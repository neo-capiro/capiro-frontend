# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: actual-native-manual-debrief.spec.ts >> manual debrief reviews written context, generates only on submit and saves separately
- Location: ../../tmp/capiro-debrief-fixture-review/actual-native-manual-debrief.spec.ts:96:5

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByRole('dialog', { name: 'Review generated debrief', exact: true })
Expected: not visible
Received: visible
Timeout:  5000ms

Call log:
  - Expect "not toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Review generated debrief', exact: true })
    13 × locator resolved to <div role="dialog" tabindex="-1" id="radix-_r_1f_" data-state="open" aria-modal="true" data-slot="dialog-content" aria-labelledby="radix-_r_1g_" aria-describedby="radix-_r_1h_" class="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg b…>…</div>
       - unexpected value "visible"

```

```yaml
- dialog "Review generated debrief":
  - banner
  - paragraph: Review generated debrief
  - text: Content
  - textbox "Content": Synthetic reviewed recap Action items • Review evidence Notes Retain the written qualification.
  - checkbox "Confidential" [disabled]
  - text: Confidential Edits require approval again. Saving does not send email.
  - alert
  - button "Save debrief" [disabled]
```

# Test source

```ts
  26  |   const state = {
  27  |     requests: [] as unknown[],
  28  |     saves: 0,
  29  |     status: 200,
  30  |     hold: undefined as Promise<void> | undefined,
  31  |   };
  32  |   await page.route("**/core/engagement/capabilities", (route) =>
  33  |     json(route, {
  34  |       meetingPrepComprehensiveEnabled: false,
  35  |       runtime: { externalActionsEnabled: enabled },
  36  |     }),
  37  |   );
  38  |   await page.route("**/core/engagement/meetings**", async (route) => {
  39  |     const url = new URL(route.request().url());
  40  |     if (url.pathname.endsWith("/debrief-draft")) {
  41  |       state.requests.push(route.request().postDataJSON());
  42  |       if (state.hold) await state.hold;
  43  |       return state.status === 200
  44  |         ? json(route, {
  45  |             recap: "Synthetic reviewed recap",
  46  |             actionItems: ["Review evidence"],
  47  |             notes: "Retain the written qualification.",
  48  |             provider: "anthropic",
  49  |             model: "synthetic-model",
  50  |           })
  51  |         : json(route, { message: "Generation unavailable" }, state.status);
  52  |     }
  53  |     if (url.pathname.endsWith("/notetaker")) return json(route, null);
  54  |     if (url.pathname.endsWith("/notes")) return json(route, []);
  55  |     if (url.pathname.endsWith("/debriefs")) {
  56  |       if (route.request().method() === "POST") {
  57  |         state.saves++;
  58  |         expect(route.request().postDataJSON()).toMatchObject({
  59  |           body: "Synthetic reviewed recap\n\nAction items\n• Review evidence\n\nNotes\nRetain the written qualification.",
  60  |           confidential: false,
  61  |         });
  62  |         return json(route, {
  63  |           id: "synthetic-debrief",
  64  |           meetingId: meetingId,
  65  |           clientId: clientId,
  66  |           authorUserId: "user-test",
  67  |           confidential: false,
  68  |           status: "generated",
  69  |           sharedAt: null,
  70  |           sharedByUserId: null,
  71  |           createdAt: "2026-10-11T12:00:00Z",
  72  |           updatedAt: "2026-10-11T12:00:00Z",
  73  |         });
  74  |       }
  75  |       return json(route, []);
  76  |     }
  77  |     return json(route, url.pathname.endsWith(meetingId) ? meeting : [meeting]);
  78  |   });
  79  |   await page.goto(
  80  |     `/calendar?view=agenda&date=2026-10-10&zone=UTC&meeting=${meetingId}`,
  81  |   );
  82  |   await page
  83  |     .getByRole("dialog", { name: meeting.subject })
  84  |     .getByRole("button", { name: "Debriefs", exact: true })
  85  |     .click();
  86  |   return { state, unexpected };
  87  | }
  88  | 
  89  | async function openManual(page: Page) {
  90  |   await page
  91  |     .getByRole("button", { name: "Type Notes Manually", exact: true })
  92  |     .click();
  93  |   return page.getByRole("dialog", { name: "Type Notes Manually", exact: true });
  94  | }
  95  | 
  96  | test("manual debrief reviews written context, generates only on submit and saves separately", async ({
  97  |   page,
  98  | }, testInfo) => {
  99  |   const { state, unexpected } = await setup(page);
  100 |   const dialog = await openManual(page);
  101 |   const submit = dialog.getByRole("button", {
  102 |     name: "Generate Debrief",
  103 |     exact: true,
  104 |   });
  105 |   await expect(submit).toBeDisabled();
  106 |   await dialog.getByLabel("Meeting context", { exact: true }).fill("   ");
  107 |   await expect(submit).toBeDisabled();
  108 |   await dialog.getByLabel("Meeting context", { exact: true }).fill(source);
  109 |   expect(state.requests).toHaveLength(0);
  110 |   expect((await dialog.boundingBox())?.width).toBe(660);
  111 |   await expect(dialog.locator("textarea")).toHaveCSS("height", "180px");
  112 |   await page.screenshot({ path: testInfo.outputPath("manual-desktop.png") });
  113 |   await submit.click();
  114 |   const editor = page.getByRole("dialog", {
  115 |     name: "Review generated debrief",
  116 |     exact: true,
  117 |   });
  118 |   await expect(editor.getByLabel("Content")).toHaveValue(
  119 |     /Synthetic reviewed recap/,
  120 |   );
  121 |   expect(state.requests).toEqual([{ method: "manual", sourceText: source }]);
  122 |   expect(state.saves).toBe(0);
  123 |   await editor
  124 |     .getByRole("button", { name: "Save debrief", exact: true })
  125 |     .click();
> 126 |   await expect(editor).not.toBeVisible();
      |                            ^ Error: expect(locator).not.toBeVisible() failed
  127 |   expect(state.saves).toBe(1);
  128 |   expect(unexpected).toEqual([]);
  129 | });
  130 | 
  131 | test("manual generation failure preserves source without automatic generation or save", async ({
  132 |   page,
  133 | }) => {
  134 |   const { state } = await setup(page);
  135 |   state.status = 500;
  136 |   const dialog = await openManual(page);
  137 |   await dialog.getByLabel("Meeting context", { exact: true }).fill(source);
  138 |   await dialog
  139 |     .getByRole("button", { name: "Generate Debrief", exact: true })
  140 |     .click();
  141 |   const progress = page.getByRole("dialog", {
  142 |     name: "Generate meeting debrief",
  143 |     exact: true,
  144 |   });
  145 |   await expect(progress.getByRole("alert")).toContainText(
  146 |     "Generation unavailable",
  147 |   );
  148 |   await expect(progress).toContainText(
  149 |     "generating again starts another request",
  150 |   );
  151 |   expect(state.requests).toHaveLength(1);
  152 |   expect(state.saves).toBe(0);
  153 |   await progress.getByRole("button", { name: "Close", exact: true }).click();
  154 |   const reopened = await openManual(page);
  155 |   await expect(
  156 |     reopened.getByLabel("Meeting context", { exact: true }),
  157 |   ).toHaveValue(source);
  158 |   expect(state.requests).toHaveLength(1);
  159 | });
  160 | 
  161 | test("leaving the meeting during manual generation refuses a late draft", async ({
  162 |   page,
  163 | }) => {
  164 |   const { state } = await setup(page);
  165 |   let release!: () => void;
  166 |   state.hold = new Promise<void>((resolve) => {
  167 |     release = resolve;
  168 |   });
  169 |   const dialog = await openManual(page);
  170 |   await dialog.getByLabel("Meeting context", { exact: true }).fill(source);
  171 |   await dialog
  172 |     .getByRole("button", { name: "Generate Debrief", exact: true })
  173 |     .click();
  174 |   await expect.poll(() => state.requests.length).toBe(1);
  175 |   await page.evaluate(() => {
  176 |     history.pushState({}, "", "/calendar?view=agenda&date=2026-10-10&zone=UTC");
  177 |     window.dispatchEvent(new PopStateEvent("popstate"));
  178 |   });
  179 |   release();
  180 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  181 |   expect(state.saves).toBe(0);
  182 | });
  183 | 
  184 | test("manual source respects runtime denial and mobile dark reference geometry", async ({
  185 |   page,
  186 | }, testInfo) => {
  187 |   await setup(page, false);
  188 |   await expect(
  189 |     page.getByRole("button", { name: "Type Notes Manually", exact: true }),
  190 |   ).toBeDisabled();
  191 |   await page.unrouteAll({ behavior: "wait" });
  192 |   await page.emulateMedia({ colorScheme: "dark" });
  193 |   await page.setViewportSize({ width: 390, height: 844 });
  194 |   const { state } = await setup(page);
  195 |   const dialog = await openManual(page);
  196 |   await dialog.getByLabel("Meeting context", { exact: true }).fill(source);
  197 |   expect((await dialog.boundingBox())?.width).toBe(358);
  198 |   await expect(dialog).toHaveCSS("padding", "16px");
  199 |   await expect(dialog).toHaveCSS("background-color", "rgb(27, 27, 27)");
  200 |   expect(
  201 |     await page.evaluate(
  202 |       () => document.documentElement.scrollWidth <= innerWidth,
  203 |     ),
  204 |   ).toBe(true);
  205 |   await page.screenshot({
  206 |     path: testInfo.outputPath("manual-mobile-dark.png"),
  207 |   });
  208 |   expect(state.requests).toHaveLength(0);
  209 | });
  210 | 
```