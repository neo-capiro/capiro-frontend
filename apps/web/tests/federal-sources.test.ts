import { it, expect } from "vitest";
import { readFederalSources } from "../src/shared/meri-documents/federal-sources";
import type { ConversationTranscriptPage } from "../src/shared/meri-conversations/history-client";
import official from "./fixtures/federal-official-source.json";
import fixture from "./fixtures/federal-workbench.json";
const context = { ...fixture.binding, selectedClientId: fixture.clientId };
function page(): ConversationTranscriptPage {
  return {
    conversation: {
      conversationId: context.conversationId,
      owner: { tenantId: context.tenantId, actorId: context.actorId },
      scopes: [
        {
          tenantId: context.tenantId,
          kind: "client",
          resourceId: context.selectedClientId,
        },
      ],
    },
    events: [
      {
        sequence: 1,
        event: {
          eventId: "synthetic-citation",
          type: "source.native-bill-text",
          data: {
            source: {
              ...official.input.selection,
              provider: "Synthetic retained claim",
            },
          },
        },
      },
    ],
    nextSequence: 1,
    hasMore: true,
  } as unknown as ConversationTranscriptPage;
}
it("projects exact bill selectors from the existing scoped history reader and preserves paging", async () => {
  const signal = new AbortController().signal;
  const value = await readFederalSources(
    context,
    0,
    signal,
    async (input, actual) => {
      expect(input).toMatchObject({
        conversationId: context.conversationId,
        after: 0,
      });
      expect(actual).toBe(signal);
      return page();
    },
  );
  expect(value).toEqual({
    sources: [
      { eventId: "synthetic-citation", selection: official.input.selection },
    ],
    nextAfter: 1,
  });
});
it.each(["actor", "client", "conversation", "cursor"])(
  "refuses a changed %s before revealing source choices",
  async (change) => {
    const value = { ...page() };
    if (change === "actor") value.conversation.owner.actorId = "other";
    if (change === "client") value.conversation.scopes[0].resourceId = "other";
    if (change === "conversation") value.conversation.conversationId = "other";
    if (change === "cursor") value.nextSequence = 0;
    await expect(
      readFederalSources(
        context,
        0,
        new AbortController().signal,
        async () => value,
      ),
    ).rejects.toThrow();
  },
);
it("discards late history after its lifetime is cancelled", async () => {
  const life = new AbortController();
  await expect(
    readFederalSources(context, 0, life.signal, async () => {
      life.abort();
      return page();
    }),
  ).rejects.toThrow();
});
