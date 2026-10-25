import { mailListFixture, mailThreadFixture } from "../mail-read-fixture";
import { installMailReadIdentity } from "./mail-read-fixtures";
import { expect, test, type Page } from "@playwright/test";
import {
  client,
  clientId,
  installFixtures,
  json,
  person,
  personId,
  sendingMailbox,
} from "./fixtures";
import {
  contactThread,
  controlledRead,
  otherClientId,
  readError,
  refreshRelationships,
  relationshipsPath,
  threadId,
} from "./acceptance-relationships-fixtures";

async function installContactMail(
  page: Page,
  associatedClient: string | null = clientId,
) {
  const unexpected = await installFixtures(page);
  await installMailReadIdentity(page);
  const thread = contactThread(associatedClient);
  const history = await controlledRead(
    page,
    "**/engagement/mail-threads?**",
    mailListFixture([thread]),
  );
  const detail = await controlledRead(
    page,
    `**/engagement/mail-threads/${threadId}*`,
    thread,
  );
  return { unexpected, thread, history, detail };
}

async function openContactThread(page: Page) {
  await page.goto(`${relationshipsPath}?person=${personId}`);
  const contact = page.getByRole("dialog", { name: person.name, exact: true });
  await contact
    .getByRole("button", { name: /Synthetic acceptance briefing/ })
    .click();
}

for (const storedClient of [clientId, null])
  test(`contact reply from stored client ${storedClient} reaches review with the canonical origin mailbox`, async ({
    page,
  }) => {
    const control = await installContactMail(page, storedClient);
    const requests: string[] = [];
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes(`/engagement/mail-threads/${threadId}`))
        requests.push(request.url());
      if (request.method() !== "GET") writes.push(request.url());
    });
    await openContactThread(page);
    await page
      .getByRole("button", { name: `Reply to ${person.name}`, exact: true })
      .click();
    const compose = page.getByRole("dialog", { name: "Reply", exact: true });
    await compose
      .getByLabel("Message", { exact: true })
      .fill("Synthetic reply for review only.");
    await expect(compose.getByLabel("From mailbox")).toHaveValue(
      sendingMailbox.id,
    );
    await expect(compose.getByLabel("From mailbox")).toBeDisabled();
    await compose
      .getByRole("button", { name: "Review email", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Send email", exact: true }),
    ).toBeVisible();
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      const params = new URL(request).searchParams;
      expect(params.get("associationClientId")).toBe(clientId);
      expect(params.get("recipientEmails")).toBe(person.email);
    }
    expect(writes).toEqual([]);
    expect(control.unexpected).toEqual([]);
  });

for (const [reason, change] of [
  ["direct other client", { clientId: otherClientId }],
  ["wrong association", { associationClientId: otherClientId }],
  ["wrong actor", { connectionOwnerActorId: otherClientId }],
  ["wrong tenant", { tenantId: otherClientId }],
  ["wrong mailbox tenant", { connectionOwnerTenantId: otherClientId }],
  ["missing origin mailbox", { connectionId: null }],
  ["unavailable origin mailbox", { connectionId: otherClientId }],
] as const)
  test(`contact reply refuses ${reason} on the fresh origin read`, async ({
    page,
  }) => {
    const control = await installContactMail(page, null);
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET") writes.push(request.url());
    });
    await openContactThread(page);
    control.detail.hold({ ...control.thread, ...change });
    await page
      .getByRole("button", { name: `Reply to ${person.name}`, exact: true })
      .click();
    const compose = page.getByRole("dialog", { name: "Reply", exact: true });
    await compose
      .getByLabel("Message", { exact: true })
      .fill("Synthetic reply for review only.");
    await expect.poll(() => control.detail.waiting).toBe(1);
    control.detail.release();
    await expect(
      compose.getByRole("button", { name: "Refresh mailboxes", exact: true }),
    ).toBeEnabled();
    await expect(
      compose.getByRole("button", { name: "Review email", exact: true }),
    ).toBeDisabled();
    expect(writes).toEqual([]);
    expect(control.unexpected).toEqual([]);
  });

test("contact thread admits the exact requested ID for direct and recipient-derived null or other-client histories", async ({
  page,
}) => {
  for (const association of [clientId, null, otherClientId])
    await test.step(`stored clientId ${String(association)}`, async () => {
      const control = await installContactMail(page, association);
      await openContactThread(page);
      const thread = page.getByRole("dialog", {
        name: control.thread.subject,
        exact: true,
      });
      await expect(
        thread.getByText(control.thread.messages[0]!.bodyText, { exact: true }),
      ).toBeVisible();
      await expect(
        thread.getByRole("button", {
          name: `Reply to ${person.name}`,
          exact: true,
        }),
      ).toBeVisible();
      expect(control.detail.reads).toBe(1);
      expect(control.history.writes).toEqual([]);
      expect(control.detail.writes).toEqual([]);
      expect(control.unexpected).toEqual([]);
    });
});

