import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { MeriAttachmentPicker } from "../src/features/meri/uploads/MeriAttachmentPicker";
import type { ComposerAttachments } from "../src/features/meri/uploads/attachment-slot";
import type { UploadItem } from "../src/shared/meri-uploads/upload-controller";
import { createUploadAccess } from "../src/shared/meri-uploads/access";
import { SelectedTabAccess } from "../src/shared/meri-selected-tab/access";
import { session, ids } from "./meri-document-public-fixtures";

function render(
  change: Partial<UploadItem> = {},
  receipt: Partial<NonNullable<UploadItem["receipt"]>> = {},
  slotChange: Partial<ComposerAttachments> = {},
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
    checking: false,
    overdue: () => false,
    sendArgument: [],
    onPick: noop,
    onCheck: noop,
    onRemove: noop,
    onCancel: noop,
    onDismiss: noop,
    onToggleIncoming: noop,
    limit: 8,
    ...slotChange,
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
    expect(html).toContain("Open in Workspace");
    // The chip says it plainly; the service's own code travels in the tooltip, never as the state.
    expect(html).toContain("Could not read this file");
    expect(html).toContain("text: unavailable");
    expect(html).not.toContain("EXTRACTION_UNAVAILABLE");
  });
  it.each(["docx", "xlsx", "pptx"])(
    "offers %s retained originals",
    (format) => {
      expect(render({ filename: "Original." + format })).toContain(
        "Open in Workspace",
      );
    },
  );
  it("does not offer removed, infected, unavailable or non-Office originals", () => {
    expect(render({ state: "removed" })).not.toContain("Open in Workspace");
    expect(render({}, { scanStatus: "infected" })).not.toContain(
      "Open in Workspace",
    );
    expect(render({}, { originalBytesAvailable: false })).not.toContain(
      "Open in Workspace",
    );
    expect(render({ filename: "Original.pdf" })).not.toContain(
      "Open in Workspace",
    );
  });
});

describe("attachment row controls", () => {
  const stillChecking: Partial<NonNullable<UploadItem["receipt"]>> = {
    scanStatus: "pending",
    originalBytesAvailable: false,
    extraction: { status: "pending", limitations: [] },
  };
  it("offers Check again once a stored row's check has outrun the bounded wait", () => {
    expect(render({}, stillChecking)).not.toContain("Check again");
    const html = render({}, stillChecking, { overdue: () => true });
    expect(html).toContain("Still checking — send without it or remove it");
    expect(html).toContain("Check again");
    expect(html).not.toContain("Check status<");
  });
  it("names a file this conversation already holds without any part of its upload id", () => {
    const html = render(
      {},
      {},
      {
        incoming: [
          { uploadId: ids.other, sha256: "b".repeat(64), selected: false },
        ],
      },
    );
    expect(html).toContain("File 1");
    expect(html).toContain("Already in this conversation");
    expect(html).not.toContain(ids.other.slice(0, 8));
  });
});
