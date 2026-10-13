# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-rich-compose.spec.ts >> verified rewrite uses text and Undo restores the complete formatted draft
- Location: apps/web/tests/browser/mail-rich-compose.spec.ts:130:1

# Error details

```
Test timeout of 12000ms exceeded.
```

```
Error: locator.click: Test timeout of 12000ms exceeded.
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
  15  |   const localOrigin = new URL(String(test.info().project.use.baseURL)).origin;
  16  |   await page.route("**/*", (route) => {
  17  |     const url = new URL(route.request().url());
  18  |     if (url.origin === localOrigin) return route.continue();
  19  |     state.unexpected.push(url.href);
  20  |     return route.abort();
  21  |   });
  22  |   await page.route("**/api/backend/core/**", async (route) => {
  23  |     const path = new URL(route.request().url()).pathname.split(
  24  |       "/api/backend/core/",
  25  |     )[1];
  26  |     if (path === "me")
  27  |       return route.fulfill({
  28  |         json: {
  29  |           user: { id: state.actor, email: "actor@example.test" },
  30  |           tenant: { id: "tenant-a", name: "Synthetic" },
  31  |           role: "standard_user",
  32  |         },
  33  |       });
  34  |     if (path === "me/email-signature")
  35  |       return route.fulfill({
  36  |         json: { html: "<p>Saved synthetic signature</p>", enabled: true },
  37  |       });
  38  |     if (path === "engagement/mail/mailboxes")
  39  |       return route.fulfill({ json: [sendingMailbox] });
  40  |     if (path?.endsWith("/people")) return route.fulfill({ json: [] });
  41  |     if (path === "engagement/mail/rewrite") {
  42  |       state.rewrites.push(route.request().postDataJSON());
  43  |       if (state.held)
  44  |         await new Promise<void>((resolve) => {
  45  |           state.release = resolve;
  46  |         });
  47  |       return route
  48  |         .fulfill({
  49  |           status: state.rewriteStatus,
  50  |           json:
  51  |             state.rewriteStatus === 200
  52  |               ? {
  53  |                   bodyHtml: "<p>Verified rewrite.</p>",
  54  |                   verified: state.verified,
  55  |                 }
  56  |               : { message: "Synthetic rewrite unavailable" },
  57  |         })
  58  |         .catch(() => {});
  59  |     }
  60  |     if (path === "engagement/mail/send") {
  61  |       state.sends.push(route.request().postDataJSON());
  62  |       return route.fulfill({
  63  |         json: {
  64  |           ok: true,
  65  |           threadId: "20000000-0000-4000-8000-000000000001",
  66  |           messageId: "20000000-0000-4000-8000-000000000002",
  67  |           ...sendingReceipt,
  68  |           signatureAppended: true,
  69  |         },
  70  |       });
  71  |     }
  72  |     state.unexpected.push(path ?? route.request().url());
  73  |     return route.fulfill({
  74  |       status: 500,
  75  |       json: { message: "Unexpected synthetic route" },
  76  |     });
  77  |   });
  78  |   await page.goto("/__test/email-compose");
  79  |   await page.getByRole("button", { name: "Mail contact", exact: true }).click();
  80  |   await page
  81  |     .getByLabel("Subject", { exact: true })
  82  |     .fill("Rich synthetic message");
  83  |   await page.getByLabel("From mailbox").selectOption(sendingMailbox.id);
  84  |   return state;
  85  | }
  86  | const message = (page: Page) =>
  87  |   page.getByRole("textbox", { name: "Message", exact: true });
  88  | async function format(page: Page, name: string, text = "Original rich draft.") {
  89  |   await message(page).fill(text);
  90  |   await message(page).press("ControlOrMeta+a");
> 91  |   await page.getByRole("button", { name, exact: true }).click();
      |                                                         ^ Error: locator.click: Test timeout of 12000ms exceeded.
  92  | }
  93  | async function review(page: Page) {
  94  |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  95  |   return page.getByRole("dialog", { name: "Send email", exact: true });
  96  | }
  97  | 
  98  | for (const [name, tag] of [
  99  |   ["Bold", "strong"],
  100 |   ["Italic", "em"],
  101 |   ["Underline", "u"],
  102 |   ["List", "ul > li"],
  103 | ] as const) {
  104 |   test(`rich ${name} survives review and explicit send without signature duplication`, async ({
  105 |     page,
  106 |   }) => {
  107 |     const state = await setup(page);
  108 |     await format(page, name);
  109 |     await expect(message(page).locator(tag)).toHaveText("Original rich draft.");
  110 |     const reviewed = await review(page);
  111 |     await expect(
  112 |       reviewed.getByRole("region", { name: "Message preview" }).locator(tag),
  113 |     ).toHaveText("Original rich draft.");
  114 |     expect(state.sends).toHaveLength(0);
  115 |     await reviewed
  116 |       .getByRole("button", { name: "Send email", exact: true })
  117 |       .click();
  118 |     await expect.poll(() => state.sends.length).toBe(1);
  119 |     expect(state.sends[0]?.bodyHtml).toContain(
  120 |       name === "List"
  121 |         ? "<ul><li><p>Original rich draft.</p></li></ul>"
  122 |         : `<${tag}>Original rich draft.</${tag}>`,
  123 |     );
  124 |     expect(state.sends[0]?.appendSignature).toBe(true);
  125 |     expect(state.sends[0]?.bodyHtml).not.toContain("signature");
  126 |     expect(state.unexpected).toEqual([]);
  127 |   });
  128 | }
  129 | 
  130 | test("verified rewrite uses text and Undo restores the complete formatted draft", async ({
  131 |   page,
  132 | }) => {
  133 |   const state = await setup(page);
  134 |   await format(page, "Bold");
  135 |   const before = await message(page).innerHTML();
  136 |   await page
  137 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  138 |     .click();
  139 |   await expect(message(page)).toHaveText("Verified rewrite.");
  140 |   expect(state.rewrites[0]?.rawText).toBe("Original rich draft.");
  141 |   await page
  142 |     .getByRole("button", { name: "Undo Meri rewrite", exact: true })
  143 |     .click();
  144 |   await expect(message(page)).toHaveJSProperty("innerHTML", before);
  145 |   await expect(
  146 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  147 |   ).toHaveCount(0);
  148 | });
  149 | 
  150 | test("formatting-only edit revokes a held rewrite without replacing current formatting", async ({
  151 |   page,
  152 | }) => {
  153 |   const state = await setup(page);
  154 |   state.held = true;
  155 |   await message(page).fill("Original rich draft.");
  156 |   await page
  157 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  158 |     .click();
  159 |   await expect.poll(() => state.rewrites.length).toBe(1);
  160 |   await message(page).press("ControlOrMeta+a");
  161 |   await page.getByRole("button", { name: "Italic", exact: true }).click();
  162 |   state.release();
  163 |   await expect(message(page).locator("em")).toHaveText("Original rich draft.");
  164 |   await expect(
  165 |     page.getByRole("button", { name: "Rewrite with Meri", exact: true }),
  166 |   ).toBeEnabled();
  167 |   await expect(
  168 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  169 |   ).toHaveCount(0);
  170 | });
  171 | 
  172 | for (const failure of ["unverified", "unavailable"])
  173 |   test(`${failure} rewrite preserves rich content`, async ({ page }) => {
  174 |     const state = await setup(page);
  175 |     state.verified = failure !== "unverified";
  176 |     state.rewriteStatus = failure === "unavailable" ? 503 : 200;
  177 |     await format(page, "Underline");
  178 |     const before = await message(page).innerHTML();
  179 |     await page
  180 |       .getByRole("button", { name: "Rewrite with Meri", exact: true })
  181 |       .click();
  182 |     await expect(
  183 |       page.getByRole("button", { name: "Rewrite with Meri", exact: true }),
  184 |     ).toBeEnabled();
  185 |     await expect(message(page)).toHaveJSProperty("innerHTML", before);
  186 |     await expect(
  187 |       page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  188 |     ).toHaveCount(0);
  189 |   });
  190 | 
  191 | test("paste keeps supported formatting while removing active markup and remote content", async ({
```