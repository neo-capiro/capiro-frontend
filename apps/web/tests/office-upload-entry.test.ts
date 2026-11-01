import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { MeriAttachmentPicker } from "../src/features/meri/uploads/MeriAttachmentPicker";
import type { ComposerAttachments } from "../src/features/meri/uploads/attachment-slot";
import type { UploadItem } from "../src/shared/meri-uploads/upload-controller";
import { createUploadAccess } from "../src/shared/meri-uploads/access";
import { SelectedTabAccess } from "../src/shared/meri-selected-tab/access";
import { session, ids } from "./meri-document-public-fixtures";

function render(
  change: Partial<UploadItem> = {},
  receipt: Partial<NonNullable<UploadItem["receipt"]>> = {},
) {
  const queries = new QueryClient(),
    lifetime = new AbortController();
  const uploads = createUploadAccess({
    credential: session.credential,
    context: session.context,
    lifetime: lifetime.signal,
    isCurrent: () => true,
  });
  const access = new SelectedTabAccess({
    context: session.context,
    uploads,
    lifetime: lifetime.signal,
    expiresAtMs: Date.now() + 60_000,
    isCurrent: () => true,
  });
  const item: UploadItem = {
    requestId: ids.run,
    uploadId: ids.other,
    filename: "Original.pptx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    bytes: 10,
    sha256: "a".repeat(64),
    state: "stored",
    receipt: {
      uploadId: ids.other,
      bytes: 10,
      sha256: "a".repeat(64),
      storageStatus: "stored",
      scanStatus: "clean",
      scanReason: null,
      originalBytesAvailable: true,
      extraction: { status: "unavailable", limitations: [] },
      ...receipt,
    },
    ...change,
  };
  const noop = () => undefined;
  const slot: ComposerAttachments = {
    selectedTab: { context: session.context, access },
    available: true,
    items: [item],
    incoming: [],
    busy: false,
    sendArgument: [],
    onPick: noop,
    onCheck: noop,
    onRemove: noop,
    onCancel: noop,
    onToggleIncoming: noop,
    limit: 8,
  };
  try {
    return renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: queries },
        createElement(MeriAttachmentPicker, { slot, assetSet: "home" }),
      ),
    );
  } finally {
    lifetime.abort();
    access.dispose();
    uploads.dispose();
    queries.clear();
  }
}
describe("upload row Office entry", () => {
  it("offers the clean original even when text extraction is unavailable", () => {
    const html = render();
    expect(html).toContain("Open in editor");
    expect(html).toContain("EXTRACTION_UNAVAILABLE");
  });
  it.each(["docx", "xlsx", "pptx"])(
    "offers %s retained originals",
    (format) => {
      expect(render({ filename: "Original." + format })).toContain(
        "Open in editor",
      );
    },
  );
  it("does not offer removed, infected, unavailable or non-Office originals", () => {
    expect(render({ state: "removed" })).not.toContain("Open in editor");
    expect(render({}, { scanStatus: "infected" })).not.toContain(
      "Open in editor",
    );
    expect(render({}, { originalBytesAvailable: false })).not.toContain(
      "Open in editor",
    );
    expect(render({ filename: "Original.pdf" })).not.toContain(
      "Open in editor",
    );
  });
});
