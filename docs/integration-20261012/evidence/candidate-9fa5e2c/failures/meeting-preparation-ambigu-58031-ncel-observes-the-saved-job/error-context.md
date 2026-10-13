# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meeting-preparation.spec.ts >> ambiguous submit retries the same key and cancel observes the saved job
- Location: tests/browser/meeting-preparation.spec.ts:267:1

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 2
Received length: 1
Received array:  [{"additionalContext": "Synthetic focus", "depth": "standard", "requestKey": "e8954eea-0d6b-4ac3-8c1b-aac5c0a52095"}]
```

# Page snapshot

```yaml
- generic:
  - generic:
    - link:
      - /url: "#main"
      - text: Skip to content
    - banner:
      - link:
        - /url: /
        - img
      - navigation:
        - link:
          - /url: /meri
        - link:
          - /url: /
        - link:
          - /url: /modules
      - navigation:
        - link:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
        - link:
          - /url: /calendar
        - link:
          - /url: /portfolio?search=1
        - button [disabled]
        - generic:
          - button: T
    - generic:
      - complementary:
        - paragraph: Portfolio
        - navigation:
          - link:
            - /url: /portfolio
            - generic: Overview
          - link:
            - /url: /portfolio?type=CLIENT
            - generic: Clients
          - link:
            - /url: /portfolio/prospects
            - generic: Prospects
        - separator
        - paragraph: Test Aerospace
        - navigation:
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001
            - generic: Overview
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
            - generic: Objectives
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
            - generic: Calendar
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
            - generic: Relationships
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
            - generic: Work
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
            - generic: Capabilities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
            - generic: Bill Tracker
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
            - generic: Opportunities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
            - generic: Files
        - generic:
          - link:
            - /url: /settings
            - text: Settings
      - main:
        - generic:
          - generic:
            - navigation:
              - link:
                - /url: /portfolio
              - link:
                - /url: /portfolio
                - text: Portfolio
              - generic: /
              - link:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001
                - text: Test Aerospace
              - generic: /
              - button: Calendar
            - generic:
              - button:
                - generic: Quick add
              - button:
                - generic: Meri actions
              - button:
                - img
          - region:
            - generic: TA
            - generic:
              - strong: Test Aerospace
              - paragraph: Aerospace
            - generic: active client
        - generic:
          - generic:
            - generic:
              - generic:
                - paragraph: Client meetings
                - heading [level=1]: Calendar
              - generic:
                - button: Meeting library
                - button: Sync calendar
                - button:
                  - img
                  - text: New meeting
            - generic:
              - button:
                - img
              - button: Today
              - button:
                - img
              - textbox: 2026-10-15
              - combobox
              - combobox
            - generic:
              - textbox:
                - /placeholder: Search events…
              - button [pressed]: Meeting
              - button: Clear filters
            - paragraph: Master view includes meetings allowed by your calendar ownership and explicit client sharing. It does not grant access to teammates' private calendars.
            - generic:
              - generic:
                - heading [level=2]:
                  - time: 2026-10-15
                - article:
                  - generic: Meeting
                  - generic:
                    - heading [level=3]:
                      - button: Synthetic preparation meeting
                    - generic: Oct 15, 2:00 PM UTC · scheduled
                    - generic: Your accessible meetings
  - dialog:
    - banner:
      - heading [level=2]: Synthetic preparation meeting
      - button:
        - img
    - paragraph: Synthetic preparation meeting
    - generic:
      - generic: private
      - generic: Test Aerospace
    - navigation:
      - button: Information
      - button [pressed]: Preparation
      - button: Notes
      - button: Debriefs
    - region:
      - generic:
        - generic: Not started
      - generic:
        - button [disabled]: Generate with Meri
        - button [disabled]: Prep settings
      - generic:
        - generic: Refine preparation
        - generic: 15/4000 characters
        - textbox [disabled]:
          - /placeholder: Add context for Meri to use when regenerating…
          - text: Synthetic focus
      - status:
        - heading [level=3]: Preparing your briefing
        - paragraph: "Current stage: queued"
        - paragraph: Progress is saved. You can close this page while preparation runs.
        - button: Cancel preparation
      - paragraph: No preparation yet.
    - region:
      - heading [level=3]: Meeting attachments
      - paragraph: Approval records your review of a file. It does not perform a security scan, extract text or share the file.
      - alert:
        - paragraph: The service returned an unexpected response. Please retry or contact support.
        - button: Retry
      - button: Refresh attachment status
  - dialog "Preparing your briefing" [ref=e3]:
    - banner [ref=e4]:
      - heading "Preparing your briefing" [level=2] [ref=e5]
      - button "Close" [active] [ref=e6] [cursor=pointer]:
        - img [ref=e7]
    - paragraph [ref=e10]: Meri is reading the meeting’s evidence.
    - status [ref=e11]: "Progress is saved. You can close this page while preparation runs. Current stage: queued."
    - contentinfo [ref=e12]:
      - button "Cancel" [ref=e13] [cursor=pointer]
      - button "Cancel preparation" [ref=e14] [cursor=pointer]
