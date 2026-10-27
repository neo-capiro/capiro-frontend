import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  readIncomingFiles,
  importIncomingFile,
  readImportedFile,
  type IncomingManifest,
  type IncomingReceipt,
} from "../src/features/portfolio/relationships/email/incoming-files";
import { mailBodySchema } from "../src/features/portfolio/relationships/email/read";
import { fullThread } from "./thread-mail-fixture";

const id = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const original = {
  threadId: id(1),
  messageId: id(2),
  connectionId: id(3),
  updatedAt: "2026-10-27T00:00:00.000Z",
  clientId: id(4),
};
const file = {
  fileKey: "a".repeat(64),
  name: "memo.txt",
  contentType: "text/plain",
  bytes: 4,
  status: "importable" as const,
  reason: null,
};
const manifest: IncomingManifest = {
  state: "manifest",
  original,
  manifestSha256: "b".repeat(64),
  files: [file],
  notice: "Current provider metadata.",
};
const receipt: IncomingReceipt = {
  state: "imported",
  original,
  manifestSha256: manifest.manifestSha256,
  fileKey: file.fileKey,
  provenanceSha256: "c".repeat(64),
  attachment: {
    id: id(5),
    fileName: file.name,
    contentType: file.contentType,
    bytes: file.bytes,
    sha256: "d".repeat(64),
    lifecycleStatus: "quarantined",
    scanStatus: "pending",
  },
  reused: false,
  notice: "Private copy stored; scanning pending.",
};
const stored = {
  id: id(5),
  clientId: id(4),
  fileName: file.name,
  contentType: file.contentType,
  byteSize: 4,
  source: "incoming_mail",
  folder: null,
  viewerMode: "restricted",
  viewerUserIds: [id(6)],
  uploadedByUserId: id(6),
  createdAt: original.updatedAt,
  lifecycleStatus: "quarantined",
  scanStatus: "pending",
  extractionStatus: null,
  indexedAt: null,
  usable: false,
  downloadUrl: null,
  previewUrl: null,
  mailMessageId: original.messageId,
  sourceEntityType: "incoming_mail_file",
  sourceEntityId: `${original.messageId}:${receipt.provenanceSha256}`,
  sourceContentHash: receipt.attachment.sha256,
  calculatedSha256: receipt.attachment.sha256,
};
function transport(value: unknown) {
  const fetcher = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify(value), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  );
  vi.stubGlobal("fetch", fetcher);
  return { api: createApiClient(), fetcher };
}
afterEach(() => vi.unstubAllGlobals());
describe("selected original incoming file boundary", () => {
  it("uses exact current local original and bound revision; strips provider extras", async () => {
    const { api, fetcher } = transport({
      ...manifest,
      providerId: "must not escape",
    });
    const result = await readIncomingFiles(api, original);
    expect(result).toEqual({
      ...manifest,
      original: {
        threadId: original.threadId,
        messageId: original.messageId,
        connectionId: original.connectionId,
        updatedAt: original.updatedAt,
      },
    });
    const url = String(fetcher.mock.calls[0]?.[0]);
    expect(url).toContain(
      `/engagement/mail/threads/${original.threadId}/messages/${original.messageId}/files?`,
    );
    expect(url).toContain(`clientId=${original.clientId}`);
    expect(url).toContain("updatedAt=2026-10-27T00%3A00%3A00.000Z");
  });
  it.each(["threadId", "messageId", "connectionId", "updatedAt"] as const)(
    "refuses mismatched %s in returned manifest",
    async (key) => {
      const { api } = transport({
        ...manifest,
        original: {
          ...original,
          [key]: key === "updatedAt" ? "2026-10-28T00:00:00.000Z" : id(90),
        },
      });
      await expect(readIncomingFiles(api, original)).rejects.toThrow();
    },
  );
  it("refuses duplicate file keys and an oversized advertised import", async () => {
    let t = transport({ ...manifest, files: [file, file] });
    await expect(readIncomingFiles(t.api, original)).rejects.toThrow();
    t = transport({
      ...manifest,
      files: [{ ...file, bytes: 3 * 1024 * 1024 + 1 }],
    });
    await expect(readIncomingFiles(t.api, original)).rejects.toThrow();
  });
  it("requires a canonical revision before transport", () => {
    const { api, fetcher } = transport(manifest);
    expect(() =>
      readIncomingFiles(api, { ...original, updatedAt: "" }),
    ).toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("renders explicit handoff as a different result, never a successful empty list", async () => {
    const selected = {
      threadId: original.threadId,
      messageId: original.messageId,
      updatedAt: original.updatedAt,
      clientId: original.clientId,
    };
    const { api } = transport({
      state: "mailbox_handoff",
      original: selected,
      reason: "inline_or_cid",
      notice: "Use your mailbox.",
    });
    expect(await readIncomingFiles(api, original)).toMatchObject({
      state: "mailbox_handoff",
      reason: "inline_or_cid",
    });
  });
  it("imports only the exact listed entry and sends no caller filename, URL or content", async () => {
    const { api, fetcher } = transport(receipt);
    expect(
      (await importIncomingFile(api, original, manifest, file)).state,
    ).toBe("imported");
    const options = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(JSON.parse(String(options.body))).toEqual({
      updatedAt: original.updatedAt,
      clientId: original.clientId,
      fileKey: file.fileKey,
      manifestSha256: manifest.manifestSha256,
    });
    expect(() =>
      importIncomingFile(api, original, manifest, {
        ...file,
        name: "changed.txt",
      }),
    ).toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(["fileKey", "manifestSha256"] as const)(
    "refuses mismatched imported %s receipt",
    async (key) => {
      const { api } = transport({ ...receipt, [key]: "e".repeat(64) });
      await expect(
        importIncomingFile(api, original, manifest, file),
      ).rejects.toThrow();
    },
  );
  it("keeps quarantine distinct from readiness and uses the existing attachment read", async () => {
    const { api, fetcher } = transport([stored]);
    const row = await readImportedFile(api, original, receipt);
    expect(row).toMatchObject({
      usable: false,
      downloadUrl: null,
      lifecycleStatus: "quarantined",
    });
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      `engagement/attachments?mailMessageId=${original.messageId}`,
    );
  });
  it.each([
    "sourceEntityId",
    "sourceContentHash",
    "calculatedSha256",
    "mailMessageId",
  ])(
    "refuses changed stored %s even if a signed URL is present",
    async (key) => {
      const { api } = transport([
        {
          ...stored,
          [key]: "changed",
          usable: true,
          downloadUrl: "https://example.test/file",
        },
      ]);
      await expect(readImportedFile(api, original, receipt)).rejects.toThrow(
        "no longer matches",
      );
    },
  );
  it("preserves current selected-message revision and tolerates old read fixtures without one", () => {
    const message = fullThread.messages[0];
    expect(
      mailBodySchema.parse({ ...message, updatedAt: original.updatedAt })
        .updatedAt,
    ).toBe(original.updatedAt);
    expect(mailBodySchema.parse(message).updatedAt).toBeUndefined();
  });
});
