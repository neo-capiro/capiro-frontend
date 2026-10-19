import { test, expect } from "@playwright/test";
import { filesFixture, filesUrl, connectFiles, fillDocument, createDocument, expectFilesIsolation, actionClient, actionClock, versionPanel, urls, } from "./meri-files-fixtures";
import { navigate, otherActionClient, replaceActionIdentity, } from "./meri-action-host-fixtures";
for (const identity of [
    { name: "user", detail: { userId: "synthetic-new-user" } },
    { name: "session", detail: { sessionId: "synthetic-new-session" } },
    { name: "organization", detail: { orgId: "synthetic-new-org" } },
]) {
    for (const status of [200, 401]) {
        test(`Files late create ${status} cannot publish or revoke the replacement ${identity.name}`, async ({ page, }) => {
            const fixture = await filesFixture(page);
            const held = fixture.hold("create", status === 200
                ? { json: fixture.first }
                : {
                    status,
                    json: { error: { code: "UNAUTHENTICATED", outcome: "UNKNOWN" } },
                });
            await page.goto(filesUrl());
            await connectFiles(page);
            await fillDocument(page);
            await page
                .getByRole("button", { name: "Create document", exact: true })
                .click();
            await held.entered;
            await expect(page.getByLabel("Document title", { exact: true })).toBeDisabled();
            await replaceActionIdentity(page, identity.detail);
            await expect(page.getByRole("button", { name: "Connect document service" })).toBeEnabled();
            const terminal = await held.release();
            expect(["finished", "aborted"]).toContain(terminal);
            await expect(page.getByRole("heading", { name: "Synthetic.docx", exact: true })).toHaveCount(0);
            await connectFiles(page);
            await expect(page.getByLabel("Document title", { exact: true })).toHaveValue("");
            await createDocument(page);
            expect(fixture.calls("create")).toHaveLength(2);
            expect(fixture.host.calls("session")).toHaveLength(2);
            expectFilesIsolation(fixture);
        });
    }
}
test("Files held create cannot restore details after selected-client replacement", async ({ page, }) => {
    const fixture = await filesFixture(page);
    const held = fixture.hold("create", { json: fixture.first });
    await page.goto(filesUrl());
    await connectFiles(page);
    await fillDocument(page);
    await page
        .getByRole("button", { name: "Create document", exact: true })
        .click();
    await held.entered;
    await navigate(page, filesUrl(otherActionClient.id));
    await expect(page.getByRole("region", { name: "Document connection" })).toContainText(otherActionClient.name);
    await held.release();
    await connectFiles(page);
    await expect(page.getByLabel("Document title", { exact: true })).toHaveValue("");
    await expect(page.getByRole("heading", { name: "Synthetic.docx", exact: true })).toHaveCount(0);
    expect(fixture.host.calls("session")[1].body).toEqual({
        clientId: otherActionClient.id,
    });
    expect(fixture.calls("create")).toHaveLength(1);
    expectFilesIsolation(fixture);
});
test("Files expiry removes an idle draft, known version and owned download URL without reconnect", async ({ page, }) => {
    const fixture = await filesFixture(page);
    await page.goto(filesUrl());
    await connectFiles(page);
    await createDocument(page);
    await page
        .getByRole("button", { name: "Verify download", exact: true })
        .click();
    await expect(page.getByRole("link", { name: "Download Synthetic.docx" })).toBeVisible();
    await page
        .getByRole("textbox", { name: "Document text", exact: true })
        .fill("Unsubmitted private text");
    const before = fixture.requests.length;
    await page.clock.fastForward(60_001);
    await expect(page.getByRole("region", { name: "Document connection" })).toContainText("Current document access is unavailable");
    await expect(page.getByRole("textbox", { name: "Document text", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Download Synthetic.docx" })).toHaveCount(0);
    expect((await urls(page)).revoked).toHaveLength(1);
    expect(fixture.host.calls("session")).toHaveLength(1);
    expect(fixture.requests).toHaveLength(before);
    expectFilesIsolation(fixture);
});
for (const status of [401, 403]) {
    test(`Files current ${status} refusal clears known versions and download resources`, async ({ page, }) => {
        const fixture = await filesFixture(page);
        await page.goto(filesUrl());
        await connectFiles(page);
        await createDocument(page);
        await page
            .getByRole("button", { name: "Verify download", exact: true })
            .click();
        await expect(page.getByRole("link", { name: "Download Synthetic.docx" })).toBeVisible();
        fixture.reply("inspect", {
            status,
            json: {
                error: {
                    code: status === 401 ? "UNAUTHENTICATED" : "ACCESS_DENIED",
                    outcome: "READ_UNAVAILABLE",
                },
            },
        });
        await page
            .getByRole("button", { name: "Inspect selected version", exact: true })
            .click();
        await expect(page.getByRole("region", { name: "Document connection" })).toContainText("Current document access is unavailable");
        await expect(page.getByRole("heading", { name: "Synthetic.docx", exact: true })).toHaveCount(0);
        await expect(page.getByRole("link", { name: "Download Synthetic.docx" })).toHaveCount(0);
        expect((await urls(page)).revoked).toHaveLength(1);
        expect(fixture.calls("inspect")).toHaveLength(1);
        expect(fixture.host.calls("session")).toHaveLength(1);
        expectFilesIsolation(fixture);
    });
}
test("Files same-client held verification retains typed draft and known version after current success", async ({ page, }) => {
    const fixture = await filesFixture(page);
    await page.goto(filesUrl());
    await connectFiles(page);
    await createDocument(page);
    await page
        .getByRole("textbox", { name: "Document text", exact: true })
        .fill("Retained same-client private draft");
    const before = fixture.requests.length;
    const held = fixture.host.hold("client", { json: actionClient });
    await page.clock.setSystemTime(new Date(actionClock + 31_000));
    await page.evaluate(() => {
        dispatchEvent(new Event("offline"));
        dispatchEvent(new Event("online"));
    });
    await held.entered;
    await expect(page.getByRole("textbox", { name: "Document text", exact: true })).toBeHidden();
    await expect(versionPanel(page)).toBeHidden();
    expect(fixture.requests).toHaveLength(before);
    await held.release();
    await expect(page.getByRole("textbox", { name: "Document text", exact: true })).toHaveValue("Retained same-client private draft");
    await expect(page.getByRole("heading", { name: "Synthetic.docx", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Inspect selected version", exact: true })).toBeEnabled();
    expect(fixture.host.calls("session")).toHaveLength(1);
    expect(fixture.requests).toHaveLength(before);
    expectFilesIsolation(fixture);
});
test("Files authorized same-client verification does not abort an already held create", async ({ page, }) => {
    const fixture = await filesFixture(page);
    const write = fixture.hold("create", { json: fixture.first });
    await page.goto(filesUrl());
    await connectFiles(page);
    await fillDocument(page);
    await page
        .getByRole("button", { name: "Create document", exact: true })
        .click();
    await write.entered;
    const verify = fixture.host.hold("client", { json: actionClient });
    await page.clock.setSystemTime(new Date(actionClock + 31_000));
    await page.evaluate(() => {
        dispatchEvent(new Event("offline"));
        dispatchEvent(new Event("online"));
    });
    await verify.entered;
    await expect(page.getByRole("textbox", { name: "Document text", exact: true })).toBeHidden();
    await verify.release();
    await expect(page.getByRole("textbox", { name: "Document text", exact: true })).toBeDisabled();
    expect(await write.release()).toBe("finished");
    await expect(page.getByRole("heading", { name: "Synthetic.docx", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Unresolved document write" })).toHaveCount(0);
    expect(fixture.writes()).toHaveLength(1);
    expect(fixture.host.calls("session")).toHaveLength(1);
    expectFilesIsolation(fixture);
});
test("Files a denied same-client refresh destroys retained private state without new document requests", async ({ page, }) => {
    const fixture = await filesFixture(page);
    await page.goto(filesUrl());
    await connectFiles(page);
    await createDocument(page);
    const before = fixture.requests.length;
    const held = fixture.host.hold("client", {
        status: 403,
        json: { message: "Synthetic access revoked" },
    });
    await page.clock.setSystemTime(new Date(actionClock + 31_000));
    await page.evaluate(() => {
        dispatchEvent(new Event("offline"));
        dispatchEvent(new Event("online"));
    });
    await held.entered;
    await held.release();
    await expect(page.getByRole("heading", {
        name: "Selected client unavailable",
        exact: true,
    })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Document text", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Synthetic.docx", exact: true })).toHaveCount(0);
    expect(fixture.requests).toHaveLength(before);
    expectFilesIsolation(fixture);
});
test("Files sign-out removes draft and verified download without a background operation", async ({ page, }) => {
    const fixture = await filesFixture(page);
    await page.goto(filesUrl());
    await connectFiles(page);
    await createDocument(page);
    await page
        .getByRole("button", { name: "Verify download", exact: true })
        .click();
    await expect(page.getByRole("link", { name: "Download Synthetic.docx" })).toBeVisible();
    const before = fixture.requests.length;
    await page.evaluate(() => dispatchEvent(new CustomEvent("test:session", {
        detail: { userId: null, sessionId: null, orgId: null },
    })));
    await expect(page.getByRole("heading", { name: "Synthetic.docx", exact: true })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Document text", exact: true })).toHaveCount(0);
    expect((await urls(page)).revoked).toHaveLength(1);
    expect(fixture.requests).toHaveLength(before);
    expectFilesIsolation(fixture);
});
