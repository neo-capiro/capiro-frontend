import { afterEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { EMPTY_TRANSCRIPT_SCHEMA } from "@capiro/meri-contracts/conversation-history";
import {
  savedHistory,
  savedTranscriptQuery,
  latestTranscriptQuery,
} from "../src/shared/meri-conversations/history-queries";
import { conversation } from "../test/browser/meri-history-fixtures";
import { clientId } from "../test/browser/meri-conversation-fixtures";

afterEach(() => vi.unstubAllGlobals());
const account = conversation.owner;
const empty = { schema: EMPTY_TRANSCRIPT_SCHEMA, conversation } as const;
const state = {
  error: null,
  hasNextPage: false,
  isFetching: false,
  isFetchNextPageError: false,
  isRefetching: false,
};

it("refuses an empty latest-run read after a positive saved page, including sequence base zero", async () => {
  vi.stubGlobal("fetch", async () => Response.json(empty));
  const cache = new QueryClient();
  try {
    await expect(
      cache.fetchQuery(
        latestTranscriptQuery(
          account,
          clientId,
          conversation.conversationId,
          0,
          true,
        ),
      ),
    ).rejects.toThrow("Latest saved run unavailable");
  } finally {
    cache.clear();
  }
});

it("admits an owned empty transcript once, without a latest run or next page", async () => {
  const fetcher = vi.fn(async () => Response.json(empty));
  vi.stubGlobal("fetch", fetcher);
  const cache = new QueryClient();
  try {
    const data = await cache.fetchInfiniteQuery(
      savedTranscriptQuery(
        account,
        clientId,
        conversation.conversationId,
        true,
      ),
    );
    expect(data.pages).toEqual([empty]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const result = savedHistory({ ...state, data }, true, account, clientId);
    expect(result).toEqual({
      saved: undefined,
      empty: true,
      invalid: false,
      moreFailed: false,
    });
    expect(
      savedHistory(
        { ...state, data, isRefetching: true },
        true,
        account,
        clientId,
      ).empty,
    ).toBe(false);
  } finally {
    cache.clear();
  }
});

it.each(["NOT_FOUND", "CONVERSATION_NOT_FOUND"])(
  "a genuine 404 %s remains unavailable",
  async (code) => {
    vi.stubGlobal("fetch", async () =>
      Response.json({ error: { code } }, { status: 404 }),
    );
    const cache = new QueryClient();
    try {
      await expect(
        cache.fetchInfiniteQuery(
          savedTranscriptQuery(
            account,
            clientId,
            conversation.conversationId,
            true,
          ),
        ),
      ).rejects.toThrow();
      const error = cache.getQueryCache().getAll()[0]!.state.error;
      expect(
        savedHistory(
          { ...state, data: undefined, error },
          true,
          account,
          clientId,
        ).empty,
      ).toBe(false);
    } finally {
      cache.clear();
    }
  },
);

it("refuses foreign and repeated empty pages instead of treating them as no history", () => {
  for (const pages of [
    [empty, empty],
    [
      {
        ...empty,
        conversation: {
          ...conversation,
          owner: { ...account, actorId: "other" },
        },
      },
    ],
  ]) {
    const result = savedHistory(
      { ...state, data: { pages } },
      true,
      account,
      clientId,
    );
    expect(result.invalid).toBe(true);
    expect(result.empty).toBe(false);
    expect(result.saved).toBeUndefined();
  }
});
