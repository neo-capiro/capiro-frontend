# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile.spec.ts >> mobile rich editor paints editable controls, structure and preview when scrolled after viewport replacement
- Location: ../../tmp/capiro-newsletter-final-c8aa693e-20261013/mobile-visual-diagnostic/mobile.spec.ts:4:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Rich preview', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "Skip to content" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - banner [ref=e5]:
      - link "Capiro Home" [ref=e6] [cursor=pointer]:
        - /url: /
        - img "Capiro" [ref=e7]
      - navigation "Product modes" [ref=e8]:
        - link "Meri" [ref=e9] [cursor=pointer]:
          - /url: /meri
          - img [ref=e11]
        - link "Portfolio" [ref=e12] [cursor=pointer]:
          - /url: /
          - img [ref=e14]
        - link "Modules" [ref=e15] [cursor=pointer]:
          - /url: /modules
          - img [ref=e17]
      - navigation "Workspace actions" [ref=e18]:
        - link "Quick log" [ref=e19] [cursor=pointer]:
          - /url: /?log=1
          - img [ref=e21]
        - link "Master calendar" [ref=e22] [cursor=pointer]:
          - /url: /calendar
          - img [ref=e24]
        - link "Search intelligence" [ref=e25] [cursor=pointer]:
          - /url: /modules/intelligence
          - img [ref=e27]
        - button "Updates — unavailable" [disabled] [ref=e28]:
          - img [ref=e30]
        - link "Account settings" [ref=e31] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e33]
    - generic [ref=e34]:
      - button "Modules menu" [ref=e35] [cursor=pointer]
      - main [ref=e36]:
        - navigation "Breadcrumb" [ref=e37]:
          - link "← Modules" [ref=e38] [cursor=pointer]:
            - /url: /modules
          - generic [ref=e39]: /
          - combobox "Switch module" [ref=e40] [cursor=pointer]:
            - generic: Workspace
            - img [ref=e41]
        - generic [ref=e43]:
          - generic [ref=e44]:
            - generic [ref=e45]:
              - heading "Rich newsletter editor preview" [level=1] [ref=e46]
              - paragraph [ref=e47]: Edit locally, then explicitly create or review a saved rich document. Collaboration and delivery remain unavailable; leaving clears local edits, while uncertain write guards remain for this session and client scope.
            - button "Close preview" [ref=e49] [cursor=pointer]
          - region "Saved newsletter documents" [ref=e50]:
            - heading "Saved newsletter documents" [level=2] [ref=e51]
            - paragraph [ref=e52]: Loading the library or opening a document may activate an access invitation. These requests run only when you choose an action below. Library access does not imply that every document belongs to the selected client.
            - group [ref=e53]:
              - generic [ref=e54]:
                - button "Load saved newsletters" [ref=e55] [cursor=pointer]
                - button "Create saved document" [ref=e56] [cursor=pointer]
                - button "Read current saved document" [disabled] [ref=e57]
                - button "Save newsletter" [disabled] [ref=e58]
                - button "Preview saved state" [disabled] [ref=e59]
                - button "Stage newsletter" [disabled] [ref=e60]
            - generic [ref=e61]:
              - generic [ref=e62]:
                - button "Collaboration and uploads" [disabled] [ref=e63]
                - generic [ref=e64]: Collaboration and asset operations are not included in this saved-document contract.
              - generic [ref=e65]:
                - button "Generate or send newsletter" [disabled] [ref=e66]
                - generic [ref=e67]: Generation, account review, prepare, test and delivery require separate supported operations and explicit intent.
          - group [ref=e68]:
            - generic [ref=e69]:
              - button "Undo" [ref=e70] [cursor=pointer]
              - button "Redo" [disabled] [ref=e71]
              - button "Mobile preview" [pressed] [ref=e72] [cursor=pointer]
              - button "Plain text" [pressed] [ref=e73] [cursor=pointer]
            - generic [ref=e74]:
              - generic [ref=e75]:
                - generic [ref=e76]: Newsletter name
                - textbox "Newsletter name" [active] [ref=e77]: Mobile synthetic newsletter
              - generic [ref=e78]:
                - generic [ref=e79]: Subject
                - textbox "Subject" [ref=e80]
              - generic [ref=e81]:
                - generic [ref=e82]: Preview text
                - textbox "Preview text" [ref=e83]
              - generic [ref=e84]:
                - generic [ref=e85]: From name
                - textbox "From name" [ref=e86]
              - generic [ref=e87]:
                - generic [ref=e88]: Reply-to email
                - textbox "Reply-to email" [ref=e89]
            - generic [ref=e90]:
              - navigation "Newsletter structure" [ref=e91]:
                - heading "Content" [level=2] [ref=e92]
                - generic [ref=e93]:
                  - heading "Header" [level=3] [ref=e94]
                  - list [ref=e95]:
                    - listitem [ref=e96]:
                      - button "Logo · YOUR FIRM" [ref=e97] [cursor=pointer]
                  - group [ref=e98]:
                    - generic "Add block to Header" [ref=e99] [cursor=pointer]
                - generic [ref=e100]:
                  - heading "Body" [level=3] [ref=e101]
                  - list [ref=e102]:
                    - listitem [ref=e103]:
                      - button "Heading · Synthetic local heading" [pressed] [ref=e104] [cursor=pointer]
                    - listitem [ref=e105]:
                      - button "Paragraph · Add your text here." [ref=e106] [cursor=pointer]
                  - group [ref=e107]:
                    - generic "Add block to Body" [ref=e108] [cursor=pointer]
                - generic [ref=e109]:
                  - heading "Footer" [level=3] [ref=e110]
                  - list [ref=e111]:
                    - listitem [ref=e112]:
                      - button "Footer" [ref=e113] [cursor=pointer]
                  - group [ref=e114]:
                    - generic "Add block to Footer" [ref=e115] [cursor=pointer]
                - paragraph [ref=e116]: Additional content tools, hosted surveys and product blocks are unavailable in this editor preview.
              - generic [ref=e117]:
                - paragraph [ref=e118]: Local preview · external images and links are disabled. Email clients may render differently.
                - generic "Newsletter plain text" [ref=e119]: "YOUR FIRM Synthetic local heading Add your text here. You are receiving this briefing because you subscribed to updates from our team. Update preferences: *|UPDATE_PROFILE|* Unsubscribe: *|UNSUB|*"
              - region "Selected block" [ref=e120]:
                - heading "Heading" [level=2] [ref=e121]
                - generic [ref=e122]:
                  - toolbar "Text formatting" [ref=e123]:
                    - button "Bold" [ref=e124] [cursor=pointer]: B
                    - button "Italic" [ref=e125] [cursor=pointer]: I
                    - button "Bullet list" [ref=e126] [cursor=pointer]
                  - textbox "Block rich text" [ref=e128]:
                    - paragraph [ref=e129]: Synthetic local heading
                - generic [ref=e130]:
                  - generic [ref=e131]: Text color
                  - textbox "Text color" [ref=e132]: "#111827"
                - generic [ref=e133]:
                  - generic [ref=e134]: Top padding
                  - spinbutton "Top padding" [ref=e135]: "0"
                - button "Remove block" [ref=e136] [cursor=pointer]
  - paragraph [ref=e137]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1  | import { test, expect } from '/workspace/capiro-newsletter-port/node_modules/@playwright/test/index.mjs';
  2  | import { onlyLocalRequests, operationFixtures } from '/workspace/capiro-newsletter-port/apps/web/test/browser/fixtures';
  3  | import { moduleRouteFixtures } from '/workspace/capiro-newsletter-port/apps/web/test/browser/module-route-fixtures';
  4  | test('mobile rich editor paints editable controls, structure and preview when scrolled after viewport replacement',async({page},info)=>{
  5  |  await onlyLocalRequests(page); await operationFixtures(page,moduleRouteFixtures);
  6  |  const errors:string[]=[],writes:string[]=[],remote:string[]=[];
  7  |  page.on('pageerror',e=>errors.push(e.message));
  8  |  page.on('request',r=>{if(new URL(r.url()).hostname!=='127.0.0.1')remote.push(r.url());if(r.url().includes('/api/capiro/')&&r.method()!=='GET')writes.push(r.url());});
  9  |  await page.goto('/modules/workspace?view=rich-newsletter');
  10 |  await page.getByRole('button',{name:/^Heading · This week in policy/}).click();
  11 |  await page.getByRole('textbox',{name:'Block rich text'}).fill('Synthetic local heading');
  12 |  await expect(page.frameLocator('iframe[title="Rich newsletter preview"]').getByRole('heading',{name:'Synthetic local heading'})).toBeVisible();
  13 |  await page.getByRole('button',{name:'Mobile preview'}).click();
  14 |  await page.getByRole('button',{name:'Plain text',exact:true}).click();
  15 |  await page.setViewportSize({width:390,height:844});
  16 |  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  17 |  await page.screenshot({path:info.outputPath('mobile-full-after-paint.png'),fullPage:true});
  18 |  const name=page.getByRole('textbox',{name:'Newsletter name',exact:true});
  19 |  await name.scrollIntoViewIfNeeded(); await name.fill('Mobile synthetic newsletter');
  20 |  await expect(name).toHaveValue('Mobile synthetic newsletter');
  21 |  await page.screenshot({path:info.outputPath('mobile-fields-viewport.png')});
  22 |  const heading=page.getByRole('button',{name:'Heading · Synthetic local heading',exact:true});
  23 |  await heading.scrollIntoViewIfNeeded(); await expect(heading).toBeVisible();
  24 |  await page.screenshot({path:info.outputPath('mobile-structure-viewport.png')});
  25 |  const plain=page.getByLabel('Newsletter plain text');
  26 |  await plain.scrollIntoViewIfNeeded(); await expect(plain).toContainText('Synthetic local heading');
  27 |  await page.screenshot({path:info.outputPath('mobile-plain-preview-viewport.png')});
> 28 |  await page.getByRole('button',{name:'Rich preview',exact:true}).click();
     |                                                                  ^ Error: locator.click: Test timeout of 30000ms exceeded.
  29 |  const iframe=page.locator('iframe[title="Rich newsletter preview"]');await iframe.scrollIntoViewIfNeeded();
  30 |  await expect(page.frameLocator('iframe[title="Rich newsletter preview"]').getByRole('heading',{name:'Synthetic local heading'})).toBeVisible();
  31 |  await page.screenshot({path:info.outputPath('mobile-html-preview-viewport.png')});
  32 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  33 |  expect(errors).toEqual([]);expect(writes).toEqual([]);expect(remote).toEqual([]);
  34 |  await info.attach('layout',{body:JSON.stringify(await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth}))),contentType:'application/json'});
  35 | });
  36 | 
```