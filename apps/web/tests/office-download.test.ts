import { describe, expect, it, vi } from "vitest";
import { createOfficeBrowserPort } from "../src/shared/meri-office/file-access";
import {
  accessInspection,
  accessBinary,
} from "./meri-document-access-fixtures";
import { documentBytes } from "./meri-document-public-fixtures";
import { officeCredential } from "./office-wire-fixture";
function fixture(format: "docx" | "xlsx" | "pptx") {
  const receipt = accessInspection(format);
  const document =
    format === "xlsx"
      ? {
          ...receipt,
          inspection: {
            ...receipt.inspection,
            details: {
              sheets: ["Data"],
              formulas: 1,
              formulaCache:
                "editor-provided/unverified; recalculation required",
            },
          },
        }
      : receipt;
  const responses = [
    Response.json({ schema: "meri.office-application/1", document }),
    Response.json({
      versionId: receipt.version.versionId,
      token: `opaque.${"a".repeat(43)}`,
      expiresAtMs: Date.now() + 60_000,
    }),
    accessBinary(receipt),
  ];
  const lifetime = new AbortController(),
    lost = vi.fn();
  let current = true;
  const fetcher = vi.fn<typeof fetch>(async () => {
    const response = responses.shift();
    if (!response) throw Error("No response");
    return response;
  });
  const port = createOfficeBrowserPort({
    credential: officeCredential,
    lifetime: lifetime.signal,
    isCurrent: () => current,
    onAccessLost: lost,
    fetcher,
  });
  return {
    receipt,
    port,
    responses,
    fetcher,
    lifetime,
    lost,
    retire: () => {
      current = false;
    },
  };
}
describe("Office immutable download", () => {
  it.each(["docx", "xlsx", "pptx"] as const)(
    "verifies %s through the Office receiver and existing link owner",
    async (format) => {
      const f = fixture(format);
      const result = await f.port.download(
        f.receipt.version.versionId,
        new AbortController().signal,
      );
      expect(result.bytes).toEqual(documentBytes);
      expect(result.filename).toBe(`Synthetic.${format}`);
      expect(f.fetcher.mock.calls.map((call) => call[0])).toEqual([
        "/api/meri/office/inspect",
        "/api/documents/links/issue",
        "/api/documents/links/redeem",
      ]);
      expect(f.fetcher.mock.calls[2]![1]?.body).toBe(
        JSON.stringify({ token: `opaque.${"a".repeat(43)}` }),
      );
      expect(f.port.pending()).toBe(false);
      f.port.dispose();
    },
  );
  it("changed bytes and access loss never produce a downloadable result", async () => {
    const f = fixture("xlsx");
    f.responses[2] = accessBinary(
      f.receipt,
      new TextEncoder().encode("different bytes"),
    );
    await expect(
      f.port.download(
        f.receipt.version.versionId,
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    f.port.dispose();
    const denied = fixture("docx");
    denied.responses[1] = Response.json(
      { error: { code: "ACCESS_DENIED" } },
      { status: 403 },
    );
    await expect(
      denied.port.download(
        denied.receipt.version.versionId,
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    expect(denied.lost).toHaveBeenCalledTimes(1);
    expect(denied.fetcher).toHaveBeenCalledTimes(2);
    denied.port.dispose();
  });
  it("scope retirement during link redemption suppresses the bytes", async () => {
    const f = fixture("pptx"),
      original = f.fetcher.getMockImplementation()!;
    f.fetcher.mockImplementation(async (...args) => {
      const response = await original(...args);
      if (String(args[0]).endsWith("redeem")) f.retire();
      return response;
    });
    await expect(
      f.port.download(
        f.receipt.version.versionId,
        new AbortController().signal,
      ),
    ).rejects.toThrow("context changed");
    f.port.dispose();
  });
});