```

# Test source

```ts
  207 |   });
  208 |   await expect(
  209 |     progress.getByRole("button", { name: "Cancel preparation", exact: true }),
  210 |   ).toBeEnabled();
  211 |   await page.screenshot({
  212 |     path: "test-results/meeting-preparation-progress.png",
  213 |     fullPage: true,
  214 |   });
  215 |   await progress.getByRole("button", { name: "Cancel", exact: true }).click();
  216 |   await expect(
  217 |     drawer.getByText(
  218 |       "Progress is saved. You can close this page while preparation runs.",
  219 |     ),
  220 |   ).toBeVisible();
  221 |   await expect(
  222 |     drawer.getByRole("button", { name: "Regenerate", exact: true }),
  223 |   ).toBeDisabled();
  224 |   await expect(
  225 |     drawer.getByText(initialPrep.summary, { exact: true }),
  226 |   ).toBeVisible();
  227 |   job = {
  228 |     ...initialJob,
  229 |     status: "failed",
  230 |     stage: "failed",
  231 |     errorCode: "PREP_SYNTHETIC_FAILURE",
  232 |   };
  233 |   await expect(
  234 |     drawer.getByText("Preparation could not finish", { exact: true }),
  235 |   ).toBeVisible({ timeout: 10000 });
  236 |   await expect(
  237 |     drawer.getByText(initialPrep.summary, { exact: true }),
  238 |   ).toBeVisible();
  239 |   await drawer
  240 |     .getByRole("button", { name: "Resume preparation", exact: true })
  241 |     .click();
  242 |   await page
  243 |     .getByRole("dialog", { name: "Preparing your briefing", exact: true })
  244 |     .getByRole("button", { name: "Cancel", exact: true })
  245 |     .click();
  246 |   await expect(
  247 |     drawer.getByText("Current stage: reading evidence", { exact: true }),
  248 |   ).toBeVisible();
  249 |   meeting.preps[0] = {
  250 |     ...initialPrep,
  251 |     id: "prep-generated",
  252 |     summary: "New saved synthetic briefing",
  253 |   };
  254 |   job = {
  255 |     ...initialJob,
  256 |     status: "completed",
  257 |     stage: "completed",
  258 |     prepId: "prep-generated",
  259 |   };
  260 |   await expect(
  261 |     drawer.getByText("New saved synthetic briefing", { exact: true }),
  262 |   ).toBeVisible({ timeout: 10000 });
  263 |   expect(commands).toEqual(["generate", "resume"]);
  264 |   expect(unexpected).toEqual([]);
  265 | });
  266 | 
  267 | test("ambiguous submit retries the same key and cancel observes the saved job", async ({
  268 |   page,
  269 | }) => {
  270 |   const { open, unexpected } = await fixture(page, true);
  271 |   const bodies: unknown[] = [];
  272 |   let job: PrepJob | null = null;
  273 |   await page.route(
  274 |     `**/core/engagement/meetings/${meetingId}/prep-jobs/latest`,
  275 |     (route) => json(route, job),
  276 |   );
  277 |   await page.route(`**/core/engagement/meetings/${meetingId}/prep`, (route) => {
  278 |     bodies.push(route.request().postDataJSON());
  279 |     if (bodies.length === 1) return route.abort("failed");
  280 |     job = { ...initialJob };
  281 |     return json(route, job, 202);
  282 |   });
  283 |   await page.route(
  284 |     `**/core/engagement/meetings/${meetingId}/prep-jobs/job-synthetic`,
  285 |     (route) => {
  286 |       expect(route.request().method()).toBe("DELETE");
  287 |       job = { ...initialJob, status: "cancelled", stage: "cancelled" };
  288 |       return json(route, job);
  289 |     },
  290 |   );
  291 |   const drawer = await open();
  292 |   await drawer.getByLabel("Refine preparation").fill("Synthetic focus");
  293 |   await drawer
  294 |     .getByRole("button", { name: "Generate with Meri", exact: true })
  295 |     .click();
  296 |   await expect(
  297 |     drawer.getByText(
  298 |       "The request outcome is not confirmed. Check saved status before continuing.",
  299 |     ),
  300 |   ).toBeVisible();
  301 |   await drawer
  302 |     .getByRole("button", { name: "Check preparation status" })
  303 |     .click();
  304 |   await drawer
  305 |     .getByRole("button", { name: "Retry same preparation request" })
  306 |     .click();
> 307 |   expect(bodies).toHaveLength(2);
      |                  ^ Error: expect(received).toHaveLength(expected)
  308 |   expect(bodies[1]).toEqual(bodies[0]);
  309 |   await page
  310 |     .getByRole("dialog", { name: "Preparing your briefing", exact: true })
  311 |     .getByRole("button", { name: "Cancel", exact: true })
  312 |     .click();
  313 |   await drawer
  314 |     .getByRole("button", { name: "Cancel preparation", exact: true })
  315 |     .click();
  316 |   await expect(
  317 |     drawer.getByText("Preparation cancelled", { exact: true }),
  318 |   ).toBeVisible();
  319 |   expect(unexpected).toEqual([]);
  320 | });
  321 | 
  322 | test("source settings enforce client receipt, save board IDs, and send selected depth", async ({
  323 |   page,
  324 | }) => {
  325 |   const { open, unexpected } = await fixture(page, true);
  326 |   let stale = true;
  327 |   let saved: unknown;
  328 |   await page.route(
  329 |     `**/core/engagement/meetings/${meetingId}/prep-monday-mapping`,
  330 |     (route) => {
  331 |       if (route.request().method() === "PUT") {
  332 |         saved = route.request().postDataJSON();
  333 |         return json(route, {
  334 |           clientId,
  335 |           boardIds: ["123", "987654321098765432109876"],
  336 |         });
  337 |       }
  338 |       return json(route, {
  339 |         clientId: stale ? "wrong-client" : clientId,
  340 |         boardIds: [],
  341 |       });
  342 |     },
  343 |   );
  344 |   let submitted: unknown;
  345 |   await page.route(`**/core/engagement/meetings/${meetingId}/prep`, (route) => {
  346 |     submitted = route.request().postDataJSON();
  347 |     return json(route, { ...initialJob, depth: "deep" }, 202);
  348 |   });
  349 |   const drawer = await open();
  350 |   await drawer.getByRole("button", { name: "Prep settings" }).click();
  351 |   const settings = page.getByRole("dialog", {
  352 |     name: "Meeting preparation sources",
  353 |     exact: true,
  354 |   });
  355 |   await expect(settings.getByRole("alert")).toContainText(
  356 |     "meeting client changed",
  357 |   );
  358 |   await expect(
  359 |     settings.getByLabel("Monday.com board IDs for this client"),
  360 |   ).toBeDisabled();
  361 |   await expect(
  362 |     settings.getByRole("button", { name: "Generate with Meri" }),
  363 |   ).toBeDisabled();
  364 |   stale = false;
  365 |   await settings.getByRole("button", { name: "Retry", exact: true }).click();
  366 |   await settings
  367 |     .getByLabel("Monday.com board IDs for this client")
  368 |     .fill("123, 987654321098765432109876");
  369 |   await expect(
  370 |     settings.getByRole("button", { name: "Generate with Meri" }),
  371 |   ).toBeDisabled();
  372 |   await settings.getByRole("button", { name: "Save board mapping" }).click();
  373 |   await expect(
  374 |     settings.getByText("Board mapping saved.", { exact: true }),
  375 |   ).toBeVisible();
  376 |   await settings.getByLabel("Search depth").selectOption("deep");
  377 |   await page.screenshot({
  378 |     path: "test-results/meeting-preparation-settings.png",
  379 |     fullPage: true,
  380 |   });
  381 |   await settings.getByRole("button", { name: "Generate with Meri" }).click();
  382 |   expect(saved).toEqual({ boardIds: ["123", "987654321098765432109876"] });
  383 |   expect(submitted).toMatchObject({ depth: "deep" });
  384 |   expect(unexpected).toEqual([]);
  385 | });
  386 | 
  387 | test("read-only role sees saved preparation without mutation controls on mobile dark", async ({
  388 |   page,
  389 | }) => {
  390 |   const { open, unexpected } = await fixture(page);
  391 |   await page.route("**/core/me", (route) =>
  392 |     json(route, {
  393 |       user: { id: "user-readonly", email: "readonly@example.test" },
  394 |       tenant: { id: "tenant-test", name: "UI tests" },
  395 |       role: "client_portal_user",
  396 |     }),
  397 |   );
  398 |   await page.setViewportSize({ width: 390, height: 844 });
  399 |   await page.emulateMedia({ colorScheme: "dark" });
  400 |   const drawer = await open();
  401 |   await expect(
  402 |     drawer.getByText(initialPrep.summary, { exact: true }),
  403 |   ).toBeVisible();
  404 |   await expect(drawer.getByRole("button", { name: "Edit prep" })).toHaveCount(
  405 |     0,
  406 |   );
  407 |   await expect(
```