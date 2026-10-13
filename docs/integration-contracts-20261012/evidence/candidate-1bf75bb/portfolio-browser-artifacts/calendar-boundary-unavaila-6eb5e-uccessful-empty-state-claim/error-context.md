# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-boundary.spec.ts >> unavailable Calendar feeds do not become a successful empty-state claim
- Location: tests/browser/calendar-boundary.spec.ts:230:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('button', { name: 'Retry' })
Expected: 4
Received: 5
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Retry' })
    14 × locator resolved to 5 elements
       - unexpected value "5"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: Your accessible calendar
      - heading "Master Calendar" [level=1] [ref=e7]
    - generic [ref=e8]:
      - button "Meeting library" [ref=e9] [cursor=pointer]
      - button "Sync calendar" [ref=e10] [cursor=pointer]
      - button "New meeting" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
        - text: New meeting
  - generic [ref=e13]:
    - combobox "Calendar scope" [ref=e14]:
      - option "Master view" [selected]
      - option "Test Aerospace"
    - button "Previous period" [ref=e15] [cursor=pointer]:
      - img [ref=e16]
    - button "Today" [ref=e18] [cursor=pointer]
    - button "Next period" [ref=e19] [cursor=pointer]:
      - img [ref=e20]
    - textbox "Calendar date" [ref=e22]: 2026-10-15
    - combobox "Calendar view" [ref=e23]:
      - option "Month"
      - option "Week"
      - option "Agenda" [selected]
    - combobox "Calendar timezone" [ref=e24]:
      - option "America/New_York"
      - option "America/Chicago"
      - option "America/Denver"
      - option "America/Los_Angeles"
      - option "Pacific/Honolulu"
      - option "UTC" [selected]
  - generic [ref=e25]:
    - textbox "Search calendar events" [ref=e26]:
      - /placeholder: Search events…
    - button "Meeting" [pressed] [ref=e27] [cursor=pointer]
    - button "Hearing" [pressed] [ref=e28] [cursor=pointer]
    - button "Planner" [pressed] [ref=e29] [cursor=pointer]
    - button "Deadline" [pressed] [ref=e30] [cursor=pointer]
    - button "Government" [pressed] [ref=e31] [cursor=pointer]
    - generic "Forecast dates do not have a published source contract" [ref=e32]: Government forecasts unavailable
    - button "Clear filters" [ref=e33] [cursor=pointer]
  - generic [ref=e34]:
    - alert [ref=e36]:
      - paragraph [ref=e37]: You do not have permission for this operation.
      - button "Retry" [ref=e38] [cursor=pointer]
    - alert [ref=e40]:
      - paragraph [ref=e41]: You do not have permission for this operation.
      - button "Retry" [ref=e42] [cursor=pointer]
    - alert [ref=e44]:
      - paragraph [ref=e45]: You do not have permission for this operation.
      - button "Retry" [ref=e46] [cursor=pointer]
    - alert [ref=e48]:
      - paragraph [ref=e49]: You do not have permission for this operation.
      - button "Retry" [ref=e50] [cursor=pointer]
    - alert [ref=e52]:
      - paragraph [ref=e53]: Synthetic publisher effective-date source unavailable
      - button "Retry" [ref=e54] [cursor=pointer]
  - paragraph [ref=e55]: Master view includes meetings allowed by your calendar ownership and explicit client sharing. It does not grant access to teammates' private calendars.
