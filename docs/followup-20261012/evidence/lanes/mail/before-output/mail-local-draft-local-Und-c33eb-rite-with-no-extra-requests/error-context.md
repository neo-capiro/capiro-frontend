# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-local-draft.spec.ts >> local Undo restores exactly the body preceding the latest verified rewrite with no extra requests
- Location: apps/web/tests/browser/mail-local-draft.spec.ts:102:1

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator: getByRole('button', { name: 'Undo Meri rewrite', exact: true })
Expected: enabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeEnabled" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Undo Meri rewrite', exact: true })

```

```yaml
- dialog "New email":
  - banner:
    - heading "New email" [level=2]
    - button "Close"
  - paragraph: Sends through your own connected mailbox. Backend permissions and connection policy apply.
  - text: From mailbox
  - combobox "From mailbox":
    - option "Choose a sending mailbox"
    - option "Synthetic mailbox · sender@example.test" [selected]
  - text: Your saved signature belongs to your user account, not to a mailbox. Availability does not guarantee provider consent or delivery.
  - button "Refresh mailboxes"
  - region "Email recipients":
    - strong: To
    - button "Cc"
    - button "Bcc"
    - text: Taylor Test <taylor@example.test>
    - button "Remove recipient taylor@example.test": ×
    - button "+ Add recipient"
    - text: From your connected mailbox (Settings → Personal). Separate copied addresses with commas; up to 10 per field.
  - text: Subject
  - textbox "Subject": Synthetic local review
  - text: Message
  - textbox "Message": Verified rewritten draft.
  - button "Rewrite with Meri"
  - group "Draft rewrite status"
  - checkbox "Append my saved signature" [checked]
  - text: Append my saved signature Your saved signature is appended by the server.
  - region "Email attachments":
    - text: Attach file
    - button "Attach file"
    - text: Up to 5 files, 3 MiB each. Uploaded files are saved to this client’s Files. Removing here only detaches them from this draft.
  - button "Review email"
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import { sendingMailbox, sendingReceipt } from "./fixtures";
  3   | 
  4   | const original = "Original local draft.";
  5   | const savedHtml = '<p><strong>Synthetic Sender</strong><br>Saved signature identity</p>';
  6   | async function setup(page: Page, signature = { html: savedHtml as string | null, enabled: true }) {
  7   |   const state = {
  8   |     signature, signatureStatus: 200, actor: "actor-a", role: "standard_user",
  9   |     rewriteResult: { bodyHtml: "<p>Verified rewritten draft.</p>", verified: true },
  10  |     rewriteStatus: 200, hold: false, release: () => {},
  11  |     rewrites: [] as unknown[], sends: [] as Record<string, unknown>[], remote: [] as string[],
  12  |   };
  13  |   await page.route("https://signature.example.test/**", (route) => {
  14  |     state.remote.push(route.request().url());
  15  |     return route.fulfill({ body: "Unexpected synthetic remote content" });
  16  |   });
  17  |   await page.route("**/api/backend/core/**", async (route) => {
  18  |     const path = new URL(route.request().url()).pathname.split("/api/backend/core/")[1];
  19  |     if (path === "me") return route.fulfill({ json: {
  20  |       user: { id: state.actor, email: "actor@example.test" },
  21  |       tenant: { id: "tenant-a", name: "Synthetic" }, role: state.role,
  22  |     } });
  23  |     if (path === "me/email-signature") return route.fulfill({ status: state.signatureStatus,
  24  |       json: state.signatureStatus === 200 ? state.signature : { message: "Signature temporarily unavailable" } });
  25  |     if (path === "engagement/mail/mailboxes") return route.fulfill({ json: [sendingMailbox] });
  26  |     if (path?.endsWith("/people")) return route.fulfill({ json: [] });
  27  |     if (path === "engagement/mail/rewrite") {
  28  |       state.rewrites.push(route.request().postDataJSON());
  29  |       if (state.hold) await new Promise<void>((resolve) => { state.release = resolve; });
  30  |       return route.fulfill({ status: state.rewriteStatus, json: state.rewriteStatus === 200
  31  |         ? state.rewriteResult : { message: "Synthetic rewrite failure" } }).catch(() => {});
  32  |     }
  33  |     if (path === "engagement/mail/send") {
  34  |       const input = route.request().postDataJSON(); state.sends.push(input);
  35  |       return route.fulfill({ json: { ...sendingReceipt, signatureAppended: input.appendSignature } });
  36  |     }
  37  |     return route.fulfill({ status: 500, json: { message: `Unexpected synthetic route: ${path}` } });
  38  |   });
  39  |   await page.goto("/__test/email-compose");
  40  |   return state;
  41  | }
  42  | async function open(page: Page) {
  43  |   await page.getByRole("button", { name: "Mail contact", exact: true }).click();
  44  |   await page.getByLabel("Subject", { exact: true }).fill("Synthetic local review");
  45  |   await page.getByLabel("Message", { exact: true }).fill(original);
  46  |   await page.getByLabel("From mailbox").selectOption(sendingMailbox.id);
  47  | }
  48  | async function rewrite(page: Page) {
  49  |   await page.getByRole("button", { name: "Rewrite with Meri", exact: true }).click();
  50  |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Verified rewritten draft.");
> 51  |   await expect(page.getByRole("button", { name: "Undo Meri rewrite", exact: true })).toBeEnabled();
      |                                                                                      ^ Error: expect(locator).toBeEnabled() failed
  52  | }
  53  | 
  54  | for (const enabled of [true, false]) test(`saved signature display preserves append=${enabled} without copying HTML into the body`, async ({ page }) => {
  55  |   const state = await setup(page, { html: savedHtml, enabled }); await open(page);
  56  |   const editor = page.getByRole("dialog", { name: "New email", exact: true });
  57  |   await expect(editor.frameLocator('iframe[title="Saved signature preview"]').getByText("Synthetic Sender", { exact: true })).toBeVisible();
  58  |   await expect(page.getByLabel("Append my saved signature")).toBeChecked({ checked: enabled });
  59  |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  60  |   const review = page.getByRole("dialog", { name: "Send email", exact: true });
  61  |   await expect(review.locator('iframe[title="Saved signature preview"]')).toHaveCount(enabled ? 1 : 0);
  62  |   await review.getByRole("button", { name: "Send email", exact: true }).click();
  63  |   await expect.poll(() => state.sends.length).toBe(1);
  64  |   expect(state.sends[0]).toMatchObject({ bodyHtml: `<p>${original}</p>`, appendSignature: enabled });
  65  |   expect(state.sends[0].bodyHtml).not.toContain("Synthetic Sender");
  66  |   expect(state.rewrites).toHaveLength(0);
  67  | });
  68  | 
  69  | test("saved signature preview blocks active markup and automatic remote content", async ({ page }) => {
  70  |   const state = await setup(page, { enabled: true, html: savedHtml +
  71  |     '<script>window.__signatureExecuted=true</script><img src="https://signature.example.test/pixel" onerror="window.__signatureExecuted=true" alt="Remote logo">' +
  72  |     '<a href="https://signature.example.test/click">Signature link</a><iframe src="https://signature.example.test/frame"></iframe>' +
  73  |     '<form action="https://signature.example.test/form"><input name="secret"></form><div style="background-image:url(https://signature.example.test/css)">Styled identity</div>' +
  74  |     '<img alt="Inline logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=">' });
  75  |   await open(page);
  76  |   const preview = page.frameLocator('iframe[title="Saved signature preview"]');
  77  |   await expect(preview.getByText("Synthetic Sender", { exact: true })).toBeVisible();
  78  |   await expect(preview.getByAltText("Inline logo")).toBeVisible();
  79  |   await expect(preview.locator("script,iframe,form,a[href],img[src^='https:'],[onerror]")).toHaveCount(0);
  80  |   await expect(page.locator('iframe[title="Saved signature preview"]')).toHaveAttribute("sandbox", "");
  81  |   expect(state.remote).toEqual([]); expect(state.sends).toEqual([]);
  82  | });
  83  | 
  84  | for (const html of [null, ""]) test(`empty signature ${String(html)} has no misleading preview`, async ({ page }) => {
  85  |   await setup(page, { html, enabled: false }); await open(page);
  86  |   await expect(page.getByText("No saved signature is available.", { exact: true })).toBeVisible();
  87  |   await expect(page.getByLabel("Append my saved signature")).toBeDisabled();
  88  |   await expect(page.locator('iframe[title="Saved signature preview"]')).toHaveCount(0);
  89  | });
  90  | 
  91  | test("signature read failure remains distinct from empty and can be retried deliberately", async ({ page }) => {
  92  |   const state = await setup(page); state.signatureStatus = 503; await open(page);
  93  |   const signature = page.getByRole("region", { name: "Saved signature" });
  94  |   await expect(signature.getByRole("alert")).toContainText("Signature temporarily unavailable");
  95  |   await expect(page.getByText("No saved signature is available.", { exact: true })).toHaveCount(0);
  96  |   state.signatureStatus = 200;
  97  |   await signature.getByRole("button", { name: "Retry signature" }).click();
  98  |   await expect(signature.frameLocator('iframe[title="Saved signature preview"]').getByText("Synthetic Sender", { exact: true })).toBeVisible();
  99  |   expect(state.sends).toEqual([]);
  100 | });
  101 | 
  102 | test("local Undo restores exactly the body preceding the latest verified rewrite with no extra requests", async ({ page }) => {
  103 |   const state = await setup(page); await open(page); await rewrite(page);
  104 |   await page.getByRole("button", { name: "Undo Meri rewrite", exact: true }).click();
  105 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(original);
  106 |   await expect(page.getByRole("button", { name: "Undo Meri rewrite", exact: true })).toHaveCount(0);
  107 |   expect(state.rewrites).toHaveLength(1); expect(state.sends).toEqual([]);
  108 | });
  109 | 
  110 | test("manual edits retire Undo and the next rewrite snapshots the new local draft", async ({ page }) => {
  111 |   const state = await setup(page); await open(page); await rewrite(page);
  112 |   await page.getByLabel("Message", { exact: true }).fill("Newer manual work.");
  113 |   await expect(page.getByRole("button", { name: "Undo Meri rewrite", exact: true })).toHaveCount(0);
  114 |   await rewrite(page);
  115 |   await page.getByRole("button", { name: "Undo Meri rewrite", exact: true }).click();
  116 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Newer manual work.");
  117 |   expect(state.rewrites).toHaveLength(2); expect(state.sends).toEqual([]);
  118 | });
  119 | 
  120 | test("repeated rewrites retain one latest snapshot and Undo is unavailable while another rewrite awaits", async ({ page }) => {
  121 |   const state = await setup(page); await open(page); await rewrite(page);
  122 |   state.hold = true; state.rewriteResult.bodyHtml = "<p>Second verified revision.</p>";
  123 |   await page.getByRole("button", { name: "Rewrite with Meri", exact: true }).click();
  124 |   await expect.poll(() => state.rewrites.length).toBe(2);
  125 |   await expect(page.getByRole("button", { name: "Undo Meri rewrite", exact: true })).toBeDisabled();
  126 |   state.release();
  127 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Second verified revision.");
  128 |   await page.getByRole("button", { name: "Undo Meri rewrite", exact: true }).click();
  129 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Verified rewritten draft.");
  130 |   await expect(page.getByRole("button", { name: "Undo Meri rewrite", exact: true })).toHaveCount(0);
  131 |   expect(state.rewrites).toHaveLength(2); expect(state.sends).toEqual([]);
  132 | });
  133 | 
  134 | for (const failed of [false, true]) test(`${failed ? "failed" : "unverified"} subsequent rewrite retains the prior valid Undo`, async ({ page }) => {
  135 |   const state = await setup(page); await open(page); await rewrite(page);
  136 |   state.rewriteResult.verified = false; state.rewriteStatus = failed ? 503 : 200;
  137 |   await page.getByRole("button", { name: "Rewrite with Meri", exact: true }).click();
  138 |   await expect(page.getByRole("button", { name: "Undo Meri rewrite", exact: true })).toBeEnabled();
  139 |   await page.getByRole("button", { name: "Undo Meri rewrite", exact: true }).click();
  140 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(original);
  141 |   expect(state.sends).toEqual([]);
  142 | });
  143 | 
  144 | for (const change of ["recipients", "actor", "invalidated", "close"] as const) test(`${change} replacement retires an earlier Undo snapshot`, async ({ page }) => {
  145 |   const state = await setup(page); await open(page); await rewrite(page);
  146 |   if (change === "recipients") {
  147 |     await page.getByRole("button", { name: "Cc", exact: true }).click();
  148 |     await page.getByLabel("Cc", { exact: true }).fill("copy@example.test");
  149 |     await page.getByLabel("Cc", { exact: true }).fill("");
  150 |   } else if (change === "actor") {
  151 |     state.actor = "actor-b"; await page.evaluate(() => window.__mailRecheck?.());
```