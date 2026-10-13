# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-lifecycle.spec.ts >> upcoming opens Preparation and retains identity across all meeting tabs
- Location: tests/browser/calendar-lifecycle.spec.ts:194:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByRole('dialog', { name: 'Synthetic upcoming', exact: true }).getByRole('button', { name: 'Preparation', exact: true })
Expected: "true"
Received: "false"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Synthetic upcoming', exact: true }).getByRole('button', { name: 'Preparation', exact: true })
    14 × locator resolved to <button class="button " aria-pressed="false">Preparation</button>
       - unexpected value "false"

```

```yaml
- button "Preparation"
```

# Test source

```ts
  105 |         200,
  106 |       );
  107 |     },
  108 |   );
  109 |   return { state, unexpected };
  110 | }
  111 | const url = `/calendar-boundary.html?view=agenda&date=${day}&zone=UTC&clientId=${clientId}`;
  112 | 
  113 | test("client agenda filters native lifecycle status without requests or approval inference", async ({
  114 |   page,
  115 | }) => {
  116 |   const { state, unexpected } = await setup(page);
  117 |   state.meetings.push({
  118 |     ...upcoming,
  119 |     id: "prepared",
  120 |     subject: "Synthetic prepared",
  121 |     preps: [prep],
  122 |   });
  123 |   await page.goto(url);
  124 |   await expect(
  125 |     page.getByRole("columnheader", { name: "Prep", exact: true }),
  126 |   ).toBeVisible();
  127 |   const prepared = page.getByRole("row", { name: /Synthetic prepared/ });
  128 |   await expect(prepared).toContainText("Generated");
  129 |   await expect(prepared).not.toContainText("Approved");
  130 |   const reads = state.reads;
  131 |   await page.getByRole("button", { name: "Needs prep", exact: true }).click();
  132 |   await expect(
  133 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  134 |   ).toBeVisible();
  135 |   await expect(
  136 |     page.getByRole("button", { name: "Synthetic prepared", exact: true }),
  137 |   ).toHaveCount(0);
  138 |   await expect(
  139 |     page.getByRole("button", { name: completed.subject, exact: true }),
  140 |   ).toHaveCount(0);
  141 |   await page
  142 |     .getByRole("button", { name: "Needs debrief", exact: true })
  143 |     .click();
  144 |   await expect(
  145 |     page.getByRole("button", { name: completed.subject, exact: true }),
  146 |   ).toBeVisible();
  147 |   await expect(
  148 |     page.getByRole("button", { name: cancelled.subject, exact: true }),
  149 |   ).toHaveCount(0);
  150 |   await page.getByRole("button", { name: "All meetings", exact: true }).click();
  151 |   await expect(
  152 |     page.getByRole("button", { name: "Synthetic prepared", exact: true }),
  153 |   ).toBeVisible();
  154 |   expect(state.reads).toBe(reads);
  155 |   expect(state.writes).toEqual([]);
  156 |   expect(unexpected).toEqual([]);
  157 | });
  158 | 
  159 | test("omitted debrief metadata is unavailable rather than a missing debrief", async ({
  160 |   page,
  161 | }) => {
  162 |   const { state, unexpected } = await setup(page);
  163 |   const { debriefs: omitted, ...unknown } = completed;
  164 |   void omitted;
  165 |   state.meetings = [
  166 |     { ...unknown, id: "unknown", subject: "Synthetic unavailable metadata" },
  167 |     completed,
  168 |   ];
  169 |   await page.goto(url);
  170 |   await expect(
  171 |     page.getByRole("row", { name: /Synthetic unavailable metadata/ }),
  172 |   ).toContainText("Status unavailable");
  173 |   await page
  174 |     .getByRole("button", { name: "Needs debrief", exact: true })
  175 |     .click();
  176 |   await expect(
  177 |     page.getByRole("button", {
  178 |       name: "Synthetic unavailable metadata",
  179 |       exact: true,
  180 |     }),
  181 |   ).toHaveCount(0);
  182 |   await expect(
  183 |     page.getByRole("button", { name: completed.subject, exact: true }),
  184 |   ).toBeVisible();
  185 |   expect(unexpected).toEqual([]);
  186 | });
  187 | 
  188 | for (const [meeting, tab] of [
  189 |   [upcoming, "Preparation"],
  190 |   [live, "Notes"],
  191 |   [completed, "Debriefs"],
  192 |   [cancelled, "Information"],
  193 | ] as const)
  194 |   test(`${meeting.id} opens ${tab} and retains identity across all meeting tabs`, async ({
  195 |     page,
  196 |   }) => {
  197 |     const { state, unexpected } = await setup(page);
  198 |     await page.goto(`${url}&meeting=${meeting.id}`);
  199 |     const detail = page.getByRole("dialog", {
  200 |       name: meeting.subject,
  201 |       exact: true,
  202 |     });
  203 |     await expect(
  204 |       detail.getByRole("button", { name: tab, exact: true }),
> 205 |     ).toHaveAttribute("aria-pressed", "true");
      |       ^ Error: expect(locator).toHaveAttribute(expected) failed
  206 |     for (const name of ["Information", "Preparation", "Notes", "Debriefs"]) {
  207 |       await detail.getByRole("button", { name, exact: true }).click();
  208 |       const identity = detail.getByRole("region", { name: "Meeting identity" });
  209 |       await expect(identity).toContainText(`Meeting ${meeting.id}`);
  210 |       await expect(identity).toContainText("Synthetic meeting room");
  211 |       await expect(identity).toContainText("Synthetic attendee");
  212 |       await expect(identity).toContainText("UTC");
  213 |     }
  214 |     expect(state.writes).toEqual([]);
  215 |     expect(unexpected).toEqual([]);
  216 |   });
  217 | 
  218 | test("held and failed refresh hide stale lifecycle rows until an explicit successful retry", async ({
  219 |   page,
  220 | }) => {
  221 |   const { state, unexpected } = await setup(page);
  222 |   await page.goto(url);
  223 |   await expect(
  224 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  225 |   ).toBeVisible();
  226 |   state.hold = true;
  227 |   state.status = 503;
  228 |   await page.evaluate(() => {
  229 |     void window.__calendarBoundary?.refreshFeeds();
  230 |   });
  231 |   await expect.poll(() => state.reads).toBe(2);
  232 |   await expect(
  233 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  234 |   ).toHaveCount(0);
  235 |   state.release();
  236 |   await expect(page.getByRole("alert")).toContainText(
  237 |     "Synthetic meeting feed failed",
  238 |   );
  239 |   await expect(
  240 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  241 |   ).toHaveCount(0);
  242 |   state.hold = false;
  243 |   state.status = 200;
  244 |   state.meetings = [{ ...completed, subject: "Synthetic current replacement" }];
  245 |   await page.getByRole("button", { name: "Retry", exact: true }).click();
  246 |   await expect(
  247 |     page.getByRole("button", {
  248 |       name: "Synthetic current replacement",
  249 |       exact: true,
  250 |     }),
  251 |   ).toBeVisible();
  252 |   expect(state.writes).toEqual([]);
  253 |   expect(unexpected).toEqual([]);
  254 | });
  255 | 
  256 | test("meeting identity and material columns fit mobile and desktop without losing controls", async ({
  257 |   page,
  258 | }, testInfo) => {
  259 |   const { unexpected } = await setup(page);
  260 |   await page.goto(url);
  261 |   for (const width of [1440, 390]) {
  262 |     await page.setViewportSize({ width, height: 980 });
  263 |     await expect(
  264 |       page.getByRole("button", { name: "Needs prep", exact: true }),
  265 |     ).toBeVisible();
  266 |     expect(
  267 |       await page.evaluate(
  268 |         () => document.documentElement.scrollWidth <= innerWidth,
  269 |       ),
  270 |     ).toBe(true);
  271 |     await page.screenshot({
  272 |       path: testInfo.outputPath(`agenda-${width}.png`),
  273 |       fullPage: true,
  274 |     });
  275 |   }
  276 |   await page
  277 |     .getByRole("button", { name: upcoming.subject, exact: true })
  278 |     .click();
  279 |   const identity = page.getByRole("region", { name: "Meeting identity" });
  280 |   await expect(identity).toBeVisible();
  281 |   await identity.getByText(/Attendees · 1/).click();
  282 |   await expect(identity.getByRole("listitem")).toContainText("Organizer");
  283 |   await page.screenshot({
  284 |     path: testInfo.outputPath("meeting-mobile.png"),
  285 |     fullPage: true,
  286 |   });
  287 |   expect(unexpected).toEqual([]);
  288 | });
  289 | 
```