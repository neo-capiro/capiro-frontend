# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: objective-destination.spec.ts >> mismatched binding and malformed Objective query never expose session content
- Location: test/browser/objective-destination.spec.ts:89:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('alert')
Expected substring: "does not match"
Received string:    "Selected client unavailableThis client could not be verified for your current session. Return to Portfolio to choose a permitted client.Open Portfolio"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('alert')
    8 × locator resolved to <section role="alert">…</section>
      - unexpected value "Selected client unavailableThis client could not be verified for your current session. Return to Portfolio to choose a permitted client.Open Portfolio"

```

```yaml
- alert:
  - heading "Selected client unavailable" [level=2]
  - paragraph: This client could not be verified for your current session. Return to Portfolio to choose a permitted client.
  - link "Open Portfolio":
    - /url: /
```

# Test source

```ts
  2   | import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
  3   | import { session, sessionId } from "../../tests/newsletter-staging-fixtures";
  4   | const clientId = "30000000-0000-4000-8000-000000000001",
  5   |   objectiveId = "40000000-0000-4000-8000-000000000001";
  6   | const binding = {
  7   |   clientId,
  8   |   objectiveId,
  9   |   objectiveVersion: 7,
  10  |   kind: "outreach_session",
  11  |   resourceId: sessionId,
  12  |   objectiveRevisionId: "50000000-0000-4000-8000-000000000001",
  13  |   destinationStateVersion: 3,
  14  | };
  15  | const bound = {
  16  |   ...session,
  17  |   spec: {
  18  |     ...session.spec,
  19  |     sponsor: {
  20  |       kind: "client",
  21  |       label: "Synthetic client",
  22  |       clientRefs: [{ clientId }],
  23  |     },
  24  |   },
  25  |   destination: binding,
  26  | };
  27  | const path = `/modules/engagement?view=outreach&session=${sessionId}&clientId=${clientId}&objectiveId=${objectiveId}&objectiveVersion=7`;
  28  | test("each Objective-bound open/reload calls the canonical owner without an unbound session fallback", async ({
  29  |   page,
  30  | }) => {
  31  |   await onlyLocalRequests(page);
  32  |   let reads = 0;
  33  |   const keys: string[] = [];
  34  |   page.on("request", (r) => {
  35  |     if (r.url().includes("/api/capiro/"))
  36  |       keys.push(new URL(r.url()).pathname.split("/").pop()!);
  37  |   });
  38  |   await operationFixtures(page, {
  39  |     "me.read": testIdentity,
  40  |     "engagement.objectiveDestination": () => {
  41  |       reads++;
  42  |       return bound;
  43  |     },
  44  |   });
  45  |   await page.goto(path);
  46  |   await expect(page.getByText(/immutable revision/)).toContainText(
  47  |     binding.objectiveRevisionId,
  48  |   );
  49  |   await expect(
  50  |     page.getByRole("button", { name: "Save campaign decisions" }),
  51  |   ).toHaveCount(0);
  52  |   await page.reload();
  53  |   await expect(page.getByText(/immutable revision/)).toBeVisible();
  54  |   expect(reads).toBe(2);
  55  |   expect(keys).not.toContain("engagement.session");
  56  |   await page
  57  |     .getByRole("button", { name: "Recheck current Objective destination" })
  58  |     .click();
  59  |   await expect.poll(() => reads).toBe(3);
  60  | });
  61  | for (const status of [404, 409])
  62  |   test(`owner refusal${status} clears bound content and never falls back`, async ({
  63  |     page,
  64  |   }) => {
  65  |     await onlyLocalRequests(page);
  66  |     await operationFixtures(page, {
  67  |       "me.read": testIdentity,
  68  |       "engagement.objectiveDestination": bound,
  69  |     });
  70  |     await page.goto(path);
  71  |     await expect(page.getByText(/immutable revision/)).toBeVisible();
  72  |     await page.route("**/api/capiro/engagement.objectiveDestination?*", (r) =>
  73  |       r.fulfill({
  74  |         status,
  75  |         json: {
  76  |           message:
  77  |             status === 409
  78  |               ? "OBJECTIVE_VERSION_CONFLICT"
  79  |               : "Objective destination unavailable",
  80  |         },
  81  |       }),
  82  |     );
  83  |     await page
  84  |       .getByRole("button", { name: "Recheck current Objective destination" })
  85  |       .click();
  86  |     await expect(page.getByRole("alert")).toBeVisible();
  87  |     await expect(page.getByText(/immutable revision/)).toHaveCount(0);
  88  |   });
  89  | test("mismatched binding and malformed Objective query never expose session content", async ({
  90  |   page,
  91  | }) => {
  92  |   await onlyLocalRequests(page);
  93  |   let reads = 0;
  94  |   await operationFixtures(page, {
  95  |     "me.read": testIdentity,
  96  |     "engagement.objectiveDestination": () => {
  97  |       reads++;
  98  |       return { ...bound, destination: { ...binding, objectiveVersion: 8 } };
  99  |     },
  100 |   });
  101 |   await page.goto(path);
> 102 |   await expect(page.getByRole("alert")).toContainText("does not match");
      |                                         ^ Error: expect(locator).toContainText(expected) failed
  103 |   await expect(page.getByText(/immutable revision/)).toHaveCount(0);
  104 |   await page.goto(path.replace("objectiveVersion=7", "objectiveVersion=1e0"));
  105 |   await expect(page.getByRole("alert")).toContainText("exact client");
  106 |   expect(reads).toBe(1);
  107 | });
  108 | 
```