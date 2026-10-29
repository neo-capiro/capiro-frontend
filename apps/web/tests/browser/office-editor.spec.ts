import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page, automaticReady = true) {
  const forms: URLSearchParams[] = [];
  await page.route("https://office.example.test/**", async (route) => {
    forms.push(new URLSearchParams(route.request().postData() ?? ""));
    await route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body><h1>Synthetic CODE frame</h1><p id="renewed"></p><script>
      const send=(MessageId,Values={})=>parent.postMessage(JSON.stringify({MessageId,Values}),${JSON.stringify(new URL(page.url()).origin)});
      window.addEventListener('message',event=>{ const data=JSON.parse(event.data);
        if(data.MessageId==='Host_PostmessageReady' && ${automaticReady}) send('App_LoadingStatus',{Status:'Document_Loaded'});
        if(data.MessageId==='Action_Save'){send('Doc_ModifiedStatus',{Modified:false});send('Action_Save_Resp',{success:true});}
        if(data.MessageId==='Reset_Access_Token') document.getElementById('renewed').textContent=(data.Values.token&&data.Values.ttl)?'Token and TTL renewed':'Missing renewal field';
      });
    </script></body></html>`,
    });
  });
  await page.goto("/office-editor.html");
  await page
    .getByRole("button", { name: "Open private editor", exact: true })
    .click();
  return forms;
}
test("transient form POST, private Save and explicit released-editor Publish", async ({
  page,
}) => {
  const forms = await setup(page);
  await expect(
    page.getByRole("button", { name: "Save private draft", exact: true }),
  ).toBeEnabled();
  expect(forms).toHaveLength(1);
  expect(forms[0]!.get("access_token")).toMatch(/^synthetic\./);
  expect(forms[0]!.get("access_token_ttl")).toMatch(/^\d+$/);
  await expect(page.locator('input[name="access_token"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Publish saved revision", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Save private draft", exact: true })
    .click();
  await expect(page.getByLabel("Service operations")).toHaveText(
    "open,launch,read,read",
  );
  await expect(page.getByLabel("Retained view")).not.toContainText(
    "synthetic.",
  );
  await page
    .getByRole("button", { name: "Release editor", exact: true })
    .click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByLabel("Service operations")).toHaveText(
    "open,launch,read,read,release",
  );
  await page
    .getByRole("button", { name: "Publish saved revision", exact: true })
    .click();
  await expect(page.getByLabel("Service operations")).toHaveText(
    "open,launch,read,read,release,publish",
  );
  await expect(
    page.getByText("A new immutable version has been published.", {
      exact: false,
    }),
  ).toBeVisible();
});
test("parent-window spoof cannot mark the cross-origin frame ready", async ({
  page,
}) => {
  await setup(page, false);
  await page.evaluate(() =>
    window.postMessage(
      JSON.stringify({
        MessageId: "App_LoadingStatus",
        Values: { Status: "Document_Loaded" },
      }),
      window.origin,
    ),
  );
  await expect(
    page.getByRole("button", { name: "Save private draft", exact: true }),
  ).toBeDisabled();
  const frame = page
    .frames()
    .find((frame) => frame.url().startsWith("https://office.example.test"))!;
  await frame.evaluate(() =>
    parent.postMessage(
      JSON.stringify({
        MessageId: "App_LoadingStatus",
        Values: { Status: "Document_Loaded" },
      }),
      "*",
    ),
  );
  await expect(
    page.getByRole("button", { name: "Save private draft", exact: true }),
  ).toBeEnabled();
});
test("renewal preserves the existing frame and forwards both token fields", async ({
  page,
}) => {
  const forms = await setup(page);
  await expect(
    page.getByRole("button", { name: "Save private draft", exact: true }),
  ).toBeEnabled();
  const name = await page.locator("iframe").getAttribute("name");
  await page.getByRole("button", { name: "Simulate native renewal" }).click();
  await expect(page.frameLocator("iframe").locator("#renewed")).toHaveText(
    "Token and TTL renewed",
  );
  await expect(page.locator("iframe")).toHaveAttribute("name", name!);
  expect(forms).toHaveLength(1);
  await expect(page.getByLabel("Service operations")).toHaveText(
    "open,launch,renew",
  );
});
test("access loss removes the frame and clears private draft metadata immediately", async ({
  page,
}) => {
  await setup(page);
  await expect(
    page.getByRole("button", { name: "Save private draft", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Save private draft", exact: true })
    .click();
  await expect(
    page.getByText("Saved draft revision 1", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate account access loss" })
    .click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByLabel("Retained view")).toContainText(
    '"snapshot":null',
  );
  await expect(
    page.getByRole("button", { name: "Publish saved revision", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Service operations")).toHaveText(
    "open,launch,read,read",
  );
});
