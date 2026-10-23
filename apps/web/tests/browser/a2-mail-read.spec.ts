import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  fullThread,
  threadActorId,
  threadClientId,
  threadId,
  threadTenantId,
} from "../thread-mail-fixture";

const lateThread = "20000000-0000-4000-8000-000000000002";
const finalThread = "20000000-0000-4000-8000-000000000003";
const body = "A".repeat(5999) + "😀tail";
const hash = createHash("sha256").update(body).digest("hex");
const failures = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const values: string[] = [];
  failures.set(page, values);
  page.on("pageerror", (error) => values.push(error.message));
});
test.afterEach(({ page }) => expect(failures.get(page)).toEqual([]));

async function fixture(
  page: Page,
  options: {
    timeline?: boolean;
    noEmail?: boolean;
    kind?: "missing" | "preview" | "empty";
  } = {},
) {
  const calls: URL[] = [],
    unexpected: string[] = [],
    writes: string[] = [];
  let listStatus = 200,
    bodyStatus = 200,
    wrongOwner = false,
    holdBody: Promise<void> | undefined;
  const message = fullThread.messages[0]!;
  const large = {
    ...message,
    bodyText: body.slice(0, 5999),
    bodyOffset: 0,
    bodyLength: body.length,
    nextBodyOffset: 5999,
    bodyTruncated: true,
    bodySha256: hash,
  };
  const messages = [
    large,
    ...Array.from({ length: 4 }, (_, index) => ({
      ...fullThread.messages[1]!,
      id: `30000000-0000-4000-8000-00000000000${index + 2}`,
      bodyText: `Stored message ${index + 2}`,
      bodyLength: `Stored message ${index + 2}`.length,
    })),
  ];
  if (options.kind)
    messages[0] = {
      ...large,
      bodyText: options.kind === "preview" ? "Only a stored preview" : "",
      bodyLength: options.kind === "preview" ? 21 : 0,
      nextBodyOffset: null,
      bodyTruncated: false,
      bodyStoredPresent: options.kind !== "missing",
      bodyCompleteness: options.kind === "preview" ? "preview" : "full",
    };
  await page.route("**/api/backend/core/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const path = url.pathname.split("/api/backend/core/")[1];
    calls.push(url);
    if (request.method() !== "GET") {
      writes.push(path ?? "unknown");
      return route.fulfill({
        status: 500,
        json: { message: "Unexpected write" },
      });
    }
    if (path === "me")
      return route.fulfill({
        json: {
          user: { id: threadActorId, email: "actor@example.test" },
          tenant: { id: threadTenantId, name: "Synthetic" },
          role: "standard_user",
        },
      });
    if (path === "me/email-signature")
      return route.fulfill({ json: { html: null, enabled: false } });
    if (path === "engagement/mail-threads") {
      if (listStatus !== 200)
        return route.fulfill({
          status: listStatus,
          json: { message: "Synthetic current Mail access refused" },
        });
      const next = url.searchParams.has("cursor");
      const ids = next ? [threadId, finalThread] : [threadId, lateThread];
      return route.fulfill({
        json: {
          items: ids.map((id) => ({
            ...fullThread,
            id,
            subject: `Stored thread ${id.slice(-1)}`,
            messages: [{ ...message, bodyText: "Preview" }],
          })),
          hasMore: !next,
          nextCursor: next ? null : "bGlzdDI",
          asOf: fullThread.asOf,
          coverageTruncated: false,
          notice: "Live list",
          mailboxes: [
            {
              id: fullThread.connectionId,
              email: "owner@example.test",
              coverage: {
                ...fullThread.coverage,
                sourceStatus: "degraded",
                backfillComplete: false,
              },
            },
          ],
        },
      });
    }
    if (path === `engagement/mail-threads/${threadId}`) {
      const associated = url.searchParams.get("associationClientId");
      const base = {
        ...fullThread,
        clientId: associated ? null : threadClientId,
        associationClientId: associated,
        connectionOwnerActorId: wrongOwner ? threadClientId : threadActorId,
      };
      if (url.searchParams.has("bodyOffset")) {
        await holdBody;
        if (bodyStatus !== 200)
          return route.fulfill({
            status: bodyStatus,
            json: {
              message: "Stored thread changed. Refresh before continuing.",
            },
          });
        return route.fulfill({
          json: {
            ...base,
            totalMessages: 1,
            messages: [
              {
                ...large,
                bodyText: body.slice(5999),
                bodyOffset: 5999,
                nextBodyOffset: null,
                bodyTruncated: true,
              },
            ],
          },
        });
      }
      const next = url.searchParams.has("cursor");
      return route.fulfill({
        json: {
          ...base,
          totalMessages: 5,
          messageOffset: next ? 3 : 0,
          messages: next ? messages.slice(3) : messages.slice(0, 3),
          hasMore: !next,
          nextMessageOffset: next ? null : 3,
          nextCursor: next ? null : "bWVzc2FnZTI",
        },
      });
    }
    unexpected.push(path ?? "unknown");
    return route.fulfill({
      status: 500,
      json: { message: "Unexpected fixture request" },
    });
  });
  await page.goto(
    `/a2-mail-read.html${options.timeline ? "?timeline=1" : options.noEmail ? "?noEmail=1" : ""}`,
  );
  return {
    calls,
    unexpected,
    writes,
    listStatus: (value: number) => {
      listStatus = value;
    },
    bodyStatus: (value: number) => {
      bodyStatus = value;
    },
    wrongOwner: () => {
      wrongOwner = true;
    },
    holdBody: (value: Promise<void>) => {
      holdBody = value;
    },
  };
}
async function openThread(page: Page) {
  await page.getByRole("button", { name: /Stored thread 1/ }).click();
  await expect(
    page.getByText("Stored message 2", { exact: true }),
  ).toBeVisible();
}
test("pages a live Contact list, deduplicates repeated IDs and refreshes from the beginning", async ({
  page,
}) => {
  const f = await fixture(page);
  await page
    .getByRole("button", { name: "Load more threads", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Stored thread 1/ }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: /Stored thread 3/ }),
  ).toBeVisible();
  await expect(page.getByText(/End of matching stored threads/)).toBeVisible();
  await expect(
    page.getByText(/Stored sync is incomplete or delayed/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Refresh history" }).click();
  await expect(
    page.getByRole("button", { name: /Stored thread 3/ }),
  ).toHaveCount(0);
  const reads = f.calls.filter((url) => url.pathname.endsWith("/mail-threads"));
  expect(reads.map((url) => url.searchParams.has("cursor"))).toEqual([
    false,
    true,
    false,
  ]);
  expect(f.unexpected).toEqual([]);
  expect(f.writes).toEqual([]);
});
test("filter changes start a fresh bounded read with exact folder, date and literal search", async ({
  page,
}) => {
  const f = await fixture(page);
  await page
    .getByRole("button", { name: "Load more threads", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Stored thread 3/ }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search stored mail" })
    .fill("literal%_");
  await page.getByLabel("Folder", { exact: true }).selectOption("sent");
  await page.getByLabel("Message date", { exact: true }).selectOption("30");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect
    .poll(() => f.calls.at(-1)?.searchParams.get("query"))
    .toBe("literal%_");
  const url = f.calls.at(-1)!;
  expect(url.searchParams.get("folder")).toBe("sent");
  expect(url.searchParams.get("withinDays")).toBe("30");
  expect(url.searchParams.has("cursor")).toBe(false);
  expect(f.unexpected).toEqual([]);
});
test("continues a large Unicode body and thread messages only on explicit requests", async ({
  page,
}) => {
  const f = await fixture(page);
  await openThread(page);
  await expect(page.getByText("😀tail", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Load more message text", exact: true })
    .click();
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  const read = f.calls.find((url) => url.searchParams.has("bodyOffset"))!;
  expect(read.searchParams.get("bodyOffset")).toBe("5999");
  expect(read.searchParams.get("expectedBodySha256")).toBe(hash);
  expect(read.searchParams.get("associationClientId")).toBe(threadClientId);
  expect(read.searchParams.get("recipientEmails")).toBe("person@example.test");
  await page
    .getByRole("button", { name: "Load more messages", exact: true })
    .click();
  await expect(
    page.getByText("Stored message 5", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/5 of 5 stored messages/)).toBeVisible();
  expect(f.unexpected).toEqual([]);
  expect(f.writes).toEqual([]);
});
test("a changed body hides the current thread until an explicit refresh without replay", async ({
  page,
}) => {
  const f = await fixture(page);
  await openThread(page);
  f.bodyStatus(409);
  await page
    .getByRole("button", { name: "Load more message text", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Stored thread changed");
  await expect(page.getByText("Stored message 2", { exact: true })).toHaveCount(
    0,
  );
  expect(
    f.calls.filter((url) => url.searchParams.has("bodyOffset")),
  ).toHaveLength(1);
  f.bodyStatus(200);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByText("Stored message 2", { exact: true }),
  ).toBeVisible();
  expect(
    f.calls.filter((url) => url.searchParams.has("bodyOffset")),
  ).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});
test("current access rejection clears existing history and wrong-owner details never render", async ({
  page,
}) => {
  const f = await fixture(page);
  f.wrongOwner();
  await page.getByRole("button", { name: /Stored thread 1/ }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Stored message 2", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  f.listStatus(404);
  await page.getByRole("button", { name: "Refresh history" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "current Mail access refused",
  );
  await expect(page.getByRole("button", { name: /Stored thread/ })).toHaveCount(
    0,
  );
  expect(f.unexpected).toEqual([]);
});
test("an account change retires a held body response and the open thread", async ({
  page,
}) => {
  const f = await fixture(page);
  await openThread(page);
  let release!: () => void;
  f.holdBody(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  await page
    .getByRole("button", { name: "Load more message text", exact: true })
    .click();
  await expect
    .poll(() => f.calls.some((url) => url.searchParams.has("bodyOffset")))
    .toBe(true);
  await page.evaluate(() => {
    (
      Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent === "Change synthetic account",
      ) as HTMLButtonElement
    ).click();
  });
  release();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(body, { exact: true })).toHaveCount(0);
  expect(f.unexpected).toEqual([]);
  expect(f.writes).toEqual([]);
});
for (const kind of ["missing", "preview", "empty"] as const)
  test(`stored ${kind} text has an explicit state`, async ({ page }) => {
    const f = await fixture(page, { kind });
    await openThread(page);
    const text =
      kind === "missing"
        ? "Stored message text is unavailable."
        : kind === "empty"
          ? "This stored message has no text."
          : "Only a provider preview was stored. Open your mailbox for the full message.";
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    expect(f.unexpected).toEqual([]);
  });
test("Timeline cannot choose reply recipients until every stored message page is loaded", async ({
  page,
}) => {
  const f = await fixture(page, { timeline: true });
  await page.getByRole("button", { name: "Expand email thread" }).click();
  await expect(
    page.getByRole("button", { name: "Reply all", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Load more messages", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reply all", exact: true }),
  ).toBeEnabled();
  expect(
    f.calls
      .filter((url) => url.pathname.endsWith(threadId))
      .every(
        (url) =>
          url.searchParams.get("clientId") === threadClientId &&
          !url.searchParams.has("associationClientId"),
      ),
  ).toBe(true);
  expect(f.unexpected).toEqual([]);
  expect(f.writes).toEqual([]);
});
test("mobile dark history and long message text remain inside the viewport", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  const f = await fixture(page);
  await openThread(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("mail-mobile-dark.png") });
  expect(f.unexpected).toEqual([]);
});
test("a contact without an email makes no Mail read", async ({ page }) => {
  const f = await fixture(page, { noEmail: true });
  await expect(
    page.getByText("Add an email address to view mail for this contact."),
  ).toBeVisible();
  expect(f.calls.some((url) => url.pathname.includes("mail-threads"))).toBe(
    false,
  );
  expect(f.unexpected).toEqual([]);
});
