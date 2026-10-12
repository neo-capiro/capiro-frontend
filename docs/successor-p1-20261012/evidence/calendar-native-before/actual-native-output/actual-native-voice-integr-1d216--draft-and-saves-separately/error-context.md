# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: actual-native-voice-integration.spec.ts >> Calendar voice source explicitly generates a reviewed draft and saves separately
- Location: ../../tmp/capiro-debrief-fixture-review/actual-native-voice-integration.spec.ts:10:5

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByRole('dialog', { name: 'Review generated debrief', exact: true })
Expected: not visible
Received: visible
Timeout:  5000ms

Call log:
  - Expect "not toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Review generated debrief', exact: true })
    13 × locator resolved to <div role="dialog" tabindex="-1" id="radix-_r_16_" data-state="open" aria-modal="true" data-slot="dialog-content" aria-labelledby="radix-_r_17_" aria-describedby="radix-_r_18_" class="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg b…>…</div>
       - unexpected value "visible"

```

```yaml
- dialog "Review generated debrief":
  - banner
  - paragraph: Review generated debrief
  - text: Content
  - textbox "Content": Reviewed voice recap Action items • Review the original evidence Notes Keep the source qualification.
  - checkbox "Confidential" [disabled]
  - text: Confidential Edits require approval again. Saving does not send email.
  - alert
  - button "Save debrief" [disabled]
```

# Test source

```ts
  7   |   voiceFile,
  8   | } from "/workspace/capiro-p1-successor/apps/web/tests/browser/voice-fixtures";
  9   | 
  10  | test("Calendar voice source explicitly generates a reviewed draft and saves separately", async ({
  11  |   page,
  12  | }, info) => {
  13  |   const { state, unexpected } = await installVoiceFixtures(page);
  14  |   const generated: unknown[] = [];
  15  |   const saved: unknown[] = [];
  16  |   await page.route("**/core/engagement/meetings**", async (route) => {
  17  |     const path = new URL(route.request().url()).pathname;
  18  |     if (path.endsWith("/debrief-draft")) {
  19  |       generated.push(route.request().postDataJSON());
  20  |       return json(route, {
  21  |         recap: "Reviewed voice recap",
  22  |         actionItems: ["Review the original evidence"],
  23  |         notes: "Keep the source qualification.",
  24  |         provider: "anthropic",
  25  |         model: "synthetic-model",
  26  |       });
  27  |     }
  28  |     if (path.endsWith("/debriefs")) {
  29  |       if (route.request().method() === "POST") {
  30  |         saved.push(route.request().postDataJSON());
  31  |         return json(route, {
  32  |           id: "synthetic-voice-debrief",
  33  |           meetingId: voiceMeetingId,
  34  |           clientId: voiceMeeting.client!.id,
  35  |           authorUserId: "user-test",
  36  |           confidential: false,
  37  |           status: "generated",
  38  |           sharedAt: null,
  39  |           sharedByUserId: null,
  40  |           createdAt: "2026-10-11T16:00:00Z",
  41  |           updatedAt: "2026-10-11T16:00:00Z",
  42  |         });
  43  |       }
  44  |       return json(route, []);
  45  |     }
  46  |     if (path.endsWith("/notetaker")) return json(route, null);
  47  |     if (path.endsWith("/notes")) return json(route, []);
  48  |     return json(
  49  |       route,
  50  |       path.endsWith(voiceMeetingId) ? voiceMeeting : [voiceMeeting],
  51  |     );
  52  |   });
  53  |   await page.goto(
  54  |     `/calendar?view=agenda&date=2026-10-11&zone=UTC&meeting=${voiceMeetingId}`,
  55  |   );
  56  |   await page
  57  |     .getByRole("dialog", { name: voiceMeeting.subject })
  58  |     .getByRole("button", {
  59  |       name: "Debriefs",
  60  |       exact: true,
  61  |     })
  62  |     .click();
  63  |   await page
  64  |     .getByRole("button", { name: "Record Voice Memo", exact: true })
  65  |     .click();
  66  |   const source = page.getByRole("dialog", {
  67  |     name: "Record Voice Memo",
  68  |     exact: true,
  69  |   });
  70  |   await source
  71  |     .getByLabel("Audio memo", { exact: true })
  72  |     .setInputFiles(voiceFile);
  73  |   expect(generated).toEqual([]);
  74  |   await source
  75  |     .getByRole("button", { name: "Upload and transcribe", exact: true })
  76  |     .click();
  77  |   await expect(source.getByLabel("Reviewed voice transcript")).toHaveValue(
  78  |     "Synthetic transcript — café notes retained.",
  79  |   );
  80  |   expect(generated).toEqual([]);
  81  |   expect(saved).toEqual([]);
  82  |   await source
  83  |     .getByRole("button", { name: "Generate Debrief", exact: true })
  84  |     .click();
  85  |   const editor = page.getByRole("dialog", {
  86  |     name: "Review generated debrief",
  87  |     exact: true,
  88  |   });
  89  |   await expect(editor.getByLabel("Content")).toHaveValue(
  90  |     "Reviewed voice recap\n\nAction items\n• Review the original evidence\n\nNotes\nKeep the source qualification.",
  91  |   );
  92  |   expect(generated).toEqual([
  93  |     {
  94  |       method: "voice",
  95  |       sourceText: "Synthetic transcript — café notes retained.",
  96  |     },
  97  |   ]);
  98  |   expect(saved).toEqual([]);
  99  |   expect(state.storage).toBe(1);
  100 |   expect(state.extracts).toBe(1);
  101 |   await page.screenshot({
  102 |     path: info.outputPath("calendar-voice-generated-review.png"),
  103 |   });
  104 |   await editor
  105 |     .getByRole("button", { name: "Save debrief", exact: true })
  106 |     .click();
> 107 |   await expect(editor).not.toBeVisible();
      |                            ^ Error: expect(locator).not.toBeVisible() failed
  108 |   expect(saved).toEqual([
  109 |     {
  110 |       body: "Reviewed voice recap\n\nAction items\n• Review the original evidence\n\nNotes\nKeep the source qualification.",
  111 |       confidential: false,
  112 |     },
  113 |   ]);
  114 |   expect(unexpected).toEqual([]);
  115 | });
  116 | 
```