# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-rich-compose.spec.ts >> paste keeps supported formatting while removing active markup and remote content
- Location: apps/web/tests/browser/mail-rich-compose.spec.ts:190:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('textbox', { name: 'Message', exact: true }).locator('script,style,img,a,iframe,[onerror],[href]')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('textbox', { name: 'Message', exact: true }).locator('script,style,img,a,iframe,[onerror],[href]')
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
        - textbox "Subject" [ref=e28]: Rich synthetic message
      - generic [ref=e29]:
        - generic [ref=e30]: Message
        - generic [ref=e31]:
          - group "Message formatting" [ref=e32]:
            - button "Bold" [ref=e33] [cursor=pointer]: B
            - button "Italic" [ref=e34] [cursor=pointer]: I
            - button "Underline" [ref=e35] [cursor=pointer]: U
            - button "List" [pressed] [ref=e36] [cursor=pointer]
            - button "Attach file" [ref=e37] [cursor=pointer]
          - textbox "Message" [active] [ref=e39]:
            - paragraph [ref=e40]:
              - strong [ref=e41]: Safe bold
              - text: underlinedLiteral link text
            - list [ref=e42]:
              - listitem [ref=e43]:
                - paragraph [ref=e44]: Safe item
            - paragraph [ref=e45]
      - button "Rewrite with Meri" [ref=e46] [cursor=pointer]
      - group "Draft rewrite status"
      - generic [ref=e47]:
        - checkbox "Append my saved signature" [checked] [ref=e48]
        - text: Append my saved signature
      - region "Saved signature" [ref=e49]:
        - generic [ref=e50]:
          - iframe [ref=e51]:
            - paragraph [ref=f1e2]: Saved synthetic signature
          - generic [ref=e52]: Remote images and links are hidden in this preview.
      - region "Email attachments" [ref=e53]:
        - generic [ref=e54]:
          - text: Attach file
          - button "Attach file" [ref=e55]
        - generic [ref=e56]: Up to 5 files, 3 MiB each. Uploaded files are saved to this client’s Files. Removing here only detaches them from this draft.
      - button "Review email" [ref=e57] [cursor=pointer]
