import { expect, test } from "@playwright/test";
import { clientId, installFixtures, json, person, personId } from "./fixtures";
import {
  contactThread,
  controlledRead,
  readError,
  refreshRelationships,
  relationshipsPath,
  threadId,
} from "./acceptance-relationships-fixtures";

test("pending send and lost delivery receipt survive current-history loss and same-contact reopen", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const thread = contactThread();
  const historyRead = await controlledRead(
    page,
    "**/engagement/mail-threads?**",
    [thread],
  );
  await page.route(`**/engagement/mail-threads/${threadId}`, (route) =>
    json(route, thread),
  );
  let sends = 0;
  let requestKey: string | undefined;
  const recoveryKeys: string[] = [];
  await page.route("**/core/engagement/mail/send-intents/*", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    recoveryKeys.push(
      new URL(route.request().url()).pathname.split("/").at(-1)!,
    );
    return json(
      route,
      { message: "Synthetic delivery readback unavailable" },
      503,
    );
  });
  let release: (() => void) | undefined;
  await page.route("**/engagement/mail/send", async (route) => {
    expect(route.request().method()).toBe("POST");
    sends++;
    requestKey = route.request().postDataJSON().requestKey;
    expect(route.request().postDataJSON()).toMatchObject({
      clientId,
      threadId,
      subject: "Synthetic pending reply",
    });
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await json(route, { message: "Synthetic delivery unknown" }, 503);
  });
  await page.goto(`${relationshipsPath}?person=${personId}`);
  const contact = page.getByRole("dialog", { name: person.name, exact: true });
  await contact
    .getByRole("button", { name: /Synthetic acceptance briefing/ })
    .click();
  await page
    .getByRole("button", { name: `Reply to ${person.name}`, exact: true })
    .click();
  const compose = page.getByRole("dialog", { name: "Reply", exact: true });
  await compose
    .getByLabel("Subject", { exact: true })
    .fill("Synthetic pending reply");
  await compose
    .getByLabel("Message", { exact: true })
    .fill("Synthetic explicit send regression.");
  await compose
    .getByRole("button", { name: "Review email", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Send email", exact: true })
    .getByRole("button", { name: "Send email", exact: true })
    .click();
  await expect.poll(() => Boolean(release)).toBe(true);
  historyRead.fail(403);
  await refreshRelationships(page, ["contact-mail", clientId]);
  await expect(
    page
      .getByRole("alert", { includeHidden: true })
      .filter({ hasText: readError(403) }),
  ).toContainText(readError(403));
  await expect(compose).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Send email", exact: true }),
  ).toHaveCount(0);
  historyRead.hold([thread]);
  await contact.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => historyRead.waiting).toBe(1);
  historyRead.release();
  await contact
    .getByRole("button", { name: /Synthetic acceptance briefing/ })
    .click();
  await page
    .getByRole("button", { name: `Reply to ${person.name}`, exact: true })
    .click();
  await expect(
    compose.getByRole("button", { name: "Review email", exact: true }),
  ).toBeDisabled();
  await expect(compose.getByLabel("Subject", { exact: true })).toHaveValue(
    `Re: ${thread.subject}`,
  );
  release!();
  await expect(
    compose.getByRole("alert").filter({ hasText: "Delivery may be uncertain" }),
  ).toBeVisible();
  await expect(
    compose.getByRole("button", { name: "Review email", exact: true }),
  ).toBeDisabled();
  await compose.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: `Reply to ${person.name}`, exact: true })
    .click();
  await expect(
    compose.getByRole("alert").filter({ hasText: "Delivery may be uncertain" }),
  ).toBeVisible();
  await expect(
    compose.getByRole("button", { name: "Review email", exact: true }),
  ).toBeDisabled();
  expect(sends).toBe(1);
  expect(requestKey).toBeTruthy();
  expect(recoveryKeys.length).toBeGreaterThan(0);
  expect(recoveryKeys.every((key) => key === requestKey)).toBe(true);
  expect(historyRead.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});
