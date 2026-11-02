import { expect, it } from "vitest";
import type { ArtifactPreview } from "../src/shared/meri-documents/artifact-access";
import {
  artifactCardSummary,
  artifactDetails,
  artifactOutcome,
  offersReadAgain,
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

it("a Download before the mount read answers leaves the card able to read its details, without claiming an inspection", () => {
  // Mounted, the read in flight: nothing to offer yet.
  expect(artifactDetails(null, { kind: "idle" })).toBe("reading");
  expect(offersReadAgain(null, { kind: "idle" })).toBe(false);
  // Download cancels that read; while it runs nothing is offered and the card does not claim to be reading.
  const downloading = { kind: "working", action: "download" } as const;
  expect(offersReadAgain(null, downloading)).toBe(false);
  expect(artifactDetails(null, downloading)).toBe("unread");
  expect(artifactCardSummary(null, "unread").description).toBe(
    "The file details have not been read.",
  );
  // After the download, succeeded or failed, the card offers "Read details again".
  const downloaded = {
    kind: "downloaded",
    filename: "Note.docx",
    inspected: false,
  } as const;
  const failed = {
    kind: "failed",
    action: "download",
    code: "ARTIFACT_UNAVAILABLE",
  } as const;
  for (const status of [downloaded, failed]) {
    expect(artifactDetails(null, status)).toBe("unread");
    expect(offersReadAgain(null, status)).toBe(true);
  }
  expect(artifactOutcome(downloaded)).toBe("Downloaded Note.docx.");
  expect(artifactOutcome({ ...downloaded, inspected: true })).toBe(
    "Downloaded Note.docx; its bytes matched the inspected version.",
  );
  // Once the details are read nothing more is offered.
  expect(offersReadAgain(generated(), downloaded)).toBe(false);
});

it("a refused read says so instead of still reading", () => {
  const refused = {
    kind: "failed",
    action: "preview",
    code: "ARTIFACT_ACCESS_DENIED",
  } as const;
  expect(artifactDetails(null, refused)).toBe("refused");
  expect(offersReadAgain(null, refused)).toBe(true);
  expect(artifactCardSummary(null, "refused").description).toBe(
    "The file details could not be read.",
  );
  expect(artifactCardSummary(null, "refused").description).not.toContain(
    "Reading",
  );
  expect(artifactDetails(null, { kind: "working", action: "preview" })).toBe(
    "reading",
  );
});
