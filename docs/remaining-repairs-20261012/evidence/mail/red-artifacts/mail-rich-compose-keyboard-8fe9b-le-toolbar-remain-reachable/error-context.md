# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-rich-compose.spec.ts >> keyboard formatting and mobile toolbar remain reachable
- Location: apps/web/tests/browser/mail-rich-compose.spec.ts:153:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Bold', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Bold', exact: true })

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
  - textbox "Subject": Rich synthetic message
  - text: Message
  - textbox "Message"
  - button "Rewrite with Meri" [disabled]
  - group "Draft rewrite status"
  - checkbox "Append my saved signature" [checked]
  - text: Append my saved signature
  - region "Saved signature":
    - iframe
    - text: Remote images and links are hidden in this preview.
  - region "Email attachments":
    - text: Attach file
    - button "Attach file"
    - text: Up to 5 files, 3 MiB each. Uploaded files are saved to this client’s Files. Removing here only detaches them from this draft.
  - button "Review email"
```

# Test source

```ts
  56  |   await message(page).fill(text);
  57  |   await message(page).press("ControlOrMeta+a");
  58  |   await page.getByRole("button", { name, exact: true }).click();
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
> 156 |   await expect(page.getByRole("button", { name: "Bold", exact: true })).toBeVisible();
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  157 |   await message(page).fill("Keyboard rich draft.");
  158 |   await message(page).press("ControlOrMeta+a");
  159 |   await message(page).press("ControlOrMeta+b");
  160 |   await expect(message(page).locator("strong")).toHaveText("Keyboard rich draft.");
  161 |   for (const name of ["Bold", "Italic", "Underline", "List"]) {
  162 |     const button = page.getByRole("button", { name, exact: true });
  163 |     await button.focus();
  164 |     await expect(button).toBeFocused();
  165 |     const box = await button.boundingBox();
  166 |     expect(box!.x).toBeGreaterThanOrEqual(0);
  167 |     expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  168 |   }
  169 |   await page.screenshot({ path: "/tmp/capiro-remaining-mail-evidence/mobile-rich.png" });
  170 |   expect(state.unexpected).toEqual([]);
  171 | });
  172 | 
  173 | test("identity invalidation revokes rich Undo without provider effects", async ({ page }) => {
  174 |   const state = await setup(page);
  175 |   await format(page, "Bold");
  176 |   await page.getByRole("button", { name: "Rewrite with Meri", exact: true }).click();
  177 |   await expect(page.getByRole("button", { name: "Undo Meri rewrite", exact: true })).toBeVisible();
  178 |   await page.evaluate(() => (window as unknown as { __mailInvalidate: () => Promise<unknown> }).__mailInvalidate());
  179 |   await expect(page.getByRole("button", { name: "Undo Meri rewrite", exact: true })).toHaveCount(0);
  180 |   await expect(message(page)).toHaveText("Verified rewrite.");
  181 |   expect(state.sends).toHaveLength(0);
  182 | });
  183 | 
```