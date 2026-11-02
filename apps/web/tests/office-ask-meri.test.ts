import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OfficeAskMeri } from "../src/features/meri/office/OfficeAskMeri";
import {
  OfficeWorkspaceLink,
  OfficeWorkspaceLinks,
  isOfficeTarget,
  officeWorkspaceHref,
} from "../src/features/meri/office/OfficeWorkspaceLink";
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
          "Publish the saved draft first; Meri reads revisions, not private drafts.",
      }),
    );
    expect(html).not.toContain("Ask Meri about this document");
    expect(html).toContain("Publish the saved draft first");
  });
});

describe("opening an Office version in the Workspace", () => {
  const link = (version: typeof target, enabled: boolean) =>
    renderToStaticMarkup(
      createElement(
        OfficeWorkspaceLinks,
        { enabled },
        createElement(OfficeWorkspaceLink, { version }),
      ),
    );
  it("shows nothing when Office editing is not enabled for the deployment", () => {
    expect(
      renderToStaticMarkup(
        createElement(OfficeWorkspaceLink, { version: target }),
      ),
    ).toBe("");
    expect(link(target, false)).toBe("");
  });
  it("links an Office version, and only an Office version, to the Workspace office route in its scope", () => {
    const html = link(target, true);
    expect(html).toContain("Open in Workspace");
    expect(html).toContain(
      `href="/modules/workspace?officeVersionId=${target.versionId}&amp;officeConversationId=${conversationId}"`,
    );
    expect(isOfficeTarget({ ...target, mimeType: "text/plain" })).toBe(false);
    expect(link({ ...target, mimeType: "text/plain" }, true)).toBe("");
    const clientId = "00000000-0000-4000-8000-0000000000c1";
    expect(
      officeWorkspaceHref({
        ...target,
        scopes: [{ kind: "client", resourceId: clientId }],
      }),
    ).toBe(
      `/modules/workspace?clientId=${clientId}&officeVersionId=${target.versionId}&officeConversationId=${conversationId}`,
    );
  });
});
