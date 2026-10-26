import { describe, expect, it } from "vitest";
import { workspaceDocumentTemplateOperations as reads } from "../src/shared/capiro/operations/workspace-document-templates";
import {
  workspaceDocumentOperations,
  workspaceDraft,
} from "../src/shared/capiro/operations/workspace-documents";
import {
  adoptedBlueprint,
  blueprintPin,
  samePublishedVersion,
} from "../src/features/modules/workspace/document-templates/blueprint-adoption";
import {
  readWorkspaceRoute,
  workspaceHref,
} from "../src/features/modules/workspace/workspace-route";
import {
  adoptedDraft,
  blueprintId,
  catalog,
  publishedPin,
  versions,
} from "./document-blueprint-fixtures";

describe("document Blueprint consumer boundary", () => {
  it("registers only fixed GET catalog/detail/version/adjacent-compare reads", () => {
    expect(Object.values(reads).map((row) => row.method)).toEqual([
      "GET",
      "GET",
      "GET",
      "GET",
    ]);
    expect(
      reads["workspace.blueprints.list"].response.parse(catalog())[0]
        ?.versions[0]?.status,
    ).toBe("draft");
    expect(
      reads["workspace.blueprints.list"].response.safeParse({ items: [] })
        .success,
    ).toBe(false);
    expect(
      reads["workspace.blueprints.list"].request.safeParse({
        query: { clientId: blueprintId },
      }).success,
    ).toBe(false);
    expect(
      reads["workspace.blueprints.compare"].request.safeParse({
        params: { blueprintId },
        query: { fromVersionId: versions[0]!.id },
      }).success,
    ).toBe(false);
  });
  it("preserves the ordinary create owner and exact optional pin input", () => {
    const operation = workspaceDocumentOperations["workspace.draft.create"];
    expect(operation.path).toBe("/drafts");
    const input = {
      body: {
        docTitle: "Pinned document",
        clientId: null,
        blueprintPin: publishedPin(),
      },
    };
    expect(operation.request.parse(input)).toEqual(input);
    expect(
      operation.request.parse({ body: { product: "Newsletter" } }),
    ).toEqual({ body: { product: "Newsletter" } });
    expect(
      operation.request.safeParse({
        body: { ...input.body, templateId: blueprintId },
      }).success,
    ).toBe(false);
    expect(
      operation.request.safeParse({
        body: { blueprintPin: { ...publishedPin(), version: "2" } },
      }).success,
    ).toBe(false);
  });
  it("retains the stored pin through ordinary read receiving", () => {
    const row = workspaceDraft.parse(adoptedDraft());
    expect(row.config.documentAgent?.blueprintPin).toEqual(publishedPin());
    expect(adoptedBlueprint(row, versions[1]!, null)).toBe(true);
    expect(blueprintPin(versions[1]!)).toEqual(publishedPin());
  });
  it.each([
    { id: versions[0]!.id },
    { blueprintId: versions[0]!.id },
    { version: 99 },
    { definitionHash: "a".repeat(64) },
    { status: "retired" as const },
    { status: "draft" as const },
  ])(
    "refuses a preflight change without substituting another pin: %j",
    (change) => {
      expect(
        samePublishedVersion(versions[1]!, { ...versions[1]!, ...change }),
      ).toBe(false);
    },
  );
  it("checks both snapshots are published", () => {
    expect(samePublishedVersion(versions[1]!, versions[1]!)).toBe(true);
    expect(
      samePublishedVersion({ ...versions[1]!, status: "draft" }, versions[1]!),
    ).toBe(false);
  });
  it.each(["blueprintId", "versionId", "version", "definitionHash"] as const)(
    "requires saved %s to match the explicit choice",
    (field) => {
      const row = adoptedDraft();
      const pin = {
        ...row.config.documentAgent.blueprintPin,
        [field]: field === "version" ? 99 : "unexpected",
      };
      expect(
        adoptedBlueprint(
          {
            ...row,
            config: { ...row.config, documentAgent: { blueprintPin: pin } },
          },
          versions[1]!,
          null,
        ),
      ).toBe(false);
    },
  );
  it("refuses missing pins and foreign client/prospect aggregates", () => {
    const row = adoptedDraft();
    expect(adoptedBlueprint({ ...row, config: {} }, versions[1]!, null)).toBe(
      false,
    );
    expect(adoptedBlueprint(row, versions[1]!, blueprintId)).toBe(false);
    expect(
      adoptedBlueprint(
        { ...row, config: { ...row.config, clientId: blueprintId } },
        versions[1]!,
        null,
      ),
    ).toBe(false);
    expect(
      adoptedBlueprint({ ...row, prospectId: blueprintId }, versions[1]!, null),
    ).toBe(false);
  });
  it("routes the distinct document catalog while preserving Outreach", () => {
    const href = workspaceHref({
      kind: "view",
      view: "document-templates",
      clientId: blueprintId,
    });
    expect(readWorkspaceRoute(new URLSearchParams(href.split("?")[1]))).toEqual(
      { kind: "view", view: "document-templates", clientId: blueprintId },
    );
    expect(workspaceHref({ kind: "view", view: "templates" })).toBe(
      "/modules/workspace?view=templates",
    );
    expect(
      readWorkspaceRoute(
        new URLSearchParams(`view=document-templates&draftId=${blueprintId}`),
      ),
    ).toEqual({ kind: "invalid" });
  });
});
