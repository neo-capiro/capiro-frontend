import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { DataProvider } from "../src/shared/portfolio/api/provider";
import {
  contactMailPageSchema,
  defaultMailFilters,
  mailThreadPageSchema,
  mergeMailPages,
  nextMailPage,
  readContactMailPage,
  readMailThreadPage,
} from "../src/features/portfolio/relationships/email/read";
import {
  MailCoverageNotice,
  ThreadContent,
} from "../src/features/portfolio/relationships/thread/ThreadContent";
import {
  fullThread,
  threadClientId,
  threadId,
  threadTenantId,
} from "./thread-mail-fixture";
import {
  mailActorId,
  mailAsOf,
  mailCoverage,
  mailListFixture,
} from "./mail-read-fixture";

const scope = {
  tenantId: threadTenantId,
  userId: mailActorId,
  clientId: threadClientId,
  threadId,
};
const contactScope = {
  tenantId: threadTenantId,
  userId: mailActorId,
  threadId,
  associationClientId: threadClientId,
  recipientEmails: "contact@example.test",
};

describe("bounded Core Mail reads", () => {
  it("preserves server-matched contact threads whose truncated previews omit the recipient", async () => {
    const calls: URL[] = [];
    const api = createApiClient(async (url) => {
      calls.push(new URL(String(url), "https://example.test"));
      return Response.json(mailListFixture([fullThread]));
    });
    const filters = {
      query: "funding & review",
      folder: "sent" as const,
      withinDays: "90",
    };
    const result = await readContactMailPage(
      api,
      {
        tenantId: threadTenantId,
        clientId: threadClientId,
        email: "contact@example.test",
      },
      filters,
    );
    expect(result.items[0]?.id).toBe(threadId);
    expect(Object.fromEntries(calls[0]!.searchParams)).toEqual({
      clientId: threadClientId,
      recipientEmails: "contact@example.test",
      query: filters.query,
      folder: "sent",
      withinDays: "90",
      limit: "50",
    });
  });
  it("carries list filters, cursor and exact asOf into continuation; rejects changed asOf", async () => {
    const api = createApiClient(async (url) => {
      const params = new URL(String(url), "https://example.test").searchParams;
      expect(params.get("cursor")).toBe("next_list");
      expect(params.get("asOf")).toBe(mailAsOf);
      expect(params.get("recipientEmails")).toBe("contact@example.test");
      return Response.json(
        mailListFixture([], { asOf: "2026-10-23T12:00:00.000Z" }),
      );
    });
    await expect(
      readContactMailPage(
        api,
        {
          tenantId: threadTenantId,
          clientId: threadClientId,
          email: "contact@example.test",
        },
        defaultMailFilters,
        { cursor: "next_list", asOf: mailAsOf },
      ),
    ).rejects.toThrow();
  });
  it.each([null, "80000000-0000-4000-8000-000000000001"])(
    "preserves recipient-derived stored client %s with an exact association receipt",
    async (clientId) => {
      const result = {
        ...fullThread,
        clientId,
        associationClientId: threadClientId,
      };
      const api = createApiClient(async (url) => {
        const params = new URL(String(url), "https://example.test")
          .searchParams;
        expect(params.get("clientId")).toBeNull();
        expect(params.get("associationClientId")).toBe(threadClientId);
        expect(params.get("recipientEmails")).toBe(
          contactScope.recipientEmails,
        );
        return Response.json(result);
      });
      expect((await readMailThreadPage(api, contactScope)).clientId).toBe(
        clientId,
      );
    },
  );
  it.each([
    "id",
    "tenantId",
    "connectionOwnerTenantId",
    "connectionOwnerActorId",
    "associationClientId",
  ])("refuses wrong contact page %s", async (field) => {
    const api = createApiClient(async () =>
      Response.json({
        ...fullThread,
        associationClientId: threadClientId,
        [field]: "80000000-0000-4000-8000-000000000009",
      }),
    );
    await expect(readMailThreadPage(api, contactScope)).rejects.toThrow();
  });
  it("uses server cursor and version for message paging and deduplicates repeated IDs", () => {
    const first = {
      ...fullThread,
      totalMessages: 3,
      hasMore: true,
      nextCursor: "page_two",
      nextMessageOffset: 2,
    };
    expect(nextMailPage(first)).toEqual({
      cursor: "page_two",
      asOf: mailAsOf,
      expectedUpdatedAt: mailAsOf,
    });
    const merged = mergeMailPages([
      first,
      {
        ...fullThread,
        messageOffset: 2,
        messages: [fullThread.messages[1]!],
        totalMessages: 3,
      },
    ]);
    expect(merged.messages).toHaveLength(2);
    expect(merged.hasMore).toBe(false);
  });
  it("rejects stale thread continuation instead of concatenating changed messages", async () => {
    const api = createApiClient(async () =>
      Response.json({ ...fullThread, updatedAt: "2026-10-24T12:01:00.000Z" }),
    );
    await expect(
      readMailThreadPage(api, scope, {
        cursor: "page_two",
        asOf: mailAsOf,
        expectedUpdatedAt: mailAsOf,
      }),
    ).rejects.toThrow();
  });
  it("uses exact body offset/hash/version and rejects a substituted body", async () => {
    const original = fullThread.messages[0]!;
    const section = {
      ...original,
      bodyText: "tail",
      bodyOffset: 6000,
      bodyLength: 6004,
      bodyTruncated: true,
    };
    let wrong = false;
    const api = createApiClient(async (url) => {
      const params = new URL(String(url), "https://example.test").searchParams;
      expect(params.get("bodyOffset")).toBe("6000");
      expect(params.get("expectedUpdatedAt")).toBe(mailAsOf);
      expect(params.get("expectedBodySha256")).toBe(original.bodySha256);
      return Response.json({
        ...fullThread,
        messages: [
          {
            ...section,
            bodySha256: wrong ? "b".repeat(64) : original.bodySha256,
          },
        ],
        totalMessages: 1,
      });
    });
    const body = {
      messageId: original.id,
      bodyOffset: 6000,
      expectedBodySha256: original.bodySha256,
    };
    expect(
      (
        await readMailThreadPage(
          api,
          scope,
          { asOf: mailAsOf, expectedUpdatedAt: mailAsOf },
          undefined,
          body,
        )
      ).messages[0]?.bodyText,
    ).toBe("tail");
    wrong = true;
    await expect(
      readMailThreadPage(api, scope, {}, undefined, body),
    ).rejects.toThrow();
  });
  it("rejects oversized pages and inconsistent body continuation", () => {
    expect(
      contactMailPageSchema.safeParse(
        mailListFixture(Array.from({ length: 51 }, () => fullThread)),
      ).success,
    ).toBe(false);
    expect(
      mailThreadPageSchema.safeParse({
        ...fullThread,
        messages: Array.from({ length: 11 }, () => fullThread.messages[0]),
        totalMessages: 11,
      }).success,
    ).toBe(false);
    expect(
      mailThreadPageSchema.safeParse({
        ...fullThread,
        messages: [{ ...fullThread.messages[0], nextBodyOffset: 1 }],
        totalMessages: 1,
      }).success,
    ).toBe(false);
  });
  it("shows import/backfill health independently of connection sync and never claims complete provider history", () => {
    const html = renderToStaticMarkup(
      createElement(MailCoverageNotice, {
        coverage: {
          ...mailCoverage,
          sourceStatus: "degraded",
          backfillComplete: false,
          hasMore: true,
          lastMailSyncAt: null,
        },
      }),
    );
    expect(html).toContain("Mail import is incomplete");
    expect(html).toContain("No completed mail sync");
    expect(html).toContain("complete provider history is not guaranteed");
  });
  it("renders unavailable, provider-truncated and bounded stored-body states distinctly", () => {
    const messages = [
      {
        ...fullThread.messages[0]!,
        bodyStoredPresent: false,
        bodyText: "",
        bodyLength: 0,
      },
      {
        ...fullThread.messages[1]!,
        bodyCompleteness: "truncated" as const,
        bodyText: "head",
        bodyLength: 8,
        nextBodyOffset: 4,
        bodyTruncated: true,
      },
    ];
    const providerProps = {
      api: createApiClient(async () => {
        throw new Error("Unexpected fetch");
      }),
      children: createElement(ThreadContent, {
        thread: { ...fullThread, messages },
        scope,
        onReadError: () => {},
      }),
    };
    const html = renderToStaticMarkup(
      createElement(DataProvider, providerProps),
    );
    expect(html).toContain("Stored message text is unavailable");
    expect(html).toContain("stored provider text is truncated");
    expect(html).toContain("Load more message text");
  });
});
