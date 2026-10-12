# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-lifecycle.spec.ts >> upcoming opens Preparation and retains identity across all meeting tabs
- Location: tests/browser/calendar-lifecycle.spec.ts:192:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('dialog', { name: 'Synthetic upcoming', exact: true }).getByRole('button', { name: 'Preparation', exact: true })
Expected: "true"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Synthetic upcoming', exact: true }).getByRole('button', { name: 'Preparation', exact: true })

```

# Test source

```ts
  103 |         200,
  104 |       );
  105 |     },
  106 |   );
  107 |   return { state, unexpected };
  108 | }
  109 | const url = `/calendar-boundary.html?view=agenda&date=2026-10-12&zone=UTC&clientId=${clientId}`;
  110 | 
  111 | test("client agenda filters native lifecycle status without requests or approval inference", async ({
  112 |   page,
  113 | }) => {
  114 |   const { state, unexpected } = await setup(page);
  115 |   state.meetings.push({
  116 |     ...upcoming,
  117 |     id: "prepared",
  118 |     subject: "Synthetic prepared",
  119 |     preps: [prep],
  120 |   });
  121 |   await page.goto(url);
  122 |   await expect(
  123 |     page.getByRole("columnheader", { name: "Prep", exact: true }),
  124 |   ).toBeVisible();
  125 |   const prepared = page.getByRole("row", { name: /Synthetic prepared/ });
  126 |   await expect(prepared).toContainText("Generated");
  127 |   await expect(prepared).not.toContainText("Approved");
  128 |   const reads = state.reads;
  129 |   await page.getByRole("button", { name: "Needs prep", exact: true }).click();
  130 |   await expect(
  131 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  132 |   ).toBeVisible();
  133 |   await expect(
  134 |     page.getByRole("button", { name: "Synthetic prepared", exact: true }),
  135 |   ).toHaveCount(0);
  136 |   await expect(
  137 |     page.getByRole("button", { name: completed.subject, exact: true }),
  138 |   ).toHaveCount(0);
  139 |   await page
  140 |     .getByRole("button", { name: "Needs debrief", exact: true })
  141 |     .click();
  142 |   await expect(
  143 |     page.getByRole("button", { name: completed.subject, exact: true }),
  144 |   ).toBeVisible();
  145 |   await expect(
  146 |     page.getByRole("button", { name: cancelled.subject, exact: true }),
  147 |   ).toHaveCount(0);
  148 |   await page.getByRole("button", { name: "All meetings", exact: true }).click();
  149 |   await expect(
  150 |     page.getByRole("button", { name: "Synthetic prepared", exact: true }),
  151 |   ).toBeVisible();
  152 |   expect(state.reads).toBe(reads);
  153 |   expect(state.writes).toEqual([]);
  154 |   expect(unexpected).toEqual([]);
  155 | });
  156 | 
  157 | test("omitted debrief metadata is unavailable rather than a missing debrief", async ({
  158 |   page,
  159 | }) => {
  160 |   const { state, unexpected } = await setup(page);
  161 |   const { debriefs: omitted, ...unknown } = completed;
  162 |   void omitted;
  163 |   state.meetings = [
  164 |     { ...unknown, id: "unknown", subject: "Synthetic unavailable metadata" },
  165 |     completed,
  166 |   ];
  167 |   await page.goto(url);
  168 |   await expect(
  169 |     page.getByRole("row", { name: /Synthetic unavailable metadata/ }),
  170 |   ).toContainText("Status unavailable");
  171 |   await page
  172 |     .getByRole("button", { name: "Needs debrief", exact: true })
  173 |     .click();
  174 |   await expect(
  175 |     page.getByRole("button", {
  176 |       name: "Synthetic unavailable metadata",
  177 |       exact: true,
  178 |     }),
  179 |   ).toHaveCount(0);
  180 |   await expect(
  181 |     page.getByRole("button", { name: completed.subject, exact: true }),
  182 |   ).toBeVisible();
  183 |   expect(unexpected).toEqual([]);
  184 | });
  185 | 
  186 | for (const [meeting, tab] of [
  187 |   [upcoming, "Preparation"],
  188 |   [live, "Notes"],
  189 |   [completed, "Debriefs"],
  190 |   [cancelled, "Information"],
  191 | ] as const)
  192 |   test(`${meeting.id} opens ${tab} and retains identity across all meeting tabs`, async ({
  193 |     page,
  194 |   }) => {
  195 |     const { state, unexpected } = await setup(page);
  196 |     await page.goto(`${url}&meeting=${meeting.id}`);
  197 |     const detail = page.getByRole("dialog", {
  198 |       name: meeting.subject,
  199 |       exact: true,
  200 |     });
  201 |     await expect(
  202 |       detail.getByRole("button", { name: tab, exact: true }),
> 203 |     ).toHaveAttribute("aria-pressed", "true");
      |       ^ Error: expect(locator).toHaveAttribute(expected) failed
  204 |     for (const name of ["Information", "Preparation", "Notes", "Debriefs"]) {
  205 |       await detail.getByRole("button", { name, exact: true }).click();
  206 |       const identity = detail.getByRole("region", { name: "Meeting identity" });
  207 |       await expect(identity).toContainText(`Meeting ${meeting.id}`);
  208 |       await expect(identity).toContainText("Synthetic meeting room");
  209 |       await expect(identity).toContainText("Synthetic attendee");
  210 |       await expect(identity).toContainText("UTC");
  211 |     }
  212 |     expect(state.writes).toEqual([]);
  213 |     expect(unexpected).toEqual([]);
  214 |   });
  215 | 
  216 | test("held and failed refresh hide stale lifecycle rows until an explicit successful retry", async ({
  217 |   page,
  218 | }) => {
  219 |   const { state, unexpected } = await setup(page);
  220 |   await page.goto(url);
  221 |   await expect(
  222 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  223 |   ).toBeVisible();
  224 |   state.hold = true;
  225 |   state.status = 503;
  226 |   await page.evaluate(() => {
  227 |     void window.__calendarBoundary?.refreshFeeds();
  228 |   });
  229 |   await expect.poll(() => state.reads).toBe(2);
  230 |   await expect(
  231 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  232 |   ).toHaveCount(0);
  233 |   state.release();
  234 |   await expect(page.getByRole("alert")).toContainText(
  235 |     "Synthetic meeting feed failed",
  236 |   );
  237 |   await expect(
  238 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  239 |   ).toHaveCount(0);
  240 |   state.hold = false;
  241 |   state.status = 200;
  242 |   state.meetings = [{ ...completed, subject: "Synthetic current replacement" }];
  243 |   await page.getByRole("button", { name: "Retry", exact: true }).click();
  244 |   await expect(
  245 |     page.getByRole("button", {
  246 |       name: "Synthetic current replacement",
  247 |       exact: true,
  248 |     }),
  249 |   ).toBeVisible();
  250 |   expect(state.writes).toEqual([]);
  251 |   expect(unexpected).toEqual([]);
  252 | });
  253 | 
  254 | test("meeting identity and material columns fit mobile and desktop without losing controls", async ({
  255 |   page,
  256 | }, testInfo) => {
  257 |   const { unexpected } = await setup(page);
  258 |   await page.goto(url);
  259 |   for (const width of [1440, 390]) {
  260 |     await page.setViewportSize({ width, height: 980 });
  261 |     await expect(
  262 |       page.getByRole("button", { name: "Needs prep", exact: true }),
  263 |     ).toBeVisible();
  264 |     expect(
  265 |       await page.evaluate(
  266 |         () => document.documentElement.scrollWidth <= innerWidth,
  267 |       ),
  268 |     ).toBe(true);
  269 |     await page.screenshot({
  270 |       path: testInfo.outputPath(`agenda-${width}.png`),
  271 |       fullPage: true,
  272 |     });
  273 |   }
  274 |   await page
  275 |     .getByRole("button", { name: upcoming.subject, exact: true })
  276 |     .click();
  277 |   const identity = page.getByRole("region", { name: "Meeting identity" });
  278 |   await expect(identity).toBeVisible();
  279 |   await identity.getByText(/Attendees · 1/).click();
  280 |   await expect(identity.getByRole("listitem")).toContainText("Organizer");
  281 |   await page.screenshot({
  282 |     path: testInfo.outputPath("meeting-mobile.png"),
  283 |     fullPage: true,
  284 |   });
  285 |   expect(unexpected).toEqual([]);
  286 | });
  287 | 
```