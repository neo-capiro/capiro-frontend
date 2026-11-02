import { expect, test, type Page } from "@playwright/test";

/** The Workspace workbench over a synthetic CODE page: the launch asks for Collabora's full notebookbar UI with its
 * close and revision-history controls, and CODE's Save, Save As and close post to the host, which runs the confirmed
 * Save, publishes the next revision and releases the editor. Not Collabora, Core or Meri acceptance. */
async function setup(page: Page, automaticReady = true) {
  const launches: { url: URL; form: URLSearchParams }[] = [];
  await page.route("https://office.example.test/**", async (route) => {
    launches.push({
      url: new URL(route.request().url()),
      form: new URLSearchParams(route.request().postData() ?? ""),
    });
    await route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body><h1>Synthetic CODE frame</h1><p id="renewed"></p><p id="disabled"></p>
      <button id="save">Save</button><button id="save-as">Save As</button><button id="close">Close</button><button id="history">History</button><button id="modify">Modify</button><script>
      const host=${JSON.stringify(new URL(page.url()).origin)};
      const send=(MessageId,Values={})=>parent.postMessage(JSON.stringify({MessageId,Values}),host);
      const disabled=[];
      window.addEventListener('message',event=>{ const data=JSON.parse(event.data);
        if(data.MessageId==='Host_PostmessageReady' && ${automaticReady}){send('App_LoadingStatus',{Status:'Frame_Ready'});send('App_LoadingStatus',{Status:'Document_Loaded'});}
        if(data.MessageId==='Disable_Default_UIAction'){disabled.push(data.Values.action+':'+data.Values.disable);document.getElementById('disabled').textContent=disabled.join(',');}
        if(data.MessageId==='Action_Save'){send('Doc_ModifiedStatus',{Modified:false});send('Action_Save_Resp',{success:true});}
        if(data.MessageId==='Reset_Access_Token') document.getElementById('renewed').textContent=(data.Values.token&&data.Values.ttl)?'Token and TTL renewed':'Missing renewal field';
      });
      document.getElementById('modify').onclick=()=>send('Doc_ModifiedStatus',{Modified:true});
      document.getElementById('save').onclick=()=>send('UI_Save');
      document.getElementById('save-as').onclick=()=>send('UI_SaveAs',{format:'docx'});
      document.getElementById('close').onclick=()=>send('UI_Close',{EverModified:true});
      document.getElementById('history').onclick=()=>send('UI_FileVersions');
    </script></body></html>`,
    });
  });
  await page.goto("/office-workbench.html", { timeout: 120_000 });
  await page.getByRole("button", { name: "Open editor", exact: true }).click();
  return launches;
}
const frameOf = (page: Page) =>
  page.frameLocator('iframe[title="Office document editor"]');

test("the launch asks CODE for its full workbench UI and the host takes over Save and close", async ({
  page,
}) => {
  const launches = await setup(page);
  await expect(
    page.getByRole("button", { name: "Publish revision", exact: true }),
  ).toBeEnabled();
  expect(launches).toHaveLength(1);
  const { url, form } = launches[0]!;
  expect(url.searchParams.get("ui_defaults")).toBe(
    "UIMode=notebookbar;SavedUIState=false",
  );
  expect(url.searchParams.get("closebutton")).toBe("1");
  expect(url.searchParams.get("revisionhistory")).toBe("1");
  expect(url.searchParams.get("lang")).toMatch(/^[a-z]{2}/i);
  expect(url.searchParams.getAll("WOPISrc")).toHaveLength(1);
  expect([...form.keys()].sort()).toEqual(["access_token", "access_token_ttl"]);
  expect(form.get("access_token")).toMatch(/^synthetic\./);
  await expect(page.locator('input[name="access_token"]')).toHaveCount(0);
  await expect(frameOf(page).locator("#disabled")).toHaveText(
    "UI_Save:true,UI_Close:true",
  );
  await expect(page.getByLabel("Service operations")).toHaveText("open,launch");
});

test("CODE's Save runs the confirmed private Save; its revision-history item opens the host's panel", async ({
  page,
}) => {
  await setup(page);
  await expect(
    page.getByRole("button", { name: "Publish revision", exact: true }),
  ).toBeEnabled();
  await frameOf(page).locator("#save").click();
  await expect(page.getByLabel("Service operations")).toHaveText(
    "open,launch,read,read",
  );
  await expect(
    page.locator("p[role=status]").filter({
      hasText: "Private Save confirmed by the service",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Retained view")).not.toContainText(
    "synthetic.",
  );
  await frameOf(page).locator("#history").click();
  await expect(page.getByLabel("History requests")).toHaveText("1");
});

test("CODE's Save As publishes the saved draft as the next immutable revision and the frame closes", async ({
  page,
}) => {
  await setup(page);
  await expect(
    page.getByRole("button", { name: "Publish revision", exact: true }),
  ).toBeEnabled();
  await frameOf(page).locator("#modify").click();
  await frameOf(page).locator("#save-as").click();
  await expect(page.getByLabel("Service operations")).toHaveText(
    "open,launch,read,read,release,publish,published:3333",
  );
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(
    page.locator("p[role=status]").filter({ hasText: "Revision published" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish revision", exact: true }),
  ).toBeDisabled();
});

test("CODE's close saves pending changes, releases the editor, publishes the saved draft and reports the close", async ({
  page,
}) => {
  await setup(page);
  await expect(
    page.getByRole("button", { name: "Publish revision", exact: true }),
  ).toBeEnabled();
  await frameOf(page).locator("#modify").click();
  await frameOf(page).locator("#close").click();
  await expect(page.getByLabel("Service operations")).toHaveText(
    "open,launch,read,read,release,publish,closed",
  );
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(
    page.locator("p[role=status]").filter({
      hasText: "your saved changes were published as a revision",
    }),
  ).toBeVisible();
  // The draft is published: nothing is left to open or publish from it.
  await expect(
    page.getByRole("button", { name: "Open editor", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Publish revision", exact: true }),
  ).toBeDisabled();
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
  await expect(page.getByText("Loading the editor…")).toBeVisible();
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
    page.getByRole("button", { name: "Publish revision", exact: true }),
  ).toBeEnabled();
});

test("renewal preserves the existing frame and forwards both token fields", async ({
  page,
}) => {
  const launches = await setup(page);
  await expect(
    page.getByRole("button", { name: "Publish revision", exact: true }),
  ).toBeEnabled();
  const name = await page.locator("iframe").getAttribute("name");
  await page.getByRole("button", { name: "Simulate native renewal" }).click();
  await expect(frameOf(page).locator("#renewed")).toHaveText(
    "Token and TTL renewed",
  );
  await expect(page.locator("iframe")).toHaveAttribute("name", name!);
  expect(launches).toHaveLength(1);
  await expect(page.getByLabel("Service operations")).toHaveText(
    "open,launch,renew",
  );
});

test("access loss removes the frame and clears private draft metadata immediately", async ({
  page,
}) => {
  await setup(page);
  await frameOf(page).locator("#save").click();
  await expect(page.getByLabel("Service operations")).toHaveText(
    "open,launch,read,read",
  );
  await page
    .getByRole("button", { name: "Simulate account access loss" })
    .click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByLabel("Retained view")).toContainText(
    '"snapshot":null',
  );
  await expect(
    page.getByRole("button", { name: "Publish revision", exact: true }),
  ).toBeDisabled();
});
