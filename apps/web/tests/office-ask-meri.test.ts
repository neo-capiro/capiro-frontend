import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OfficeAskMeri } from "../src/features/meri/office/OfficeAskMeri";
import {
  OfficeEditing,
  OfficeOpenVersionButton,
  isOfficeTarget,
} from "../src/features/meri/office/OfficeEditing";
import { conversationId, viewer } from "./office-edit-fixture";

const context = {
  tenantId: viewer.tenantId,
  actorId: viewer.actorId,
  conversationId,
  selectedClientId: null,
};
const target = {
  versionId: "00000000-0000-4000-8000-00000000000c",
  filename: "Quarterly report.docx",
  mimeType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  binding: { conversationId },
  scopes: [{ kind: "private-user", resourceId: viewer.actorId }],
  note: "New version of Quarterly report.docx, saved from Meri's edit",
};
const inspect = async () => ({
  artifactId: "a",
  versionId: "b",
  objectSha256: "c".repeat(64),
  filename: "Quarterly report.docx",
});

describe("Ask Meri entry", () => {
  it("offers the entry with the Save versus Publish sentence", () => {
    const html = renderToStaticMarkup(
      createElement(OfficeAskMeri, { context, inspect }),
    );
    expect(html).toContain("Ask Meri about this document");
    expect(html).toContain(
      "Save keeps a private draft, Publish makes the file version Meri can read",
    );
  });
  it("withholds the entry, with the reason, while a private edit is unsaved or unpublished", () => {
    const html = renderToStaticMarkup(
      createElement(OfficeAskMeri, {
        context,
        inspect,
        blocked:
          "Publish your saved private draft first; Meri reads file versions, not private drafts.",
      }),
    );
    expect(html).not.toContain("Ask Meri about this document");
    expect(html).toContain("Publish your saved private draft first");
  });
});

describe("reopening an applied version", () => {
  it("shows nothing when Office editing is not enabled or no account is verified", () => {
    expect(
      renderToStaticMarkup(
        createElement(OfficeOpenVersionButton, { version: target }),
      ),
    ).toBe("");
    for (const props of [
      { enabled: false, account: viewer },
      { enabled: true, account: null },
    ])
      expect(
        renderToStaticMarkup(
          createElement(
            OfficeEditing,
            props as ComponentProps<typeof OfficeEditing>,
            createElement(OfficeOpenVersionButton, { version: target }),
          ),
        ),
      ).toBe("");
  });
  it("offers the editor for an Office version only, inside an enabled editing host", () => {
    const html = renderToStaticMarkup(
      createElement(
        OfficeEditing,
        { enabled: true, account: viewer } as ComponentProps<
          typeof OfficeEditing
        >,
        createElement(OfficeOpenVersionButton, { version: target }),
      ),
    );
    expect(html).toContain("Open the new version in the editor");
    expect(isOfficeTarget({ ...target, mimeType: "text/plain" })).toBe(false);
    expect(
      renderToStaticMarkup(
        createElement(
          OfficeEditing,
          { enabled: true, account: viewer } as ComponentProps<
            typeof OfficeEditing
          >,
          createElement(OfficeOpenVersionButton, {
            version: { ...target, mimeType: "text/plain" },
          }),
        ),
      ),
    ).toBe("");
  });
});