```

# Test source

```ts
  116 |       .click();
  117 |     await expect.poll(() => state.sends.length).toBe(1);
  118 |     expect(state.sends[0].bodyHtml).toContain(
  119 |       name === "List"
  120 |         ? "<ul><li><p>Original rich draft.</p></li></ul>"
  121 |         : `<${tag}>Original rich draft.</${tag}>`,
  122 |     );
  123 |     expect(state.sends[0].appendSignature).toBe(true);
  124 |     expect(state.sends[0].bodyHtml).not.toContain("signature");
  125 |     expect(state.unexpected).toEqual([]);
  126 |   });
  127 | }
  128 | 
  129 | test("verified rewrite uses text and Undo restores the complete formatted draft", async ({
  130 |   page,
  131 | }) => {
  132 |   const state = await setup(page);
  133 |   await format(page, "Bold");
  134 |   const before = await message(page).innerHTML();
  135 |   await page
  136 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  137 |     .click();
  138 |   await expect(message(page)).toHaveText("Verified rewrite.");
  139 |   expect(state.rewrites[0].rawText).toBe("Original rich draft.");
  140 |   await page
  141 |     .getByRole("button", { name: "Undo Meri rewrite", exact: true })
  142 |     .click();
  143 |   await expect(message(page)).toHaveJSProperty("innerHTML", before);
  144 |   await expect(
  145 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  146 |   ).toHaveCount(0);
  147 | });
  148 | 
  149 | test("formatting-only edit revokes a held rewrite without replacing current formatting", async ({
  150 |   page,
  151 | }) => {
  152 |   const state = await setup(page);
  153 |   state.held = true;
  154 |   await message(page).fill("Original rich draft.");
  155 |   await page
  156 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  157 |     .click();
  158 |   await expect.poll(() => state.rewrites.length).toBe(1);
  159 |   await message(page).press("ControlOrMeta+a");
  160 |   await page.getByRole("button", { name: "Italic", exact: true }).click();
  161 |   state.release();
  162 |   await expect(message(page).locator("em")).toHaveText("Original rich draft.");
  163 |   await expect(
  164 |     page.getByRole("button", { name: "Rewrite with Meri", exact: true }),
  165 |   ).toBeEnabled();
  166 |   await expect(
  167 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  168 |   ).toHaveCount(0);
  169 | });
  170 | 
  171 | for (const failure of ["unverified", "unavailable"])
  172 |   test(`${failure} rewrite preserves rich content`, async ({ page }) => {
  173 |     const state = await setup(page);
  174 |     state.verified = failure !== "unverified";
  175 |     state.rewriteStatus = failure === "unavailable" ? 503 : 200;
  176 |     await format(page, "Underline");
  177 |     const before = await message(page).innerHTML();
  178 |     await page
  179 |       .getByRole("button", { name: "Rewrite with Meri", exact: true })
  180 |       .click();
  181 |     await expect(
  182 |       page.getByRole("button", { name: "Rewrite with Meri", exact: true }),
  183 |     ).toBeEnabled();
  184 |     await expect(message(page)).toHaveJSProperty("innerHTML", before);
  185 |     await expect(
  186 |       page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  187 |     ).toHaveCount(0);
  188 |   });
  189 | 
  190 | test("paste keeps supported formatting while removing active markup and remote content", async ({
  191 |   page,
  192 | }) => {
  193 |   const state = await setup(page);
  194 |   await expect(
  195 |     page.getByRole("button", { name: "Bold", exact: true }),
  196 |   ).toBeVisible();
  197 |   await message(page).focus();
  198 |   await message(page).evaluate((element) => {
  199 |     const clipboardData = new DataTransfer();
  200 |     clipboardData.setData(
  201 |       "text/html",
  202 |       '<p><strong>Safe bold</strong> <u>underlined</u><script>window.__mailPasted=true</script><img src="https://mail.example.test/pixel" onerror="window.__mailPasted=true"><a href="https://mail.example.test/link">Literal link text</a></p><ul><li>Safe item</li></ul><style>body{display:none}</style><iframe src="https://mail.example.test/frame"></iframe>',
  203 |     );
  204 |     element.dispatchEvent(
  205 |       new ClipboardEvent("paste", {
  206 |         clipboardData,
  207 |         bubbles: true,
  208 |         cancelable: true,
  209 |       }),
  210 |     );
  211 |   });
  212 |   await expect(message(page).locator("strong")).toHaveText("Safe bold");
  213 |   await expect(message(page).locator("li")).toHaveText("Safe item");
  214 |   await expect(
  215 |     message(page).locator("script,style,img,a,iframe,[onerror],[href]"),
> 216 |   ).toHaveCount(0);
      |     ^ Error: expect(locator).toHaveCount(expected) failed
  217 |   const reviewed = await review(page);
  218 |   await expect(
  219 |     reviewed.getByRole("region", { name: "Message preview" }).locator("strong"),
  220 |   ).toHaveText("Safe bold");
  221 |   expect(
  222 |     await page.evaluate(
  223 |       () => (window as unknown as { __mailPasted?: boolean }).__mailPasted,
  224 |     ),
  225 |   ).toBeUndefined();
  226 |   expect(state.unexpected).toEqual([]);
  227 | });
  228 | 
  229 | test("empty and oversized rich bodies cannot be reviewed, and typed text is retained", async ({
  230 |   page,
  231 | }) => {
  232 |   const state = await setup(page);
  233 |   await expect(
  234 |     page.getByRole("button", { name: "Bold", exact: true }),
  235 |   ).toBeVisible();
  236 |   await review(page);
  237 |   await expect(
  238 |     page.getByRole("dialog", { name: "Send email", exact: true }),
  239 |   ).toHaveCount(0);
  240 |   await expect(
  241 |     page.getByText("Enter a message.", { exact: true }),
  242 |   ).toBeVisible();
  243 |   const long = "a".repeat(8001);
  244 |   await message(page).fill(long);
  245 |   await review(page);
  246 |   await expect(
  247 |     page.getByText("Keep the message to 8,000 characters.", { exact: true }),
  248 |   ).toBeVisible();
  249 |   await expect(message(page)).toHaveText(long);
  250 |   expect(state.sends).toHaveLength(0);
  251 | });
  252 | 
  253 | test("keyboard formatting and mobile toolbar remain reachable", async ({
  254 |   page,
  255 | }) => {
  256 |   await page.setViewportSize({ width: 390, height: 844 });
  257 |   const state = await setup(page);
  258 |   await expect(
  259 |     page.getByRole("button", { name: "Bold", exact: true }),
  260 |   ).toBeVisible();
  261 |   await message(page).fill("Keyboard rich draft.");
  262 |   await message(page).press("ControlOrMeta+a");
  263 |   await message(page).press("ControlOrMeta+b");
  264 |   await expect(message(page).locator("strong")).toHaveText(
  265 |     "Keyboard rich draft.",
  266 |   );
  267 |   for (const name of ["Bold", "Italic", "Underline", "List"]) {
  268 |     const button = page.getByRole("button", { name, exact: true });
  269 |     await button.focus();
  270 |     await expect(button).toBeFocused();
  271 |     const box = await button.boundingBox();
  272 |     expect(box!.x).toBeGreaterThanOrEqual(0);
  273 |     expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  274 |   }
  275 |   await page.screenshot({
  276 |     path: "/tmp/capiro-remaining-mail-evidence/mobile-rich.png",
  277 |   });
  278 |   expect(state.unexpected).toEqual([]);
  279 | });
  280 | 
  281 | test("identity invalidation revokes rich Undo without provider effects", async ({
  282 |   page,
  283 | }) => {
  284 |   const state = await setup(page);
  285 |   await format(page, "Bold");
  286 |   await page
  287 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  288 |     .click();
  289 |   await expect(
  290 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  291 |   ).toBeVisible();
  292 |   await page.evaluate(() =>
  293 |     (
  294 |       window as unknown as { __mailInvalidate: () => Promise<unknown> }
  295 |     ).__mailInvalidate(),
  296 |   );
  297 |   await expect(
  298 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  299 |   ).toHaveCount(0);
  300 |   await expect(message(page)).toHaveText("Verified rewrite.");
  301 |   expect(state.sends).toHaveLength(0);
  302 | });
  303 | 
```