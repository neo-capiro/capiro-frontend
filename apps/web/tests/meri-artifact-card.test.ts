import { expect, it } from "vitest";
import type { ArtifactPreview } from "../src/shared/meri-documents/artifact-access";
import {
  artifactCardSummary,
  formatBytes,
  mimeLabel,
  officeTargetFor,
  versionLabel,
} from "../src/features/meri/conversation/artifact-card";
import { officeWorkspaceHref } from "../src/features/meri/office/OfficeWorkspaceLink";
import { ids } from "./meri-document-public-fixtures";

const generated = (patch: Partial<ArtifactPreview> = {}): ArtifactPreview =>
  ({
    kind: "generated",
    versionId: ids.version,
    artifactId: ids.artifact,
    parentVersionId: null,
    filename: "Acceptance Test Kickoff Note.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: 37_214,
    createdAt: "2026-11-02T05:40:00.000Z",
    objectSha256: "a".repeat(64),
    generationStatus: "draft",
    previewStatus: "pending",
    inspection: {} as ArtifactPreview extends { inspection: infer I }
      ? I
      : never,
    ...patch,
  }) as ArtifactPreview;

it("names the file, its kind, size and when its version was created; before that it is a generated file being read", () => {
  const created = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date("2026-11-02T05:40:00.000Z"));
  expect(artifactCardSummary(null)).toEqual({
    title: "Generated file",
    description: "Reading the file details…",
  });
  expect(artifactCardSummary(generated())).toEqual({
    title: "Acceptance Test Kickoff Note.docx",
    description: `Word document · 36.3 KB · Original, ${created}`,
  });
  expect(
    artifactCardSummary(
      generated({
        filename: "Budget.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        bytes: 900,
        parentVersionId: ids.version,
      }),
    ).description,
  ).toBe(`Excel workbook · 900 B · Revision, ${created}`);
  expect(
    artifactCardSummary(
      generated({
        filename: "Report.pdf",
        mimeType: "application/pdf",
        bytes: 2_400_000,
      }),
    ).description,
  ).toBe(`PDF · 2.3 MB · Original, ${created}`);
  expect(
    versionLabel({
      kind: "native-file",
      versionId: ids.version,
      filename: "notes.txt",
      mimeType: "text/plain",
      bytes: 12,
      createdAt: "2026-11-02T05:40:00.000Z",
      path: "notes.txt",
      currentBytesVerified: true,
    }),
  ).toBe(`Captured, ${created}`);
  // No version id fragment is ever shown.
  expect(artifactCardSummary(generated()).description).not.toContain(
    ids.version.slice(0, 8),
  );
  expect(mimeLabel("application/x-unknown")).toBe("application/x-unknown");
  expect(formatBytes(1024)).toBe("1.0 KB");
});

it("offers the Workspace route for a generated Office version in General and in a client conversation", () => {
  const general = { conversationId: ids.conversation, clientId: null };
  const target = officeTargetFor(general, ids.version, generated());
  expect(target).toEqual({
    versionId: ids.version,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    binding: { conversationId: ids.conversation },
    scopes: [],
  });
  const href = officeWorkspaceHref(target!);
  expect(href.startsWith("/modules/workspace?")).toBe(true);
  expect(href).toContain(`officeVersionId=${ids.version}`);
  expect(href).toContain(`officeConversationId=${ids.conversation}`);
  expect(href).not.toContain("clientId=");
  const client = { conversationId: ids.conversation, clientId: ids.client };
  expect(officeTargetFor(client, ids.version, generated())?.scopes).toEqual([
    { kind: "client", resourceId: ids.client },
  ]);
  expect(
    officeWorkspaceHref(officeTargetFor(client, ids.version, generated())!),
  ).toContain(`clientId=${ids.client}`);
});

it("offers no Workspace route before the details are read or for a captured workspace file", () => {
  const scope = { conversationId: ids.conversation, clientId: null };
  expect(officeTargetFor(scope, ids.version, null)).toBeNull();
  expect(
    officeTargetFor(scope, ids.version, {
      kind: "native-file",
      versionId: ids.version,
      filename: "notes.txt",
      mimeType: "text/plain",
      bytes: 12,
      createdAt: "2026-11-02T05:40:00.000Z",
      path: "notes.txt",
      currentBytesVerified: true,
    }),
  ).toBeNull();
});
