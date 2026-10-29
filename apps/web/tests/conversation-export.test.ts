import { describe, expect, it, vi } from "vitest";
import {
  downloadConversationMessages,
  conversationExportFailure,
} from "../src/features/meri/conversations/conversation-export";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";
import {
  exportAccount,
  exportRow,
  exportId,
  messageExport,
} from "./conversation-export-fixture";
const selection = {
  ...exportAccount,
  conversationId: exportRow.conversationId,
  clientId: exportRow.clientId,
};
const signal = () => new AbortController().signal;
describe("permitted message download", () => {
  it("uses a fresh native history read, binds the selection, and saves text without internal IDs or HTML execution", async () => {
    const payload = messageExport();
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(payload));
    const save = vi.fn<(blob: Blob) => void>();
    await downloadConversationMessages(selection, signal(), { fetcher, save });
    await downloadConversationMessages(selection, signal(), { fetcher, save });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]![0]).toBe("/api/conversations/export");
    const init = fetcher.mock.calls[0]![1]!;
    expect(init.credentials).toBe("same-origin");
    expect(init.cache).toBe("no-store");
    expect(
      JSON.parse(new TextDecoder().decode(init.body as Uint8Array)),
    ).toEqual({ conversationId: exportRow.conversationId });
    const blob = save.mock.calls[0]![0],
      text = await blob.text();
    expect(blob.type).toBe("text/plain;charset=utf-8");
    expect(text).toContain("Synthetic question <script>literal</script>");
    expect(text).toContain("Resumed answer");
    expect(text.match(/USER\n/g)).toHaveLength(1);
    expect(text).not.toContain(exportId(2));
    expect(text).toContain("does not expire");
  });
  it.each(["actor", "client", "conversation", "expired", "extra"] as const)(
    "withholds %s responses",
    async (kind) => {
      const payload = messageExport();
      if (kind === "actor")
        payload.conversation.owner = { ...exportAccount, actorId: "another" };
      if (kind === "client")
        payload.conversation.scopes[0]!.resourceId = exportId(88);
      if (kind === "conversation")
        payload.conversation.conversationId = exportId(99);
      if (kind === "expired") {
        payload.exportedAt = new Date(Date.now() - 120000).toISOString();
        payload.expiresAt = new Date(Date.now() - 60000).toISOString();
      }
      if (kind === "extra")
        Object.assign(payload.turns[0]!, { sourceFiles: ["private"] });
      const save = vi.fn();
      await expect(
        downloadConversationMessages(selection, signal(), {
          fetcher: async () => Response.json(payload),
          save,
        }),
      ).rejects.toThrow();
      expect(save).not.toHaveBeenCalled();
    },
  );
  it("aborts a pending download when its scope lifetime ends", async () => {
    const controller = new AbortController(),
      save = vi.fn();
    await expect(
      downloadConversationMessages(selection, controller.signal, {
        fetcher: async () => {
          controller.abort();
          return Response.json(messageExport());
        },
        save,
      }),
    ).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
  });
  it.each([401, 403, 413])(
    "withholds status %s and gives an honest retry or limit message",
    async (status) => {
      const save = vi.fn();
      let error: unknown;
      try {
        await downloadConversationMessages(selection, signal(), {
          save,
          fetcher: async () =>
            Response.json(
              { error: { code: "CONVERSATION_EXPORT_TOO_LARGE" } },
              { status },
            ),
        });
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(ConversationHistoryUnavailable);
      expect(save).not.toHaveBeenCalled();
      expect(conversationExportFailure(error)).toContain(
        status === 413 ? "No partial file" : "no longer available",
      );
    },
  );
});