```

# Test source

```ts
  153 |     name: "Client",
  154 |     exact: true,
  155 |   });
  156 |   await selection.selectOption(clientId);
  157 |   await dialog.getByRole("textbox", { name: "Subject" }).fill("Retained draft");
  158 |   denied = true;
  159 |   await page.evaluate(async () => {
  160 |     if (!window.__calendarBoundary) throw new Error("Missing test controls");
  161 |     await window.__calendarBoundary.refreshClients();
  162 |   });
  163 |   await expect(selection).toHaveValue(clientId);
  164 |   await expect(selection).toBeDisabled();
  165 |   await expect(
  166 |     selection.getByRole("option", { name: client.name }),
  167 |   ).toHaveCount(0);
  168 |   await expect(
  169 |     selection.getByRole("option", { name: "Selected client unavailable" }),
  170 |   ).toHaveCount(1);
  171 |   await expect(
  172 |     dialog.getByRole("button", { name: "Save meeting" }),
  173 |   ).toBeDisabled();
  174 |   await expect(dialog.getByRole("textbox", { name: "Subject" })).toHaveValue(
  175 |     "Retained draft",
  176 |   );
  177 |   denied = false;
  178 |   await dialog.getByRole("button", { name: "Retry" }).click();
  179 |   await expect(selection).toBeEnabled();
  180 |   await expect(selection).toHaveValue(clientId);
  181 |   await expect(
  182 |     selection.getByRole("option", { name: client.name }),
  183 |   ).toHaveCount(1);
  184 |   await expect(
  185 |     dialog.getByRole("button", { name: "Save meeting" }),
  186 |   ).toBeEnabled();
  187 |   expect(unexpected).toEqual([]);
  188 | });
  189 | 
  190 | test("a master Calendar client link cannot save after its selected client becomes unavailable", async ({
  191 |   page,
  192 | }) => {
  193 |   const unexpected = await installFixtures(page);
  194 |   let denied = false;
  195 |   await page.route("**/core/clients", (route) =>
  196 |     denied
  197 |       ? json(route, { message: "Synthetic client access changed" }, 403)
  198 |       : json(route, [client]),
  199 |   );
  200 |   await page.goto(
  201 |     `/calendar-boundary.html?view=agenda&date=2026-10-15&clientId=${clientId}&new=meeting`,
  202 |   );
  203 |   const dialog = page.getByRole("dialog", { name: "New meeting" });
  204 |   await expect(
  205 |     dialog.getByRole("button", { name: "Save meeting" }),
  206 |   ).toBeEnabled();
  207 |   await dialog
  208 |     .getByRole("textbox", { name: "Subject" })
  209 |     .fill("Scoped retained draft");
  210 |   denied = true;
  211 |   await page.evaluate(async () => {
  212 |     if (!window.__calendarBoundary) throw new Error("Missing test controls");
  213 |     await window.__calendarBoundary.refreshClients();
  214 |   });
  215 |   await expect(
  216 |     dialog.getByRole("button", { name: "Save meeting" }),
  217 |   ).toBeDisabled();
  218 |   await expect(dialog.getByRole("textbox", { name: "Subject" })).toHaveValue(
  219 |     "Scoped retained draft",
  220 |   );
  221 |   denied = false;
  222 |   await dialog.getByRole("button", { name: "Retry" }).click();
  223 |   await expect(
  224 |     dialog.getByRole("button", { name: "Save meeting" }),
  225 |   ).toBeEnabled();
  226 |   expect(new URL(page.url()).searchParams.get("clientId")).toBe(clientId);
  227 |   expect(unexpected).toEqual([]);
  228 | });
  229 | 
  230 | test("unavailable Calendar feeds do not become a successful empty-state claim", async ({
  231 |   page,
  232 | }) => {
  233 |   const unexpected = await installFixtures(page);
  234 |   let denied = false;
  235 |   for (const feed of feeds)
  236 |     await page.route(feed.route, (route) =>
  237 |       denied
  238 |         ? json(route, { message: "Synthetic feed access changed" }, 403)
  239 |         : json(route, feed.body),
  240 |     );
  241 |   await page.goto(
  242 |     "/calendar-boundary.html?view=agenda&date=2026-10-15&zone=UTC",
  243 |   );
  244 |   for (const feed of feeds)
  245 |     await expect(
  246 |       page.getByRole("heading", { name: new RegExp(feed.name) }),
  247 |     ).toBeVisible();
  248 |   denied = true;
  249 |   await page.evaluate(async () => {
  250 |     if (!window.__calendarBoundary) throw new Error("Missing test controls");
  251 |     await window.__calendarBoundary.refreshFeeds();
  252 |   });
> 253 |   await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(4);
      |                                                             ^ Error: expect(locator).toHaveCount(expected) failed
  254 |   for (const feed of feeds)
  255 |     await expect(
  256 |       page.getByRole("heading", { name: new RegExp(feed.name) }),
  257 |     ).toHaveCount(0);
  258 |   await expect(
  259 |     page.getByText("No events found in the selected feeds and date range."),
  260 |   ).toHaveCount(0);
  261 |   expect(unexpected).toEqual([]);
  262 | });
  263 | 
```