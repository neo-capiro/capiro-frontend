import { expect, test } from "@playwright/test";
import { clientId, installFixtures, json, person, personId } from "./fixtures";
import {
  contactThread,
  relationshipsPath,
} from "./acceptance-relationships-fixtures";
import { installMailReadIdentity } from "./mail-read-fixtures";
import { mailAsOf, mailListFixture } from "../mail-read-fixture";
import { fullThread, threadId } from "../thread-mail-fixture";

test("contact history loads beyond 50, deduplicates moved threads and restarts filters", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await installMailReadIdentity(page);
  const base = contactThread();
  const rows = Array.from({ length: 51 }, (_, index) => ({
    ...base,
    id: `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    subject: `Stored contact thread ${index + 1}`,
  }));
  const requests: URLSearchParams[] = [];
  await page.route("**/engagement/mail-threads?**", (route) => {
    expect(route.request().method()).toBe("GET");
    const params = new URL(route.request().url()).searchParams;
    requests.push(params);
    expect(params.get("clientId")).toBe(clientId);
    expect(params.get("recipientEmails")).toBe(person.email);
    if (params.get("query")) return json(route, mailListFixture([]));
    return json(
      route,
      params.has("cursor")
        ? mailListFixture([rows[49]!, rows[50]!])
        : mailListFixture(rows.slice(0, 50), {
            hasMore: true,
            nextCursor: "synthetic_next",
          }),
    );
  });
  await page.goto(`${relationshipsPath}?person=${personId}`);
  await page
    .getByRole("button", { name: "Load more threads", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Stored contact thread 51/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Stored contact thread 50/ }),
  ).toHaveCount(1);
  expect(requests[1]!.get("cursor")).toBe("synthetic_next");
  expect(requests[1]!.get("asOf")).toBe(mailAsOf);
  await page
    .getByLabel("Search stored mail", { exact: true })
    .fill("No such subject");
  await page
    .getByRole("combobox", { name: "Folder", exact: true })
    .selectOption("sent");
  await page
    .getByRole("combobox", { name: "Message date", exact: true })
    .selectOption("90");
  await page.getByRole("button", { name: "Apply mail filters" }).click();
  await expect(
    page.getByText(
      "No accessible messages match this contact and the selected filters.",
    ),
  ).toBeVisible();
  expect(requests.at(-1)!.get("cursor")).toBeNull();
  expect(requests.at(-1)!.get("asOf")).toBeNull();
  expect(requests.at(-1)!.get("withinDays")).toBe("90");
  expect(unexpected).toEqual([]);
});

test("timeline loads bounded message and exact body continuations", async ({
  page,
}) => {
  await installFixtures(page);
  await installMailReadIdentity(page);
  const firstMessage = {
    ...fullThread.messages[0]!,
    bodyText: "a".repeat(6000),
    bodyLength: 6004,
    bodyTruncated: true,
    nextBodyOffset: 6000,
    bodyCompleteness: "preview",
  };
  await page.route(`**/engagement/mail-threads/${threadId}*`, (route) => {
    expect(route.request().method()).toBe("GET");
    const params = new URL(route.request().url()).searchParams;
    expect(params.get("clientId")).toBe(fullThread.clientId);
    if (params.has("bodyOffset")) {
      expect(params.get("asOf")).toBe(mailAsOf);
      expect(params.get("expectedUpdatedAt")).toBe(mailAsOf);
      expect(params.get("expectedBodySha256")).toBe(firstMessage.bodySha256);
      return json(route, {
        ...fullThread,
        messages: [
          {
            ...firstMessage,
            bodyOffset: 6000,
            bodyText: "tail",
            nextBodyOffset: null,
          },
        ],
        totalMessages: 1,
      });
    }
    if (params.has("cursor"))
      return json(route, {
        ...fullThread,
        messages: [fullThread.messages[1]],
        messageOffset: 1,
      });
    return json(route, {
      ...fullThread,
      messages: [firstMessage],
      hasMore: true,
      nextCursor: "synthetic_page",
      nextMessageOffset: 1,
    });
  });
  await page.goto("/__test/thread-mail");
  await page.getByRole("button", { name: "Expand email thread" }).click();
  await expect(
    page.getByRole("button", { name: "Reply", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Only a provider preview was stored."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Load more message text" }).click();
  await expect(
    page.getByText(`${"a".repeat(6000)}tail`, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Load more messages", exact: true })
    .click();
  await expect(page.getByText(/2 of 2 stored messages loaded/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reply", exact: true }),
  ).toBeEnabled();
});

test("a changed thread or removed account during continuation hides prior messages and restarts explicitly", async ({
  page,
}) => {
  await installFixtures(page);
  await installMailReadIdentity(page);
  let removed = false;
  const cursors: (string | null)[] = [];
  await page.route(`**/engagement/mail-threads/${threadId}*`, (route) => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    cursors.push(cursor);
    if (cursor || removed)
      return json(
        route,
        {
          message: removed
            ? "Mail thread not found"
            : "This stored thread changed. Refresh before continuing.",
        },
        removed ? 404 : 409,
      );
    return json(route, {
      ...fullThread,
      messages: [fullThread.messages[0]],
      hasMore: true,
      nextCursor: "synthetic_page",
      nextMessageOffset: 1,
    });
  });
  await page.goto("/__test/thread-mail");
  await page.getByRole("button", { name: "Expand email thread" }).click();
  await page
    .getByRole("button", { name: "Load more messages", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("stored thread changed");
  await expect(
    page.getByText("Earlier outgoing message.", { exact: true }),
  ).toHaveCount(0);
  removed = true;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Mail thread not found");
  expect(cursors.at(-1)).toBeNull();
});