test("contact thread refuses a different returned thread ID even when its client and recipients match", async ({
  page,
}) => {
  const control = await installContactMail(page);
  const foreignId = "a0000000-0000-4000-8000-000000000002";
  const foreign = {
    ...control.thread,
    id: foreignId,
    messages: [
      {
        ...control.thread.messages[0],
        threadId: foreignId,
        bodyText: "Unrequested synthetic thread body",
      },
    ],
  };
  control.detail.hold(foreign);
  await openContactThread(page);
  await expect.poll(() => control.detail.waiting).toBe(1);
  control.detail.release();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("Unrequested synthetic thread body", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: `Reply to ${person.name}`, exact: true }),
  ).toHaveCount(0);
  expect(control.detail.writes).toEqual([]);
  expect(control.unexpected).toEqual([]);
});

for (const source of ["history", "detail"] as const)
  test(`failed current contact ${source} removes previous messages and draft until a successful explicit read`, async ({
    page,
  }) => {
    const control = await installContactMail(page);
    await openContactThread(page);
    const text = control.thread.messages[0]!.bodyText;
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: `Reply to ${person.name}`, exact: true })
      .click();
    const compose = page.getByRole("dialog", { name: "Reply", exact: true });
    await compose
      .getByLabel("Subject", { exact: true })
      .fill("Discard this obsolete reply draft");
    const read = control[source];
    const status = source === "history" ? 403 : 503;
    read.fail(status);
    await refreshRelationships(
      page,
      source === "history" ? ["contact-mail", clientId] : ["mail-thread"],
    );
    await expect(
      page
        .getByRole("alert", { includeHidden: true })
        .filter({ hasText: readError(status) }),
    ).toContainText(readError(status));
    await expect(compose).toHaveCount(0);
    await expect(page.getByText(text, { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: `Reply to ${person.name}`,
        exact: true,
      }),
    ).toHaveCount(0);
    const current = mailThreadFixture(
      {
        ...control.thread,
        messages: [
          {
            ...control.thread.messages[0]!,
            bodyText: "Current synthetic thread after review",
          },
        ],
      },
      { associationClientId: clientId },
    );
    read.hold(source === "history" ? mailListFixture([current]) : current);
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(() => read.waiting).toBe(1);
    await expect(compose).toHaveCount(0);
    await expect(page.getByText(text, { exact: true })).toHaveCount(0);
    read.release();
    if (source === "history") {
      const contact = page.getByRole("dialog", {
        name: person.name,
        exact: true,
      });
      await expect(
        contact.getByRole("button", { name: /Synthetic acceptance briefing/ }),
      ).toBeVisible();
      await expect(page.getByText(text, { exact: true })).toHaveCount(0);
      await expect(compose).toHaveCount(0);
      await contact
        .getByRole("button", { name: /Synthetic acceptance briefing/ })
        .click();
      await expect(page.getByText(text, { exact: true })).toBeVisible();
    } else {
      await expect(
        page.getByText("Current synthetic thread after review", {
          exact: true,
        }),
      ).toBeVisible();
    }
    await expect(compose).toHaveCount(0);
    await page
      .getByRole("button", { name: `Reply to ${person.name}`, exact: true })
      .click();
    await expect(compose.getByLabel("Subject", { exact: true })).toHaveValue(
      `Re: ${control.thread.subject}`,
    );
    expect(control.history.writes).toEqual([]);
    expect(control.detail.writes).toEqual([]);
    expect(control.unexpected).toEqual([]);
  });

test("a held former-client contact thread cannot surface after the route selects another client", async ({
  page,
}) => {
  const control = await installContactMail(page);
  await page.route(`**/clients/${otherClientId}`, (route) =>
    json(route, {
      ...client,
      id: otherClientId,
      name: "Other synthetic client",
    }),
  );
  await page.route(`**/clients/${otherClientId}/people`, (route) =>
    json(route, []),
  );
  control.detail.hold(control.thread);
  await openContactThread(page);
  await expect.poll(() => control.detail.waiting).toBe(1);
  await page.evaluate((destination) => {
    history.pushState({}, "", destination);
    dispatchEvent(new PopStateEvent("popstate"));
  }, `/portfolio/${otherClientId}/relationships`);
  await expect(
    page.getByText("No contacts. Add the first contact for this client.", {
      exact: true,
    }),
  ).toBeVisible();
  control.detail.release();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText(control.thread.messages[0]!.bodyText, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: `Reply to ${person.name}`, exact: true }),
  ).toHaveCount(0);
  expect(control.detail.writes).toEqual([]);
  expect(control.unexpected).toEqual([]);
});
