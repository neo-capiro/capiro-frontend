# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: alert-channels.spec.ts >> core unsaved destinations disable verification and test actions without implicit saves
- Location: tests/browser/alert-channels.spec.ts:180:3

# Error details

```
Error: locator.click: Test ended.
Call log:
  - waiting for getByRole('dialog', { name: 'My bill alerts', exact: true }).getByRole('button', { name: 'Discard edits and reload' })

```

# Test source

```ts
  52  |         : { message: "Synthetic client access refused" },
  53  |       state.clientStatus,
  54  |     );
  55  |   });
  56  |   for (const owner of ["core", "intelligence"] as const) {
  57  |     const prefs =
  58  |       owner === "core"
  59  |         ? "**/core/intelligence/clients/*/tracker/alert-prefs"
  60  |         : "**/intelligence/tracker/watchlists/*/alert-prefs";
  61  |     await page.route(prefs, async (route) => {
  62  |       const method = route.request().method();
  63  |       state.calls.push({
  64  |         owner,
  65  |         method,
  66  |         action: "preferences",
  67  |         body: method === "GET" ? undefined : route.request().postDataJSON(),
  68  |       });
  69  |       if (owner !== backend)
  70  |         return json(
  71  |           route,
  72  |           owner === "core" ? corePreferences : intelPreferences,
  73  |         );
  74  |       if (method === "PUT") {
  75  |         if (state.put) return state.put(route);
  76  |         state.record = { ...state.record, ...route.request().postDataJSON() };
  77  |       }
  78  |       const parts = new URL(route.request().url()).pathname.split("/");
  79  |       const clientId =
  80  |         owner === "core"
  81  |           ? parts[parts.indexOf("clients") + 1]
  82  |           : parts[parts.indexOf("watchlists") + 1];
  83  |       const record =
  84  |         owner === "core" ? state.record : { ...state.record, clientId };
  85  |       return json(
  86  |         route,
  87  |         state.prefsStatus === 200
  88  |           ? record
  89  |           : { message: "Synthetic preference access refused" },
  90  |         state.prefsStatus,
  91  |       );
  92  |     });
  93  |     const prefix =
  94  |       owner === "core"
  95  |         ? "**/api/backend/core/intelligence/clients/*/tracker"
  96  |         : "**/api/backend/intelligence/clients/*/tracker";
  97  |     for (const [action, path] of [
  98  |       ["start", "sms/verify/start"],
  99  |       ["confirm", "sms/verify/confirm"],
  100 |       ["test", "test-alert"],
  101 |     ] as const) {
  102 |       await page.route(`${prefix}/${path}`, async (route) => {
  103 |         expect(route.request().method()).toBe("POST");
  104 |         state.calls.push({
  105 |           owner,
  106 |           method: "POST",
  107 |           action,
  108 |           body: route.request().postDataJSON(),
  109 |         });
  110 |         if (state[action]) return state[action]!(route);
  111 |         if (action === "start")
  112 |           return json(route, { dormant: false, masked: "••• ••• 0123" });
  113 |         if (action === "confirm") {
  114 |           state.record = {
  115 |             ...state.record,
  116 |             smsPhone: "+12025550123",
  117 |             smsPhoneVerified: true,
  118 |             smsEnabled: true,
  119 |           };
  120 |           return json(route, { verified: true, phone: "+12025550123" });
  121 |         }
  122 |         const channels = route.request().postDataJSON().channels as string[];
  123 |         return json(
  124 |           route,
  125 |           channels.map((channel) => ({
  126 |             channel,
  127 |             status: channel === "email" ? "sent" : "suppressed",
  128 |           })),
  129 |         );
  130 |       });
  131 |     }
  132 |   }
  133 |   return { state, unexpected };
  134 | }
  135 | export async function openAlerts(page: Page, backend: "core" | "intelligence") {
  136 |   await page.goto(`/alert-channels.html?backend=${backend}`);
  137 |   const dialog = alertDialog(page);
  138 |   await expect(dialog.getByLabel("Email address", { exact: true })).toHaveValue(
  139 |     backend === "core"
  140 |       ? corePreferences.emailAddress!
  141 |       : intelPreferences.emailAddress!,
  142 |   );
  143 |   return dialog;
  144 | }
  145 | export async function reloadAlerts(page: Page) {
  146 |   const dialog = alertDialog(page);
  147 |   await dialog
  148 |     .getByRole("button", { name: "Reload saved preferences", exact: true })
  149 |     .click();
  150 |   await dialog
  151 |     .getByRole("button", { name: "Discard edits and reload" })
> 152 |     .click();
      |      ^ Error: locator.click: Test ended.
  153 |   await expect(
  154 |     dialog.getByRole("button", { name: "Discard edits and reload" }),
  155 |   ).toHaveCount(0);
  156 | }
  157 | export { trackerClientId, json };
  158 | 
```