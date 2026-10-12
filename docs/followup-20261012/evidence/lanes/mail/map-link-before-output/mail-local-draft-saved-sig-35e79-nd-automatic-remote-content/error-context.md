# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-local-draft.spec.ts >> saved signature preview blocks active markup and automatic remote content
- Location: apps/web/tests/browser/mail-local-draft.spec.ts:149:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('iframe[title="Saved signature preview"]').contentFrame().locator('script,iframe,form,[href],img[src^=\'https:\'],[onerror]')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('iframe[title="Saved signature preview"]').contentFrame().locator('script,iframe,form,[href],img[src^=\'https:\'],[onerror]')
    14 × locator resolved to 1 element
       - unexpected value "1"

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
        - textbox "Subject" [ref=e28]: Synthetic local review
      - generic [ref=e29]:
        - generic [ref=e30]: Message
        - textbox "Message" [active] [ref=e31]: Original local draft.
      - button "Rewrite with Meri" [ref=e32] [cursor=pointer]
      - group "Draft rewrite status"
      - generic [ref=e33]:
        - checkbox "Append my saved signature" [checked] [ref=e34]
        - text: Append my saved signature
      - region "Saved signature" [ref=e35]:
        - generic [ref=e36]:
          - iframe [ref=e37]:
            - generic [active] [ref=f1e1]:
              - paragraph [ref=f1e2]:
                - strong [ref=f1e3]: Synthetic Sender
                - text: Saved signature identity
              - text: "[Remote logo]"
              - text: Signature link
              - generic [ref=f1e4]: Styled identity
              - img "Inline logo" [ref=f1e5]
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
  69  |     }
  70  |     if (path === "engagement/mail/send") {
  71  |       const input = route.request().postDataJSON();
  72  |       state.sends.push(input);
  73  |       return route.fulfill({
  74  |         json: {
  75  |           ok: true,
  76  |           threadId: "20000000-0000-4000-8000-000000000001",
  77  |           messageId: "20000000-0000-4000-8000-000000000002",
  78  |           ...sendingReceipt,
  79  |           signatureAppended: input.appendSignature,
  80  |         },
  81  |       });
  82  |     }
  83  |     return route.fulfill({
  84  |       status: 500,
  85  |       json: { message: `Unexpected synthetic route: ${path}` },
  86  |     });
  87  |   });
  88  |   await page.goto("/__test/email-compose");
  89  |   return state;
  90  | }
  91  | async function open(page: Page) {
  92  |   await page.getByRole("button", { name: "Mail contact", exact: true }).click();
  93  |   await page
  94  |     .getByLabel("Subject", { exact: true })
  95  |     .fill("Synthetic local review");
  96  |   await page.getByLabel("Message", { exact: true }).fill(original);
  97  |   await page.getByLabel("From mailbox").selectOption(sendingMailbox.id);
  98  | }
  99  | async function rewrite(page: Page) {
  100 |   await page
  101 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  102 |     .click();
  103 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  104 |     "Verified rewritten draft.",
  105 |   );
  106 |   await expect(
  107 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  108 |   ).toBeEnabled();
  109 | }
  110 | 
  111 | for (const enabled of [true, false])
  112 |   test(`saved signature display preserves append=${enabled} without copying HTML into the body`, async ({
  113 |     page,
  114 |   }) => {
  115 |     const state = await setup(page, { html: savedHtml, enabled });
  116 |     await open(page);
  117 |     const editor = page.getByRole("dialog", { name: "New email", exact: true });
  118 |     await expect(
  119 |       editor
  120 |         .frameLocator('iframe[title="Saved signature preview"]')
  121 |         .getByText("Synthetic Sender", { exact: true }),
  122 |     ).toBeVisible();
  123 |     await expect(page.getByLabel("Append my saved signature")).toBeChecked({
  124 |       checked: enabled,
  125 |     });
  126 |     await page
  127 |       .getByRole("button", { name: "Review email", exact: true })
  128 |       .click();
  129 |     const review = page.getByRole("dialog", {
  130 |       name: "Send email",
  131 |       exact: true,
  132 |     });
  133 |     await expect(
  134 |       review.locator('iframe[title="Saved signature preview"]'),
  135 |     ).toHaveCount(enabled ? 1 : 0);
  136 |     await review
  137 |       .getByRole("button", { name: "Send email", exact: true })
  138 |       .click();
  139 |     await expect.poll(() => state.sends.length).toBe(1);
  140 |     await expect(page.getByText("Email sent.", { exact: true })).toBeVisible();
  141 |     expect(state.sends[0]).toMatchObject({
  142 |       bodyHtml: `<p>${original}</p>`,
  143 |       appendSignature: enabled,
  144 |     });
  145 |     expect(state.sends[0]?.bodyHtml).not.toContain("Synthetic Sender");
  146 |     expect(state.rewrites).toHaveLength(0);
  147 |   });
  148 | 
  149 | test("saved signature preview blocks active markup and automatic remote content", async ({
  150 |   page,
  151 | }) => {
  152 |   const state = await setup(page, {
  153 |     enabled: true,
  154 |     html:
  155 |       savedHtml +
  156 |       '<script>window.__signatureExecuted=true</script><img src="https://signature.example.test/pixel" onerror="window.__signatureExecuted=true" alt="Remote logo">' +
  157 |       '<map name="links"><area href="https://signature.example.test/map"></map><a href="https://signature.example.test/click">Signature link</a><iframe src="https://signature.example.test/frame"></iframe>' +
  158 |       '<form action="https://signature.example.test/form"><input name="secret"></form><div style="background-image:url(https://signature.example.test/css)">Styled identity</div>' +
  159 |       '<img alt="Inline logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=">',
  160 |   });
  161 |   await open(page);
  162 |   const preview = page.frameLocator('iframe[title="Saved signature preview"]');
  163 |   await expect(
  164 |     preview.getByText("Synthetic Sender", { exact: true }),
  165 |   ).toBeVisible();
  166 |   await expect(preview.getByAltText("Inline logo")).toBeVisible();
  167 |   await expect(
  168 |     preview.locator("script,iframe,form,[href],img[src^='https:'],[onerror]"),
> 169 |   ).toHaveCount(0);
      |     ^ Error: expect(locator).toHaveCount(expected) failed
  170 |   await expect(
  171 |     page.locator('iframe[title="Saved signature preview"]'),
  172 |   ).toHaveAttribute("sandbox", "");
  173 |   expect(state.remote).toEqual([]);
  174 |   expect(state.sends).toEqual([]);
  175 | });
  176 | 
  177 | for (const html of [null, ""])
  178 |   test(`empty signature ${String(html)} has no misleading preview`, async ({
  179 |     page,
  180 |   }) => {
  181 |     await setup(page, { html, enabled: false });
  182 |     await open(page);
  183 |     await expect(
  184 |       page.getByText("No saved signature is available.", { exact: true }),
  185 |     ).toBeVisible();
  186 |     await expect(page.getByLabel("Append my saved signature")).toBeDisabled();
  187 |     await expect(
  188 |       page.locator('iframe[title="Saved signature preview"]'),
  189 |     ).toHaveCount(0);
  190 |   });
  191 | 
  192 | test("signature read failure remains distinct from empty and can be retried deliberately", async ({
  193 |   page,
  194 | }) => {
  195 |   const state = await setup(page);
  196 |   state.signatureStatus = 503;
  197 |   await open(page);
  198 |   const signature = page.getByRole("region", { name: "Saved signature" });
  199 |   await expect(signature.getByRole("alert")).toContainText(
  200 |     "Signature temporarily unavailable",
  201 |   );
  202 |   await expect(
  203 |     page.getByText("No saved signature is available.", { exact: true }),
  204 |   ).toHaveCount(0);
  205 |   state.signatureStatus = 200;
  206 |   await signature.getByRole("button", { name: "Retry signature" }).click();
  207 |   await expect(
  208 |     signature
  209 |       .frameLocator('iframe[title="Saved signature preview"]')
  210 |       .getByText("Synthetic Sender", { exact: true }),
  211 |   ).toBeVisible();
  212 |   expect(state.sends).toEqual([]);
  213 | });
  214 | 
  215 | test("local Undo restores exactly the body preceding the latest verified rewrite with no extra requests", async ({
  216 |   page,
  217 | }) => {
  218 |   const state = await setup(page);
  219 |   await open(page);
  220 |   await rewrite(page);
  221 |   await page
  222 |     .getByRole("button", { name: "Undo Meri rewrite", exact: true })
  223 |     .click();
  224 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  225 |     original,
  226 |   );
  227 |   await expect(
  228 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  229 |   ).toHaveCount(0);
  230 |   expect(state.rewrites).toHaveLength(1);
  231 |   expect(state.sends).toEqual([]);
  232 | });
  233 | 
  234 | test("manual edits retire Undo and the next rewrite snapshots the new local draft", async ({
  235 |   page,
  236 | }) => {
  237 |   const state = await setup(page);
  238 |   await open(page);
  239 |   await rewrite(page);
  240 |   await page.getByLabel("Message", { exact: true }).fill("Newer manual work.");
  241 |   await expect(
  242 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  243 |   ).toHaveCount(0);
  244 |   await rewrite(page);
  245 |   await page
  246 |     .getByRole("button", { name: "Undo Meri rewrite", exact: true })
  247 |     .click();
  248 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  249 |     "Newer manual work.",
  250 |   );
  251 |   expect(state.rewrites).toHaveLength(2);
  252 |   expect(state.sends).toEqual([]);
  253 | });
  254 | 
  255 | test("repeated rewrites retain one latest snapshot and Undo is unavailable while another rewrite awaits", async ({
  256 |   page,
  257 | }) => {
  258 |   const state = await setup(page);
  259 |   await open(page);
  260 |   await rewrite(page);
  261 |   state.hold = true;
  262 |   state.rewriteResult.bodyHtml = "<p>Second verified revision.</p>";
  263 |   await page
  264 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  265 |     .click();
  266 |   await expect.poll(() => state.rewrites.length).toBe(2);
  267 |   await expect(
  268 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  269 |   ).toBeDisabled();
```