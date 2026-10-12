# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-rich-compose.spec.ts >> rich Bold survives review and explicit send without signature duplication
- Location: apps/web/tests/browser/mail-rich-compose.spec.ts:66:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Bold', exact: true })

```

# Page snapshot

```yaml
- generic:
  - generic:
    - main:
      - heading [level=1]: Relationships
      - paragraph: Synthetic mailbox acceptance; no provider delivery.
      - button: Mail contact
      - button: Reply to thread
      - button: Email prepared document
  - dialog "New email" [ref=e2]:
    - banner [ref=e3]:
      - heading "New email" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Sends through your own connected mailbox. Backend permissions and connection policy apply.
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]:
          - text: From mailbox
          - combobox "From mailbox" [ref=e13]:
            - option "Choose a sending mailbox"
            - option "Synthetic mailbox · sender@example.test" [selected]
        - generic [ref=e14]: Your saved signature belongs to your user account, not to a mailbox. Availability does not guarantee provider consent or delivery.
        - button "Refresh mailboxes" [ref=e15] [cursor=pointer]
      - region "Email recipients" [ref=e16]:
        - generic [ref=e17]:
          - strong [ref=e18]: To
          - generic [ref=e19]:
            - button "Cc" [ref=e20] [cursor=pointer]
            - button "Bcc" [ref=e21] [cursor=pointer]
        - generic [ref=e23]:
          - text: Taylor Test <taylor@example.test>
          - button "Remove recipient taylor@example.test" [ref=e24] [cursor=pointer]: ×
        - button "+ Add recipient" [ref=e25] [cursor=pointer]
        - generic [ref=e26]: From your connected mailbox (Settings → Personal). Separate copied addresses with commas; up to 10 per field.
      - generic [ref=e27]:
        - text: Subject
        - textbox "Subject" [ref=e28]: Rich synthetic message
      - generic [ref=e29]:
        - generic [ref=e30]: Message
        - textbox "Message" [active] [ref=e31]: Original rich draft.
      - button "Rewrite with Meri" [ref=e32] [cursor=pointer]
      - group "Draft rewrite status"
      - generic [ref=e33]:
        - checkbox "Append my saved signature" [checked] [ref=e34]
        - text: Append my saved signature
      - region "Saved signature" [ref=e35]:
        - generic [ref=e36]:
          - iframe [ref=e37]:
            - paragraph [ref=f1e2]: Saved synthetic signature
          - generic [ref=e38]: Remote images and links are hidden in this preview.
      - region "Email attachments" [ref=e39]:
        - generic [ref=e40]:
          - text: Attach file
          - button "Attach file" [ref=e41]
        - generic [ref=e42]: Up to 5 files, 3 MiB each. Uploaded files are saved to this client’s Files. Removing here only detaches them from this draft.
      - button "Review email" [ref=e43] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import { sendingMailbox, sendingReceipt } from "./fixtures";
  3   | 
  4   | async function setup(page: Page) {
  5   |   const state = {
  6   |     actor: "actor-a",
  7   |     rewrites: [] as Record<string, unknown>[],
  8   |     sends: [] as Record<string, unknown>[],
  9   |     unexpected: [] as string[],
  10  |     held: false,
  11  |     release: () => {},
  12  |     verified: true,
  13  |     rewriteStatus: 200,
  14  |   };
  15  |   await page.route("**/*", (route) => {
  16  |     const url = new URL(route.request().url());
  17  |     if (url.origin === "http://127.0.0.1:5299") return route.continue();
  18  |     state.unexpected.push(url.href);
  19  |     return route.abort();
  20  |   });
  21  |   await page.route("**/api/backend/core/**", async (route) => {
  22  |     const path = new URL(route.request().url()).pathname.split("/api/backend/core/")[1];
  23  |     if (path === "me") return route.fulfill({ json: {
  24  |       user: { id: state.actor, email: "actor@example.test" },
  25  |       tenant: { id: "tenant-a", name: "Synthetic" }, role: "standard_user",
  26  |     } });
  27  |     if (path === "me/email-signature") return route.fulfill({ json: { html: "<p>Saved synthetic signature</p>", enabled: true } });
  28  |     if (path === "engagement/mail/mailboxes") return route.fulfill({ json: [sendingMailbox] });
  29  |     if (path?.endsWith("/people")) return route.fulfill({ json: [] });
  30  |     if (path === "engagement/mail/rewrite") {
  31  |       state.rewrites.push(route.request().postDataJSON());
  32  |       if (state.held) await new Promise<void>((resolve) => { state.release = resolve; });
  33  |       return route.fulfill({ status: state.rewriteStatus, json: state.rewriteStatus === 200
  34  |         ? { bodyHtml: "<p>Verified rewrite.</p>", verified: state.verified }
  35  |         : { message: "Synthetic rewrite unavailable" } }).catch(() => {});
  36  |     }
  37  |     if (path === "engagement/mail/send") {
  38  |       state.sends.push(route.request().postDataJSON());
  39  |       return route.fulfill({ json: { ok: true,
  40  |         threadId: "20000000-0000-4000-8000-000000000001",
  41  |         messageId: "20000000-0000-4000-8000-000000000002",
  42  |         ...sendingReceipt, signatureAppended: true,
  43  |       } });
  44  |     }
  45  |     state.unexpected.push(path);
  46  |     return route.fulfill({ status: 500, json: { message: "Unexpected synthetic route" } });
  47  |   });
  48  |   await page.goto("/__test/email-compose");
  49  |   await page.getByRole("button", { name: "Mail contact", exact: true }).click();
  50  |   await page.getByLabel("Subject", { exact: true }).fill("Rich synthetic message");
  51  |   await page.getByLabel("From mailbox").selectOption(sendingMailbox.id);
  52  |   return state;
  53  | }
  54  | const message = (page: Page) => page.getByRole("textbox", { name: "Message", exact: true });
  55  | async function format(page: Page, name: string, text = "Original rich draft.") {
  56  |   await message(page).fill(text);
  57  |   await message(page).press("ControlOrMeta+a");
> 58  |   await page.getByRole("button", { name, exact: true }).click();
      |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  59  | }
  60  | async function review(page: Page) {
  61  |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  62  |   return page.getByRole("dialog", { name: "Send email", exact: true });
  63  | }
  64  | 
  65  | for (const [name, tag] of [["Bold", "strong"], ["Italic", "em"], ["Underline", "u"], ["List", "ul > li"]]) {
  66  |   test(`rich ${name} survives review and explicit send without signature duplication`, async ({ page }) => {
  67  |     const state = await setup(page);
  68  |     await format(page, name);
  69  |     await expect(message(page).locator(tag)).toHaveText("Original rich draft.");
  70  |     const reviewed = await review(page);
  71  |     await expect(reviewed.getByRole("region", { name: "Message preview" }).locator(tag)).toHaveText("Original rich draft.");
  72  |     expect(state.sends).toHaveLength(0);
  73  |     await reviewed.getByRole("button", { name: "Send email", exact: true }).click();
  74  |     await expect.poll(() => state.sends.length).toBe(1);
  75  |     expect(state.sends[0].bodyHtml).toContain(name === "List" ? "<ul><li><p>Original rich draft.</p></li></ul>" : `<${tag}>Original rich draft.</${tag}>`);
  76  |     expect(state.sends[0].appendSignature).toBe(true);
  77  |     expect(state.sends[0].bodyHtml).not.toContain("signature");
  78  |     expect(state.unexpected).toEqual([]);
  79  |   });
  80  | }
  81  | 
  82  | test("verified rewrite uses text and Undo restores the complete formatted draft", async ({ page }) => {
  83  |   const state = await setup(page);
  84  |   await format(page, "Bold");
  85  |   const before = await message(page).innerHTML();
  86  |   await page.getByRole("button", { name: "Rewrite with Meri", exact: true }).click();
  87  |   await expect(message(page)).toHaveText("Verified rewrite.");
  88  |   expect(state.rewrites[0].rawText).toBe("Original rich draft.");
  89  |   await page.getByRole("button", { name: "Undo Meri rewrite", exact: true }).click();
  90  |   await expect(message(page)).toHaveJSProperty("innerHTML", before);
  91  |   await expect(page.getByRole("button", { name: "Undo Meri rewrite", exact: true })).toHaveCount(0);
  92  | });
  93  | 
  94  | test("formatting-only edit revokes a held rewrite without replacing current formatting", async ({ page }) => {
  95  |   const state = await setup(page);
  96  |   state.held = true;
  97  |   await message(page).fill("Original rich draft.");
  98  |   await page.getByRole("button", { name: "Rewrite with Meri", exact: true }).click();
  99  |   await expect.poll(() => state.rewrites.length).toBe(1);
  100 |   await message(page).press("ControlOrMeta+a");
  101 |   await page.getByRole("button", { name: "Italic", exact: true }).click();
  102 |   state.release();
  103 |   await expect(message(page).locator("em")).toHaveText("Original rich draft.");
  104 |   await expect(page.getByRole("button", { name: "Rewrite with Meri", exact: true })).toBeEnabled();
  105 |   await expect(page.getByRole("button", { name: "Undo Meri rewrite", exact: true })).toHaveCount(0);
  106 | });
  107 | 
  108 | for (const failure of ["unverified", "unavailable"])
  109 |   test(`${failure} rewrite preserves rich content`, async ({ page }) => {
  110 |     const state = await setup(page);
  111 |     state.verified = failure !== "unverified";
  112 |     state.rewriteStatus = failure === "unavailable" ? 503 : 200;
  113 |     await format(page, "Underline");
  114 |     const before = await message(page).innerHTML();
  115 |     await page.getByRole("button", { name: "Rewrite with Meri", exact: true }).click();
  116 |     await expect(page.getByRole("button", { name: "Rewrite with Meri", exact: true })).toBeEnabled();
  117 |     await expect(message(page)).toHaveJSProperty("innerHTML", before);
  118 |     await expect(page.getByRole("button", { name: "Undo Meri rewrite", exact: true })).toHaveCount(0);
  119 |   });
  120 | 
  121 | test("paste keeps supported formatting while removing active markup and remote content", async ({ page }) => {
  122 |   const state = await setup(page);
  123 |   await expect(page.getByRole("button", { name: "Bold", exact: true })).toBeVisible();
  124 |   await message(page).focus();
  125 |   await message(page).evaluate((element) => {
  126 |     const clipboardData = new DataTransfer();
  127 |     clipboardData.setData("text/html", '<p><strong>Safe bold</strong> <u>underlined</u><script>window.__mailPasted=true</script><img src="https://mail.example.test/pixel" onerror="window.__mailPasted=true"><a href="https://mail.example.test/link">Literal link text</a></p><ul><li>Safe item</li></ul><style>body{display:none}</style><iframe src="https://mail.example.test/frame"></iframe>');
  128 |     element.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
  129 |   });
  130 |   await expect(message(page).locator("strong")).toHaveText("Safe bold");
  131 |   await expect(message(page).locator("li")).toHaveText("Safe item");
  132 |   await expect(message(page).locator("script,style,img,a,iframe,[onerror],[href]")).toHaveCount(0);
  133 |   const reviewed = await review(page);
  134 |   await expect(reviewed.getByRole("region", { name: "Message preview" }).locator("strong")).toHaveText("Safe bold");
  135 |   expect(await page.evaluate(() => (window as unknown as { __mailPasted?: boolean }).__mailPasted)).toBeUndefined();
  136 |   expect(state.unexpected).toEqual([]);
  137 | });
  138 | 
  139 | test("empty and oversized rich bodies cannot be reviewed, and typed text is retained", async ({ page }) => {
  140 |   const state = await setup(page);
  141 |   await expect(page.getByRole("button", { name: "Bold", exact: true })).toBeVisible();
  142 |   await review(page);
  143 |   await expect(page.getByRole("dialog", { name: "Send email", exact: true })).toHaveCount(0);
  144 |   await expect(page.getByText("Enter a message.", { exact: true })).toBeVisible();
  145 |   const long = "a".repeat(8001);
  146 |   await message(page).fill(long);
  147 |   await review(page);
  148 |   await expect(page.getByText("Keep the message to 8,000 characters.", { exact: true })).toBeVisible();
  149 |   await expect(message(page)).toHaveText(long);
  150 |   expect(state.sends).toHaveLength(0);
  151 | });
  152 | 
  153 | test("keyboard formatting and mobile toolbar remain reachable", async ({ page }) => {
  154 |   await page.setViewportSize({ width: 390, height: 844 });
  155 |   const state = await setup(page);
  156 |   await expect(page.getByRole("button", { name: "Bold", exact: true })).toBeVisible();
  157 |   await message(page).fill("Keyboard rich draft.");
  158 |   await message(page).press("ControlOrMeta+a");
```